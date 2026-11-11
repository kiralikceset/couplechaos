#!/usr/bin/env python3
"""Rebuild the native APK shell with a freshly built Capacitor web bundle.

The script intentionally removes every previous JAR/APK signature. Signing is
performed as a separate step after this archive has been produced.
"""

from __future__ import annotations

import argparse
import zipfile
from dataclasses import dataclass
from pathlib import Path


PUBLIC_PREFIX = "assets/public/"
REPLACED_CONFIGS = {
    "assets/capacitor.config.json",
    "assets/capacitor.plugins.json",
}
SIGNATURE_SUFFIXES = (".SF", ".RSA", ".DSA", ".EC")


@dataclass(frozen=True)
class Entry:
    name: str
    data: bytes
    compression: int
    external_attr: int = 0o100644 << 16
    create_system: int = 3


def is_old_signature(name: str) -> bool:
    upper = name.upper()
    if upper == "META-INF/MANIFEST.MF":
        return True
    return upper.startswith("META-INF/") and upper.endswith(SIGNATURE_SUFFIXES)


def zip_info(entry: Entry) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(entry.name, date_time=(1981, 1, 1, 1, 1, 0))
    info.compress_type = entry.compression
    info.external_attr = entry.external_attr
    info.create_system = entry.create_system
    info.flag_bits = 0x800
    return info


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True, type=Path)
    parser.add_argument("--web", required=True, type=Path)
    parser.add_argument("--native-assets", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    if not (args.web / "index.html").is_file():
        raise SystemExit(f"Missing web entry point: {args.web / 'index.html'}")

    entries: list[Entry] = []
    seen: set[str] = set()
    with zipfile.ZipFile(args.base) as source:
        corrupt = source.testzip()
        if corrupt:
            raise SystemExit(f"Base APK contains a corrupt entry: {corrupt}")
        for info in source.infolist():
            name = info.filename
            if info.is_dir():
                continue
            if (
                name.startswith(PUBLIC_PREFIX)
                or name in REPLACED_CONFIGS
                or is_old_signature(name)
            ):
                continue
            if name in seen:
                raise SystemExit(f"Duplicate entry in base APK: {name}")
            entries.append(
                Entry(
                    name=name,
                    data=source.read(info),
                    compression=info.compress_type,
                    external_attr=info.external_attr,
                    create_system=info.create_system,
                )
            )
            seen.add(name)

    for path in sorted(args.web.rglob("*")):
        if not path.is_file() or any(part.startswith(".") for part in path.parts):
            continue
        name = PUBLIC_PREFIX + path.relative_to(args.web).as_posix()
        if name in seen:
            raise SystemExit(f"Duplicate replacement entry: {name}")
        entries.append(Entry(name, path.read_bytes(), zipfile.ZIP_DEFLATED))
        seen.add(name)

    for name in sorted(REPLACED_CONFIGS):
        source = args.native_assets / Path(name).name
        if not source.is_file():
            raise SystemExit(f"Missing native configuration: {source}")
        entries.append(Entry(name, source.read_bytes(), zipfile.ZIP_DEFLATED))
        seen.add(name)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, "w", allowZip64=False) as target:
        for entry in entries:
            target.writestr(zip_info(entry), entry.data)

    with zipfile.ZipFile(args.output) as result:
        names = result.namelist()
        if len(names) != len(set(names)):
            raise SystemExit("Rebuilt APK contains duplicate ZIP entries")
        corrupt = result.testzip()
        if corrupt:
            raise SystemExit(f"Rebuilt APK contains a corrupt entry: {corrupt}")
        if "assets/public/index.html" not in names:
            raise SystemExit("Rebuilt APK is missing assets/public/index.html")
        if any(name.startswith("assets/public/__manus__/") for name in names):
            raise SystemExit("Development-only __manus__ assets remain in APK")
        if any(is_old_signature(name) for name in names):
            raise SystemExit("A previous APK signature remains in the archive")

    print(f"Rebuilt unsigned APK: {args.output} ({args.output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
