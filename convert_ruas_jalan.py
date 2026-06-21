"""
Convert ruas_jalan data from SQL dump to GeoJSON.
Handles multi-line MySQL INSERT statements.
"""

import json
import re

INPUT_FILE = "data/onlinkid_rambu.sql"
OUTPUT_FILE = "data/ruas_jalan.geojson"


def extract_insert_block(content):
    """Extract the full VALUES block from INSERT INTO ruas_jalan."""
    # Find start of INSERT
    start_idx = content.find("INSERT INTO `ruas_jalan`")
    if start_idx == -1:
        return None

    # Find VALUES keyword
    values_idx = content.find("VALUES", start_idx)
    if values_idx == -1:
        return None

    # Now find the matching closing point — the next statement after all rows
    # Rows start with ( after VALUES and end with ); before next statement
    pos = values_idx + len("VALUES")
    # Skip whitespace
    while pos < len(content) and content[pos] in " \t\n\r":
        pos += 1

    # Find the end: we need to track parentheses depth and string quoting
    depth = 0
    in_string = False
    escape_next = False
    block_start = pos

    for i in range(pos, len(content)):
        ch = content[i]

        if escape_next:
            escape_next = False
            continue

        if ch == "\\":
            if in_string:
                escape_next = True
            continue

        if ch == "'":
            in_string = not in_string
            continue

        if not in_string:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    # This row is complete
                    pass
            elif ch == ";":
                if depth == 0:
                    # End of INSERT statement
                    return content[block_start:i]

    return content[block_start:]


def split_rows(block):
    """Split the VALUES block into individual row strings."""
    rows = []
    current = ""
    depth = 0
    in_string = False
    escape_next = False

    for ch in block:
        if escape_next:
            current += ch
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            current += ch
            continue
        if ch == "'":
            in_string = not in_string
            current += ch
            continue
        if not in_string:
            if ch == "(":
                depth += 1
                if depth == 1:
                    current = ""
                    continue
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    rows.append(current)
                    current = ""
                    continue
            elif ch == "," and depth == 0:
                continue
        current += ch

    return rows


def parse_row_values(row_str):
    """Parse comma-separated values from a row string, respecting quotes."""
    values = []
    current = ""
    in_string = False
    escape_next = False

    for ch in row_str:
        if escape_next:
            current += ch
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            current += ch
            continue
        if ch == "'":
            in_string = not in_string
            continue  # strip quotes
        if ch == "," and not in_string:
            values.append(current.strip())
            current = ""
            continue
        current += ch

    values.append(current.strip())
    return values


def clean_value(v):
    """Convert SQL value to Python value."""
    if v == "NULL" or v == "null" or v == "":
        return None
    if v.startswith("'") and v.endswith("'"):
        return v[1:-1]
    if v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    try:
        return int(v)
    except ValueError:
        pass
    try:
        return float(v)
    except ValueError:
        pass
    return v


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    block = extract_insert_block(content)
    if not block:
        print("ERROR: Could not find INSERT INTO ruas_jalan")
        sys.exit(1)

    print(f"Extracted VALUES block ({len(block)} chars)")

    rows = split_rows(block)
    print(f"Found {len(rows)} rows")

    features = []
    skipped = 0

    for i, row_str in enumerate(rows):
        vals_raw = parse_row_values(row_str)
        if len(vals_raw) < 17:
            skipped += 1
            continue

        vals = [clean_value(v) for v in vals_raw]

        id_val = vals[0]
        nomor_ruas = vals[2]
        nama_ruas = vals[4]
        titik_awal = vals[5]
        titik_akhir = vals[6]
        from_lat = vals[7]
        from_lng = vals[8]
        to_lat = vals[9]
        to_lng = vals[10]
        panjang = vals[12]
        lebar = vals[13]

        if from_lat is None or from_lng is None or to_lat is None or to_lng is None:
            skipped += 1
            continue

        try:
            from_lat = float(from_lat)
            from_lng = float(from_lng)
            to_lat = float(to_lat)
            to_lng = float(to_lng)
        except (ValueError, TypeError):
            skipped += 1
            continue

        feature = {
            "type": "Feature",
            "properties": {
                "id": id_val,
                "nomor_ruas": nomor_ruas,
                "nama_ruas": nama_ruas,
                "titik_awal": titik_awal,
                "titik_akhir": titik_akhir,
                "panjang_km": panjang,
                "lebar_m": lebar,
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [from_lng, from_lat],
                    [to_lng, to_lat],
                ],
            },
        }
        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    print(f"Written {len(features)} features to {OUTPUT_FILE}")
    if skipped:
        print(f"Skipped {skipped} rows (missing/invalid coordinates)")

    # Print a few samples
    for f in features[:3]:
        p = f["properties"]
        g = f["geometry"]
        print(f"  {p['nomor_ruas']} | {p['nama_ruas']} | {p['panjang_km']} km | coords: {g['coordinates']}")


if __name__ == "__main__":
    import sys
    main()
