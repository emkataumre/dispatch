"""
geocode_pois.py

Reads POI id/name pairs from the seed SQL migration, then uses a Playwright
browser to search each POI on Google Maps and extract the coordinates from the
resulting URL.

Usage (from project root):
    python scripts/geocode_pois.py

Output:
    scripts/geocode_output.sql  — UPDATE statements for every successfully
                                  geocoded POI.
"""

import re
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
SEED_SQL = PROJECT_ROOT / "supabase" / "migrations" / "004_poi_seed_data.sql"
OUTPUT_SQL = SCRIPT_DIR / "geocode_output.sql"

# ---------------------------------------------------------------------------
# How long to wait for Google Maps to settle on a result (ms)
# ---------------------------------------------------------------------------
URL_SETTLE_TIMEOUT_MS = 15_000

# Polite delay between searches to avoid tripping rate limits (seconds)
BETWEEN_SEARCH_DELAY_S = 2.0


# ---------------------------------------------------------------------------
# SQL parser
# ---------------------------------------------------------------------------

def parse_pois(sql_path: Path) -> list[dict]:
    """
    Parse INSERT rows from the seed SQL file and return a list of
    {'id': str, 'name': str} dicts.

    The rows look like:
        (
          '<uuid>',
          'Some Name',
          'Description with escaped ''quotes''',
          'category', lat, lng
        ),

    Strategy:
      1. Strip SQL comments.
      2. Find the VALUES block.
      3. Use a simple state machine to extract each top-level parenthesised
         group (handling nested parens only if they appear inside string
         literals — they don't in this file, but we handle it anyway).
      4. From each group, extract the first two single-quoted string values
         (id and name).  We unescape SQL '' → ' in the name.
    """
    raw = sql_path.read_text(encoding="utf-8")

    # Remove single-line comments so they don't confuse the parser.
    raw = re.sub(r"--[^\n]*", "", raw)

    # Find the start of VALUES (everything after the keyword).
    values_match = re.search(r"\bVALUES\b", raw, re.IGNORECASE)
    if not values_match:
        raise ValueError(f"No VALUES clause found in {sql_path}")

    payload = raw[values_match.end():]

    # Walk character-by-character to pull out each top-level (...) group.
    rows_raw: list[str] = []
    depth = 0
    in_string = False
    current: list[str] = []

    i = 0
    while i < len(payload):
        ch = payload[i]

        if in_string:
            current.append(ch)
            if ch == "'":
                # Peek ahead: SQL escapes a literal apostrophe as ''
                if i + 1 < len(payload) and payload[i + 1] == "'":
                    current.append("'")
                    i += 2
                    continue
                else:
                    in_string = False
        else:
            if ch == "'":
                in_string = True
                current.append(ch)
            elif ch == "(":
                depth += 1
                if depth == 1:
                    # Start of a new row — reset accumulator.
                    current = ["("]
                else:
                    current.append(ch)
            elif ch == ")":
                depth -= 1
                if depth == 0 and current:
                    current.append(")")
                    rows_raw.append("".join(current))
                    current = []
                else:
                    current.append(ch)
            else:
                if depth >= 1:
                    current.append(ch)

        i += 1

    # From each raw row string extract the first two quoted values (id, name).
    pois: list[dict] = []
    for row in rows_raw:
        # Match every SQL-quoted string: '...' where '' inside is an escaped quote.
        quoted_values = re.findall(r"'((?:[^']|'')*)'", row)
        if len(quoted_values) < 2:
            print(f"WARNING: Could not parse id/name from row snippet: {row[:80]!r}",
                  file=sys.stderr)
            continue
        poi_id = quoted_values[0]
        poi_name = quoted_values[1].replace("''", "'")  # unescape SQL apostrophes
        pois.append({"id": poi_id, "name": poi_name})

    return pois


# ---------------------------------------------------------------------------
# Google Maps coordinate extraction
# ---------------------------------------------------------------------------

# Google Maps URL pattern: /@<lat>,<lng>,<zoom>z
GMAPS_COORD_RE = re.compile(r"/@(-?\d+\.\d+),(-?\d+\.\d+),")


def extract_coords_from_url(url: str) -> tuple[float, float] | None:
    """Return (lat, lng) if the URL contains Google Maps coordinates, else None."""
    m = GMAPS_COORD_RE.search(url)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None


def handle_consent(page) -> None:
    """
    Accept Google's consent wall if we've been redirected to consent.google.com.
    This is a separate domain — the original consent check was looking at the
    wrong page.
    """
    if "consent.google.com" not in page.url:
        return
    try:
        btn = page.locator("button").filter(
            has_text=re.compile(r"Accept all|Accepter tout|Accepter|Godkend alle", re.IGNORECASE)
        ).first
        btn.click(timeout=5_000)
        # Wait until we're back on google.com/maps
        page.wait_for_url(re.compile(r"google\.com/maps"), timeout=15_000)
    except Exception as e:
        print(f"  WARNING: Could not dismiss consent dialog: {e}", file=sys.stderr)


