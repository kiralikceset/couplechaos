#!/usr/bin/env python3
"""Align uncompressed APK entries on 4-byte boundaries without recompression."""

from __future__ import annotations

import argparse
import struct
from pathlib import Path


EOCD_MAGIC = b"PK\x05\x06"
CD_MAGIC = b"PK\x01\x02"
LOCAL_MAGIC = b"PK\x03\x04"


def find_eocd(data: bytes) -> int:
    start = max(0, len(data) - 22 - 0xFFFF)
    offset = data.rfind(EOCD_MAGIC, start)
    while offset >= start:
        if offset + 22 <= len(data):
            comment_size = struct.unpack_from("<H", data, offset + 20)[0]
            if offset + 22 + comment_size == len(data):
                return offset
        offset = data.rfind(EOCD_MAGIC, start, offset)
    raise ValueError("ZIP EOCD not found")


def parse_central_directory(data: bytes):
    eocd_offset = find_eocd(data)
    count = struct.unpack_from("<H", data, eocd_offset + 10)[0]
    cd_size = struct.unpack_from("<I", data, eocd_offset + 12)[0]
    cd_offset = struct.unpack_from("<I", data, eocd_offset + 16)[0]
    if count == 0xFFFF or cd_size == 0xFFFFFFFF or cd_offset == 0xFFFFFFFF:
        raise ValueError("ZIP64 APK is unsupported")
    if cd_offset + cd_size != eocd_offset:
        raise ValueError("Malformed Central Directory")

    records = []
    offset = cd_offset
    for _ in range(count):
        if data[offset:offset + 4] != CD_MAGIC:
            raise ValueError("Central Directory entry missing")
        name_size, extra_size, comment_size = struct.unpack_from("<HHH", data, offset + 28)
        size = 46 + name_size + extra_size + comment_size
        record = bytearray(data[offset:offset + size])
        local_offset = struct.unpack_from("<I", record, 42)[0]
        records.append((local_offset, record))
        offset += size
    if offset != eocd_offset:
        raise ValueError("Central Directory size/count mismatch")
    return records, eocd_offset, cd_offset


def align_apk(
    data: bytes, alignment: int = 4, central_directory_alignment: int = 1
) -> bytes:
    records, eocd_offset, old_cd_offset = parse_central_directory(data)
    physical = sorted(enumerate(records), key=lambda item: item[1][0])
    output = bytearray()
    new_offsets: dict[int, int] = {}

    for physical_index, (record_index, (old_offset, _record)) in enumerate(physical):
        next_old_offset = (
            physical[physical_index + 1][1][0]
            if physical_index + 1 < len(physical)
            else old_cd_offset
        )
        segment = data[old_offset:next_old_offset]
        if segment[:4] != LOCAL_MAGIC:
            raise ValueError(f"Local ZIP header missing at offset {old_offset}")
        method = struct.unpack_from("<H", segment, 8)[0]
        name_size, extra_size = struct.unpack_from("<HH", segment, 26)
        header_size = 30 + name_size + extra_size
        if header_size > len(segment):
            raise ValueError("Truncated local ZIP header")

        new_offsets[record_index] = len(output)
        padding_size = 0
        if method == 0:
            data_offset = len(output) + header_size
            padding_size = (-data_offset) % alignment

        if physical_index + 1 == len(physical) and central_directory_alignment > 1:
            projected_cd_offset = len(output) + len(segment) + padding_size
            padding_size += (-projected_cd_offset) % central_directory_alignment

        if padding_size:
            header = bytearray(segment[:header_size])
            struct.pack_into("<H", header, 28, extra_size + padding_size)
            header.extend(b"\0" * padding_size)
            output.extend(header)
            output.extend(segment[header_size:])
        else:
            output.extend(segment)

    new_cd_offset = len(output)
    for index, (_old_offset, record) in enumerate(records):
        struct.pack_into("<I", record, 42, new_offsets[index])
        output.extend(record)
    new_cd_size = len(output) - new_cd_offset

    eocd = bytearray(data[eocd_offset:])
    struct.pack_into("<I", eocd, 12, new_cd_size)
    struct.pack_into("<I", eocd, 16, new_cd_offset)
    output.extend(eocd)
    return bytes(output)


def verify_alignment(data: bytes, alignment: int = 4) -> list[str]:
    records, _eocd_offset, _cd_offset = parse_central_directory(data)
    failures: list[str] = []
    for local_offset, record in records:
        method = struct.unpack_from("<H", record, 10)[0]
        if method != 0:
            continue
        name_size = struct.unpack_from("<H", data, local_offset + 26)[0]
        extra_size = struct.unpack_from("<H", data, local_offset + 28)[0]
        name = data[local_offset + 30:local_offset + 30 + name_size].decode(
            "utf-8", "replace"
        )
        data_offset = local_offset + 30 + name_size + extra_size
        if data_offset % alignment:
            failures.append(f"{name}: data offset {data_offset}")
    return failures


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--alignment", type=int, default=4)
    parser.add_argument("--central-directory-alignment", type=int, default=1)
    args = parser.parse_args()

    aligned = align_apk(
        args.input.read_bytes(),
        args.alignment,
        args.central_directory_alignment,
    )
    failures = verify_alignment(aligned, args.alignment)
    if failures:
        raise SystemExit("Alignment verification failed:\n" + "\n".join(failures))
    records, _eocd_offset, cd_offset = parse_central_directory(aligned)
    if cd_offset % args.central_directory_alignment:
        raise SystemExit("Central Directory alignment verification failed")
    args.output.write_bytes(aligned)
    print(f"Aligned {args.output} ({len(aligned)} bytes)")


if __name__ == "__main__":
    main()
