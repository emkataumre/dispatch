# Database Schema Reference

Generated from migrations `001` – `026`.

---

## Enums

### `poi_category`
`food_drink` | `nightlife` | `culture` | `study_spots` | `hidden_gems`

### `visibility_type`
`friends` | `community`

### `friendship_status`  *(migration 019)*
See `friendships.status` — stored as `text` with a `CHECK` constraint (`pending` | `accepted`).

---

## Tables

### `semesters`
Global academic-semester calendar. Every user and check-in is associated with one semester.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `start_date` | `date` | NOT NULL |
| `end_date` | `date` | NOT NULL |
| `created_at` | `timestamptz` | DEFAULT `now()` |

**RLS**: `SELECT` allowed for all authenticated users.

---

### `profiles`
One row per auth user (created automatically by `handle_new_user` trigger on signup).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, FK → `auth.users(id)` CASCADE |
| `display_name` | `text` | NOT NULL, min length 2 (migration 014) |
| `avatar_url` | `text` | — |
| `semester_id` | `uuid` | FK → `semesters(id)` |
| `created_at` | `timestamptz` | DEFAULT `now()` |

**RLS**: all authenticated users can `SELECT`; users can `INSERT` / `UPDATE` their own row.

---

### `pois`
Points of interest. IDs are deterministic UUIDv5 values (stable across re-registrations).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK (explicit — no default) |
| `name` | `text` | NOT NULL |
| `description` | `text` | NOT NULL |
| `category` | `poi_category` | NOT NULL |
| `lat` | `double precision` | NOT NULL |
| `lng` | `double precision` | NOT NULL |
| `created_by` | `uuid` | FK → `profiles(id)` SET NULL, DEFAULT system account |
| `created_at` | `timestamptz` | DEFAULT `now()` |

**RLS**: `SELECT` for all authenticated users; `INSERT` only for the owning user.

---

### `poi_ratings`
One rating per (user, POI) pair. No `UPDATE` policy — change a rating by deleting and re-inserting.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `poi_id` | `uuid` | NOT NULL, FK → `pois(id)` CASCADE |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` CASCADE |
| `rating` | `smallint` | NOT NULL, CHECK 1–5 |
| `comment` | `text` | — |
| `created_at` | `timestamptz` | DEFAULT `now()` |

**Unique**: `(user_id, poi_id)`.

---

### `check_ins`
Immutable append-only log of passive geofence check-ins. No `UPDATE` or `DELETE` policies.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` CASCADE |
| `poi_id` | `uuid` | NOT NULL, FK → `pois(id)` |
| `checked_in_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `semester_id` | `uuid` | NOT NULL, FK → `semesters(id)` |

**Exclusion constraint** (`check_ins_no_rapid_duplicates`): prevents duplicate check-ins at the same (user, POI) within a 5-minute window using `btree_gist`.

**RLS**: users can `SELECT` / `INSERT` their own rows only.

---

### `live_presence`
Active "I'm at X" broadcasts. Expires 2 hours after creation; dismissed by the user or by expiry.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` CASCADE |
| `poi_id` | `uuid` | NOT NULL, FK → `pois(id)` CASCADE |
| `message` | `text` | CHECK `char_length <= 140` |
| `visible_to` | `visibility_type` | NOT NULL, DEFAULT `'friends'` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `dismissed_at` | `timestamptz` | — |
| `expires_at` | `timestamptz` | NOT NULL, DEFAULT `now() + 2h` (set by trigger) |

**Indexes**: partial indexes on `(user_id)` and `(poi_id)` where `dismissed_at IS NULL`; partial index on `expires_at` where `dismissed_at IS NULL`.

**RLS**: `SELECT` for audience (community = all authenticated; friends = friendship required; always visible to own broadcaster); `INSERT` / `UPDATE` / `DELETE` for own rows.

---

### `presence_joins`
Records a user's intent to join a live presence broadcast. `confirmed` is set to `true` by the broadcaster upon geofence arrival detection.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `presence_id` | `uuid` | NOT NULL, FK → `live_presence(id)` CASCADE |
| `joiner_user_id` | `uuid` | NOT NULL, FK → `profiles(id)` CASCADE |
| `joined_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `confirmed` | `boolean` | NOT NULL, DEFAULT `false` |

**Unique**: `(presence_id, joiner_user_id)`.

**Realtime**: enabled on this table.

**RLS**: broadcaster and joiner can `SELECT`; joiner can `INSERT`; broadcaster can `UPDATE` (confirm arrival); joiner can `DELETE`.

---

### `friendships`
Directed friendship requests; normalised to an undirected pair via `LEAST/GREATEST` unique index.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `requester_id` | `uuid` | NOT NULL, FK → `profiles(id)` CASCADE |
| `addressee_id` | `uuid` | NOT NULL, FK → `profiles(id)` CASCADE |
| `status` | `text` | NOT NULL, CHECK `pending` \| `accepted` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

**Check**: `requester_id != addressee_id`.  
**Unique index**: `(LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))` — prevents both A→B and B→A existing simultaneously.

**Realtime**: enabled on this table.

**RLS**: each user sees only friendships they are party to; requester inserts (`status = 'pending'`); addressee accepts (`pending → accepted`); either party can delete.

---

## Views

### `poi_avg_ratings`
Materialized-style view aggregating average rating and count per POI.

```sql
SELECT poi_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
FROM public.poi_ratings
GROUP BY poi_id;
```

---

## Key triggers & functions

| Name | Table | Purpose |
|------|-------|---------|
| `handle_new_user` | `auth.users` (AFTER INSERT) | Auto-creates `profiles` row and assigns active semester |
| `trg_live_presence_expires_at` | `live_presence` (BEFORE INSERT) | Derives `expires_at = created_at + 2h` |
| `checkin_window(ts)` | — | `IMMUTABLE` helper returning a 5-minute `tstzrange` for the exclusion constraint |
