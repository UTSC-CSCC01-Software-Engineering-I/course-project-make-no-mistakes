"""
Extract columns A, B, C, F, H from a census CSV and output JSON.

Usage
-----
    python extract_csv.py input.csv
    python extract_csv.py input.csv --out results.json
"""

import argparse
import csv
import json
import sys
from pathlib import Path

# extract ridings and their populations of each province/territory and dumps into json file
def extract(input_path: Path, output_path: Path):
    results = []
    skipped = 0

    with open(input_path, encoding="latin-1", newline="") as f:
        reader = csv.reader(f)

        header = next(reader)
        COL = {"A": 0, "B": 1, "C": 2, "F": 5, "H": 7}

        if len(header) <= max(COL.values()):
            print(f"[error] File has only {len(header)} columns, need at least {max(COL.values()) + 1}")
            sys.exit(1)

        TARGET_F = "Total population in private households by citizenship"

        for i, row in enumerate(reader, start=2):
            if len(row) <= max(COL.values()):
                skipped += 1
                continue

            # Only keep rows where column F matches the target string exactly
            if row[COL["F"]].strip() != TARGET_F:
                skipped += 1
                continue

            # Parse population as integer, skip if blank or non-numeric
            raw_pop = row[COL["H"]].strip().replace(",", "")
            try:
                population = int(raw_pop)
            except ValueError:
                skipped += 1
                continue

            results.append({
                "id":         row[COL["A"]].strip(),
                "province":   row[COL["B"]].strip(),
                "riding":     row[COL["C"]].strip(),
                "query":      row[COL["F"]].strip(),
                "population": population,
            })

    output_path.write_text(
        json.dumps(results, ensure_ascii=False, indent=6),
        encoding="utf-8"
    )

    print(f"Done: {len(results)} rows written to {output_path}")
    if skipped:
        print(f"      {skipped} rows skipped (wrong F value, short rows, or non-numeric population)")


def main():
    parser = argparse.ArgumentParser(description="Extract census CSV columns to JSON.")
    parser.add_argument("input", type=Path, help="Path to input CSV file")
    parser.add_argument("--out", type=Path, default=None, help="Output JSON path (default: <input>.json)")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"[error] File not found: {args.input}")
        sys.exit(1)

    output = args.out or args.input.with_suffix(".json")
    extract(args.input, output)


if __name__ == "__main__":
    main()
