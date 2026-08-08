from pathlib import Path
import hashlib
import shutil
from datetime import datetime

# Software ka main folder
ROOT = Path(__file__).resolve().parent

# Files yahan move hongi, direct delete nahi hongi
BACKUP_DIR = ROOT / "_Cleanup_Backup"

# In folders ko bilkul check nahi kiya jayega
PROTECTED_FOLDERS = {
    ".git",
    ".venv",
    "venv",
    "env",
    "data",
    "database",
    "instance",
    "uploads",
    "static",
    "templates",
    "_Cleanup_Backup",
}

# In files ko kabhi remove/move nahi karna
PROTECTED_FILES = {
    "app.py",
    "requirements.txt",
    "runtime.txt",
    "render.yaml",
    "Procfile",
    ".env",
    ".env.example",
    ".gitignore",
    "README.md",
}

# Sirf yeh useless files move hongi
USELESS_FILE_NAMES = {
    "thumbs.db",
    "desktop.ini",
    ".ds_store",
}

USELESS_EXTENSIONS = {
    ".tmp",
    ".temp",
    ".bak",
    ".log",
    ".pyc",
}

# Duplicate checking sirf in safe file types par hogi
DUPLICATE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".pdf",
    ".txt",
    ".csv",
    ".xlsx",
    ".xls",
    ".docx",
}


def is_protected(path: Path) -> bool:
    """Protected folders aur files ko skip karta hai."""
    relative_parts = path.relative_to(ROOT).parts

    if any(part.lower() in PROTECTED_FOLDERS for part in relative_parts):
        return True

    if path.name in PROTECTED_FILES:
        return True

    # Database files protect karein
    if path.suffix.lower() in {".db", ".sqlite", ".sqlite3"}:
        return True

    return False


def file_hash(path: Path) -> str:
    """File ka SHA-256 hash banata hai."""
    sha256 = hashlib.sha256()

    with path.open("rb") as file:
        while True:
            chunk = file.read(1024 * 1024)
            if not chunk:
                break
            sha256.update(chunk)

    return sha256.hexdigest()


def move_to_backup(path: Path, category: str) -> Path:
    """File ko backup folder mein safely move karta hai."""
    relative_path = path.relative_to(ROOT)
    destination = BACKUP_DIR / category / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)

    # Same naam pehle se ho to timestamp add karein
    if destination.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        destination = destination.with_name(
            f"{destination.stem}_{timestamp}{destination.suffix}"
        )

    shutil.move(str(path), str(destination))
    return destination


def find_useless_files():
    """Temporary aur useless files find karta hai."""
    found = []

    for path in ROOT.rglob("*"):
        if not path.is_file() or is_protected(path):
            continue

        if (
            path.name.lower() in USELESS_FILE_NAMES
            or path.suffix.lower() in USELESS_EXTENSIONS
            or path.name.endswith("~")
        ):
            found.append(path)

    return found


def find_exact_duplicates():
    """
    Exact duplicate files hash se find karta hai.
    Python, HTML, CSS, JS aur database files ko duplicate cleanup mein include nahi karta.
    """
    hashes = {}
    duplicates = []

    for path in ROOT.rglob("*"):
        if not path.is_file() or is_protected(path):
            continue

        if path.suffix.lower() not in DUPLICATE_EXTENSIONS:
            continue

        try:
            size = path.stat().st_size

            # Empty files ko duplicate treat nahi karna
            if size == 0:
                continue

            digest = file_hash(path)
            key = (size, digest)

            if key in hashes:
                original = hashes[key]
                duplicates.append((path, original))
            else:
                hashes[key] = path

        except (PermissionError, OSError) as error:
            print(f"Skip: {path} — {error}")

    return duplicates


def main():
    print("=" * 65)
    print("RAHAT CORPORATE MANAGEMENT — SAFE CLEANUP")
    print("=" * 65)
    print(f"Software folder: {ROOT}")
    print()
    print("Important:")
    print("- Koi file direct delete nahi hogi.")
    print("- Files _Cleanup_Backup folder mein move hongi.")
    print("- Database, uploads, templates, static aur main code protected hain.")
    print()

    useless_files = find_useless_files()
    duplicates = find_exact_duplicates()

    print(f"Useless files found: {len(useless_files)}")
    for file in useless_files:
        print(f"  USELESS: {file.relative_to(ROOT)}")

    print()
    print(f"Exact duplicate files found: {len(duplicates)}")
    for duplicate, original in duplicates:
        print(f"  DUPLICATE: {duplicate.relative_to(ROOT)}")
        print(f"  ORIGINAL : {original.relative_to(ROOT)}")
        print()

    if not useless_files and not duplicates:
        print("Koi safe useless ya exact duplicate file nahi mili.")
        return

    print("=" * 65)
    confirmation = input(
        "Files ko _Cleanup_Backup mein move karna hai? YES type karein: "
    ).strip()

    if confirmation != "YES":
        print("Cleanup cancel kar diya gaya. Koi file change nahi hui.")
        return

    moved_count = 0

    for file in useless_files:
        if file.exists():
            destination = move_to_backup(file, "Useless_Files")
            print(f"Moved: {file.relative_to(ROOT)}")
            moved_count += 1

    for duplicate, original in duplicates:
        if duplicate.exists() and original.exists():
            destination = move_to_backup(duplicate, "Duplicate_Files")
            print(f"Moved duplicate: {duplicate.relative_to(ROOT)}")
            moved_count += 1

    print()
    print("=" * 65)
    print(f"Cleanup complete. Total files moved: {moved_count}")
    print(f"Backup location: {BACKUP_DIR}")
    print("Software ki files direct delete nahi ki gayi.")
    print("=" * 65)


if __name__ == "__main__":
    main()