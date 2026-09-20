"""Package the built extension into a Chrome Web Store upload zip.

Zips the CONTENTS of dist/ so manifest.json sits at the archive root — the
Store rejects an archive with the build folder wrapping it. Uses zipfile with
explicit forward-slash arcnames, since a zip built on Windows would otherwise
carry backslash separators that the Store's unpacker treats as part of the
filename rather than as directories.

Run `npm run build` first: this only packages what is already in dist/, and it
refuses to run if dist/ looks like a development build (a localhost host
permission in the manifest means `vite build --mode development` produced it).
"""

import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
OUT = ROOT / "dist-zip"


def main() -> None:
    manifest_path = DIST / "manifest.json"
    if not manifest_path.exists():
        sys.exit("dist/manifest.json not found — run `npm run build` first.")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    # Guard rail rather than a comment: shipping a localhost host permission
    # is a Store review flag, and it is the exact mistake this repo's own
    # manifest comment warned about.
    localhost = [h for h in manifest.get("host_permissions", []) if "localhost" in h]
    if localhost:
        sys.exit(
            f"refusing to package: dist/ carries dev host permissions {localhost}.\n"
            "Run `npm run build` (production mode) and try again."
        )

    version = manifest["version"]
    OUT.mkdir(exist_ok=True)
    zip_path = OUT / f"carouselabs-comment-v{version}.zip"

    files = sorted(p for p in DIST.rglob("*") if p.is_file())
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in files:
            arcname = path.relative_to(DIST).as_posix()
            zf.write(path, arcname)

    print(f"packaged {len(files)} files")
    print(f"version:  {version}")
    print(f"zip:      {zip_path}")

    # Read the archive back and confirm the Store's one hard requirement.
    with zipfile.ZipFile(zip_path) as zf:
        names = zf.namelist()
        bad = zf.testzip()
    print(f"manifest.json at archive root: {'YES' if 'manifest.json' in names else 'NO'}")
    print(f"archive integrity: {'OK' if bad is None else f'CORRUPT ({bad})'}")
    print(f"size: {zip_path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
