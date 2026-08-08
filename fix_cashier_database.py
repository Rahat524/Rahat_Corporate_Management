import sqlite3
from pathlib import Path

db_path = Path("data/corporate_scrap.db")

columns = {
    "source_sheet": "TEXT",
    "source_file": "TEXT",
    "source_record_key": "TEXT",
    "source_hash": "TEXT",
    "posted_at": "TEXT",
    "is_locked": "INTEGER DEFAULT 0",
    "created_at": "TEXT"
}

conn = sqlite3.connect(db_path)
cur = conn.cursor()

table = "cashier_closings"

existing = {
    row[1]
    for row in cur.execute(f"PRAGMA table_info({table})").fetchall()
}

print("Existing columns:", sorted(existing))

for column, definition in columns.items():
    if column not in existing:
        cur.execute(
            f"ALTER TABLE {table} ADD COLUMN {column} {definition}"
        )
        print(f"Added: {column}")
    else:
        print(f"Already available: {column}")

cur.execute("""
CREATE INDEX IF NOT EXISTS
idx_cashier_closings_source_record_key
ON cashier_closings(source_record_key)
""")

conn.commit()

print("\nMigration completed successfully.")
print("Updated columns:")

for row in cur.execute(
    "PRAGMA table_info(cashier_closings)"
).fetchall():
    print(row[1], row[2])

conn.close()
