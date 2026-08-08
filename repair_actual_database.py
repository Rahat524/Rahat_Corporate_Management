import os
import re
import sqlite3
from pathlib import Path
from datetime import datetime

project = Path.cwd()
app_file = project / "app.py"
text = app_file.read_text(encoding="utf-8", errors="ignore")

# Read APP_DATA definition without importing app.py
match = re.search(
    r'APP_DATA\s*=\s*(.+)',
    text
)

env_db = os.environ.get("RAHAT_DATABASE_PATH") or os.environ.get("DATABASE_PATH")

candidates = []

if env_db:
    candidates.append(Path(env_db))

# Common project database locations
candidates.extend([
    project / "data" / "corporate_scrap.db",
    project / "corporate_scrap.db",
    project / "instance" / "corporate_scrap.db",
])

# Include every database found in project
for pattern in ("*.db", "*.sqlite", "*.sqlite3"):
    candidates.extend(project.rglob(pattern))

# Remove duplicate paths
unique = []
seen = set()

for path in candidates:
    try:
        resolved = path.resolve()
    except Exception:
        resolved = path

    if str(resolved).lower() not in seen:
        seen.add(str(resolved).lower())
        unique.append(resolved)

print("\n=== DATABASE CHECK ===")

selected = None

for db_path in unique:
    if not db_path.exists():
        continue

    try:
        conn = sqlite3.connect(db_path)
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        conn.close()

        print(f"\nDatabase: {db_path}")
        print(f"Size: {db_path.stat().st_size:,} bytes")
        print(f"Tables: {sorted(tables)}")

        if "cashier_closings" in tables:
            selected = db_path
            break

    except Exception as exc:
        print(f"Could not inspect {db_path}: {exc}")

if selected is None:
    raise SystemExit(
        "\nERROR: cashier_closings table kisi database mein nahi mili."
    )

print(f"\nSELECTED DATABASE: {selected}")

# Create backup
stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup = selected.with_name(
    f"{selected.stem}_backup_before_migration_{stamp}{selected.suffix}"
)
backup.write_bytes(selected.read_bytes())

print(f"Backup created: {backup}")

conn = sqlite3.connect(selected)
cur = conn.cursor()

columns = {
    row[1]
    for row in cur.execute(
        "PRAGMA table_info(cashier_closings)"
    ).fetchall()
}

required_columns = {
    "source_sheet": "TEXT",
    "source_file": "TEXT",
    "source_record_key": "TEXT",
    "source_hash": "TEXT",
    "posted_at": "TEXT",
    "is_locked": "INTEGER DEFAULT 0",
    "created_at": "TEXT"
}

for column, definition in required_columns.items():
    if column not in columns:
        cur.execute(
            f'ALTER TABLE cashier_closings '
            f'ADD COLUMN "{column}" {definition}'
        )
        print(f"Added column: {column}")
    else:
        print(f"Already exists: {column}")

cur.execute("""
CREATE INDEX IF NOT EXISTS
idx_cashier_closings_source_record_key
ON cashier_closings(source_record_key)
""")

conn.commit()
conn.close()

print("\nDATABASE MIGRATION SUCCESSFUL")
print(f"Use database path: {selected}")
