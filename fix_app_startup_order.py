from pathlib import Path

path = Path("app.py")
text = path.read_text(encoding="utf-8")

old = """    CREATE UNIQUE INDEX IF NOT EXISTS idx_cashier_source_key ON cashier_closings(source_record_key) WHERE source_record_key IS NOT NULL;
    CREATE TABLE IF NOT EXISTS cashier_import_batches("""
new = """    -- Index is created after legacy columns are migrated.
    CREATE TABLE IF NOT EXISTS cashier_import_batches("""

if old not in text:
    raise SystemExit("ERROR: Expected index block not found in app.py")

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")

print("app.py startup-order fix completed.")
