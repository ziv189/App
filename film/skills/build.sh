#!/usr/bin/env bash
# Copies the shared film bible into every skill and packages each skill as a .skill file in dist/.
set -euo pipefail
cd "$(dirname "$0")"
python3 - <<'PY'
import pathlib
import shutil
import zipfile

root = pathlib.Path(".")
bible = root / "_shared" / "film-bible.md"
dist = root / "dist"
dist.mkdir(exist_ok=True)

for skill in sorted(p for p in root.iterdir() if p.is_dir() and p.name.startswith("ill-catch-you-")):
    refs = skill / "references"
    refs.mkdir(exist_ok=True)
    shutil.copyfile(bible, refs / "film-bible.md")
    out = dist / f"{skill.name}.skill"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(skill.rglob("*")):
            if f.is_file() and f.name != ".DS_Store":
                z.write(f, f.relative_to(root))
    print("packaged", out)
PY
