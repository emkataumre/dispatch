-- Phase 5 remainder: Broadcast lifecycle — server-side 2h expiry.
--
-- Postgres rejects GENERATED ALWAYS AS (created_at + interval '2 hours') STORED
-- because created_at has DEFAULT now() which is volatile. Instead we use:
--   • A plain column with DEFAULT now() + interval '2 hours' for new rows.
--   • A BEFORE INSERT trigger that forces expires_at = NEW.created_at + 2h,
--     so the value is always derived from the actual created_at and cannot drift
--     even if an explicit created_at is supplied on insert.
--   • A one-time UPDATE to backfill any existing rows (which have expires_at = NULL).
--
-- dismissed_at IS NULL is intentionally kept OUT of the RLS SELECT policy —
-- including it would break Realtime dismissal-event propagation to other
-- subscribers (a dismissed row would fail RLS SELECT, Realtime would silently
-- drop the UPDATE event, and other users' maps would keep showing the bubble
-- until their next app-resume refetch).

-- 1. Add the column (nullable initially so backfill can run, then set NOT NULL).
ALTER TABLE live_presence
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Backfill existing rows.
UPDATE live_presence
  SET expires_at = created_at + interval '2 hours'
  WHERE expires_at IS NULL;

-- 3. Make it non-nullable now that all rows have a value.
ALTER TABLE live_presence
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT now() + interval '2 hours';

-- 4. Trigger function: always derive expires_at from the actual created_at.
CREATE OR REPLACE FUNCTION set_live_presence_expires_at()
  RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  NEW.expires_at := NEW.created_at + interval '2 hours';
  RETURN NEW;
END;
$$;

-- 5. Attach trigger (BEFORE INSERT so the derived value is stored).
DROP TRIGGER IF EXISTS trg_live_presence_expires_at ON live_presence;
CREATE TRIGGER trg_live_presence_expires_at
  BEFORE INSERT ON live_presence
  FOR EACH ROW EXECUTE FUNCTION set_live_presence_expires_at();

-- 6. Partial index for active-broadcast queries on expires_at.
CREATE INDEX IF NOT EXISTS idx_live_presence_expires_at_active
  ON live_presence (expires_at)
  WHERE dismissed_at IS NULL;

-- 7. Replace SELECT policy to add expires_at > now() conjunction.
DROP POLICY IF EXISTS "Presence visible by audience" ON live_presence;

CREATE POLICY "Presence visible by audience"
  ON live_presence FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND (
      visible_to = 'community'
      OR auth.uid() = user_id
      OR (
        visible_to = 'friends'
        AND EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
            AND (
              (requester_id = auth.uid() AND addressee_id = live_presence.user_id)
              OR (addressee_id = auth.uid() AND requester_id = live_presence.user_id)
            )
        )
      )
    )
  );