def geocode_poi(page, name: str) -> tuple[float, float] | str | None:
    """
    Search for '<name> Copenhagen' on Google Maps and extract (lat, lng).

    Runs a single polling loop for up to 30 seconds that checks two sources
    on every tick:
      1. The current page URL (Maps auto-redirects single results to a place URL)
      2. Any /maps/place/ hrefs rendered in the sidebar DOM (multi-result pages)

    Returns None only if neither source yields coordinates within the timeout.
    """
    search_url = (
        "https://www.google.com/maps/search/"
        + name.replace(" ", "+")
        + "+Copenhagen"
    )

    try:
        page.goto(search_url, wait_until="domcontentloaded", timeout=30_000)
    except PlaywrightTimeoutError:
        print(f"  WARNING: Page load timed out for '{name}'", file=sys.stderr)
        return None

    handle_consent(page)

    deadline = time.monotonic() + 30

    while time.monotonic() < deadline:
        # 1. Check the current URL — auto-redirect lands here for single results
        url = page.url
        if "/maps/place/" in url:
            coords = extract_coords_from_url(url)
            if coords:
                return coords

        # 2. Check place-card hrefs in the DOM — works for multi-result pages
        try:
            hrefs = page.evaluate(
                "() => Array.from("
                "  document.querySelectorAll('[href*=\"/maps/place/\"]')"
                ").map(a => a.href)"
            )
            for href in hrefs:
                c = extract_coords_from_url(href)
                if c:
                    return c
        except Exception:
            pass  # page still loading — try again next tick

        time.sleep(0.5)

    # Timed out — if still on a search URL it's a list result, flag for manual review
    if "/maps/search/" in page.url:
        return "LIST"

    print(f"  WARNING: Timed out for '{name}'. Final URL: {page.url}",
          file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print(f"Reading seed data from: {SEED_SQL}")
    pois = parse_pois(SEED_SQL)
    print(f"Found {len(pois)} POIs to geocode.\n")

    results: list[dict] = []  # {'id', 'name', 'lat', 'lng'}
    failed: list[str] = []
    needs_manual: list[dict] = []  # {'id', 'name', 'url'} — list results

    OPERA_GX_EXE = (
        r"C:\Users\emkataumre\AppData\Local\Programs\Opera GX\opera.exe"
    )

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=False,
            executable_path=OPERA_GX_EXE,
        )
        context = browser.new_context()
        page = context.new_page()

        # Pre-accept Google's consent wall by injecting the SOCS cookie before
        # any navigation — this bypasses the consent.google.com redirect entirely.
        context.add_cookies([{
            "name": "SOCS",
            "value": "CAISEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LysBg",
            "domain": ".google.com",
            "path": "/",
            "secure": True,
            "same_site": "None",
        }])

        total = len(pois)
        for idx, poi in enumerate(pois, start=1):
            poi_id = poi["id"]
            poi_name = poi["name"]
            print(f"[{idx}/{total}] Geocoding: {poi_name}")

            coords = geocode_poi(page, poi_name)

            if coords == "LIST":
                url = page.url
                print(f"         -> LIST (needs manual review)")
                needs_manual.append({"id": poi_id, "name": poi_name, "url": url})
            elif coords:
                lat, lng = coords
                print(f"         -> lat={lat}, lng={lng}")
                results.append({"id": poi_id, "name": poi_name, "lat": lat, "lng": lng})
            else:
                print(f"         -> FAILED (skipped)")
                failed.append(poi_name)

            # Polite delay between requests (skip after the last one).
            if idx < total:
                time.sleep(BETWEEN_SEARCH_DELAY_S)

        page.close()
        context.close()
        browser.close()

    # -----------------------------------------------------------------------
    # Write output SQL
    # -----------------------------------------------------------------------
    lines = [
        "-- Auto-generated by scripts/geocode_pois.py",
        "-- Geocoded via Google Maps (Playwright)",
        "",
    ]
    for r in results:
        lines.append(
            f"UPDATE public.pois SET lat = {r['lat']}, lng = {r['lng']} "
            f"WHERE id = '{r['id']}'; -- {r['name']}"
        )

    output_text = "\n".join(lines) + "\n"
    OUTPUT_SQL.write_text(output_text, encoding="utf-8")

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    print()
    print("=" * 60)
    print(f"Done. {len(results)} succeeded, {len(needs_manual)} need manual review, {len(failed)} failed.")
    print(f"Output written to: {OUTPUT_SQL}")
    if needs_manual:
        print("\nNeeds manual review (list results — multiple locations found):")
        for poi in needs_manual:
            print(f"  - {poi['name']}")
            print(f"    {poi['url']}")
    if failed:
        print("\nFailed (no result found):")
        for name in failed:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
