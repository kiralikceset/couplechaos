#!/usr/bin/env python3
"""Minimal APK Signature Scheme v2/v3 signer/verifier.

This is intentionally small and limited to a single RSA signer. It exists so the
test APK can be signed correctly in environments where Android build-tools are
not installed. The produced block follows the AOSP APK Signature Scheme v2/v3
formats and uses RSA PKCS#1 v1.5 with SHA-256 (algorithm ID 0x0103).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from dataclasses import dataclass
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa


EOCD_MAGIC = b"PK\x05\x06"
SIG_BLOCK_MAGIC = b"APK Sig Block 42"
V2_BLOCK_ID = 0x7109871A
V3_BLOCK_ID = 0xF05368C0
STRIPPING_PROTECTION_ATTR_ID = 0xBEEFF00D
VERITY_PADDING_BLOCK_ID = 0x42726577
CHUNK_SIZE = 1024 * 1024


class ApkFormatError(ValueError):
    pass


@dataclass(frozen=True)
class ZipLayout:
    eocd_offset: int
    central_directory_offset: int
    central_directory_size: int
    signing_block_offset: int


def u32(value: int) -> bytes:
    return struct.pack("<I", value)


def u64(value: int) -> bytes:
    return struct.pack("<Q", value)


def lp32(value: bytes) -> bytes:
    return u32(len(value)) + value


def read_lp32(data: bytes, offset: int) -> tuple[bytes, int]:
    if offset + 4 > len(data):
        raise ApkFormatError("Truncated length-prefixed field")
    size = struct.unpack_from("<I", data, offset)[0]
    start = offset + 4
    end = start + size
    if end > len(data):
        raise ApkFormatError("Length-prefixed field exceeds container")
    return data[start:end], end


def iter_lp32(data: bytes):
    offset = 0
    while offset < len(data):
        value, offset = read_lp32(data, offset)
        yield value
    if offset != len(data):
        raise ApkFormatError("Malformed length-prefixed sequence")


def find_eocd(data: bytes) -> int:
    start = max(0, len(data) - 22 - 0xFFFF)
    offset = data.rfind(EOCD_MAGIC, start)
    while offset >= start:
        if offset + 22 <= len(data):
            comment_size = struct.unpack_from("<H", data, offset + 20)[0]
            if offset + 22 + comment_size == len(data):
                return offset
        offset = data.rfind(EOCD_MAGIC, start, offset)
    raise ApkFormatError("ZIP End of Central Directory not found")


def parse_layout(data: bytes) -> ZipLayout:
    eocd_offset = find_eocd(data)
    disk_number, cd_disk = struct.unpack_from("<HH", data, eocd_offset + 4)
    if disk_number != 0 or cd_disk != 0:
        raise ApkFormatError("Multi-disk ZIP/APK is unsupported")
    central_directory_size = struct.unpack_from("<I", data, eocd_offset + 12)[0]
    central_directory_offset = struct.unpack_from("<I", data, eocd_offset + 16)[0]
    if central_directory_offset == 0xFFFFFFFF or central_directory_size == 0xFFFFFFFF:
        raise ApkFormatError("ZIP64 APK is unsupported")
    if central_directory_offset + central_directory_size != eocd_offset:
        raise ApkFormatError("Central Directory is not immediately before EOCD")

    signing_block_offset = central_directory_offset
    if central_directory_offset >= 24:
        footer = central_directory_offset - 24
        if data[central_directory_offset - 16:central_directory_offset] == SIG_BLOCK_MAGIC:
            block_size = struct.unpack_from("<Q", data, footer)[0]
            if block_size < 24 or block_size + 8 > central_directory_offset:
                raise ApkFormatError("Invalid APK Signing Block size")
            signing_block_offset = central_directory_offset - block_size - 8
            first_size = struct.unpack_from("<Q", data, signing_block_offset)[0]
            if first_size != block_size:
                raise ApkFormatError("APK Signing Block size fields differ")

    return ZipLayout(
        eocd_offset=eocd_offset,
        central_directory_offset=central_directory_offset,
        central_directory_size=central_directory_size,
        signing_block_offset=signing_block_offset,
    )


def normalized_sections(data: bytes, layout: ZipLayout) -> tuple[bytes, bytes, bytes]:
    before_block = data[:layout.signing_block_offset]
    central_directory = data[
        layout.central_directory_offset:layout.eocd_offset
    ]
    eocd = bytearray(data[layout.eocd_offset:])
    struct.pack_into("<I", eocd, 16, layout.signing_block_offset)
    return before_block, central_directory, bytes(eocd)


def content_digest(data: bytes, layout: ZipLayout, algorithm: hashes.HashAlgorithm) -> bytes:
    chunk_digests: list[bytes] = []
    hash_name = algorithm.name
    for section in normalized_sections(data, layout):
        for offset in range(0, len(section), CHUNK_SIZE):
            chunk = section[offset:offset + CHUNK_SIZE]
            hasher = hashlib.new(hash_name)
            hasher.update(b"\xa5")
            hasher.update(u32(len(chunk)))
            hasher.update(chunk)
            chunk_digests.append(hasher.digest())

    hasher = hashlib.new(hash_name)
    hasher.update(b"\x5a")
    hasher.update(u32(len(chunk_digests)))
    for digest in chunk_digests:
        hasher.update(digest)
    return hasher.digest()


def strip_signing_block(data: bytes) -> bytes:
    layout = parse_layout(data)
    if layout.signing_block_offset == layout.central_directory_offset:
        return data
    eocd = bytearray(data[layout.eocd_offset:])
    struct.pack_into("<I", eocd, 16, layout.signing_block_offset)
    return (
        data[:layout.signing_block_offset]
        + data[layout.central_directory_offset:layout.eocd_offset]
        + bytes(eocd)
    )


def build_signing_block(
    unsigned_apk: bytes,
    private_key_pem: bytes,
    certificate_der: bytes,
    min_sdk: int = 24,
    max_sdk: int = 0x7FFFFFFF,
) -> bytes:
    unsigned_apk = strip_signing_block(unsigned_apk)
    layout = parse_layout(unsigned_apk)
    if layout.signing_block_offset != layout.central_directory_offset:
        raise ApkFormatError("Could not normalize existing signing block")

    private_key = serialization.load_pem_private_key(private_key_pem, password=None)
    if not isinstance(private_key, rsa.RSAPrivateKey):
        raise ValueError("Only RSA private keys are supported for signing")
    certificate = x509.load_der_x509_certificate(certificate_der)
    if certificate.public_key().public_numbers() != private_key.public_key().public_numbers():
        raise ValueError("Certificate does not match private key")

    algorithm_id = 0x0103
    digest = content_digest(unsigned_apk, layout, hashes.SHA256())
    digest_record = u32(algorithm_id) + lp32(digest)
    digests = lp32(digest_record)
    certificates = lp32(certificate_der)
    stripping_attribute = lp32(u32(STRIPPING_PROTECTION_ATTR_ID) + u32(3))
    v2_signed_data = (
        lp32(digests)
        + lp32(certificates)
        + lp32(stripping_attribute)
        + lp32(b"")
    )

    v2_signature = private_key.sign(
        v2_signed_data, padding.PKCS1v15(), hashes.SHA256()
    )
    v2_signature_record = u32(algorithm_id) + lp32(v2_signature)
    v2_signatures = lp32(v2_signature_record)
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    v2_signer = lp32(v2_signed_data) + lp32(v2_signatures) + lp32(public_key)
    # The v2 value contains one length-prefixed signer sequence, whose items
    # are themselves length-prefixed signer records.
    v2_value = lp32(lp32(v2_signer))

    v3_attributes = b""
    v3_signed_data = (
        lp32(digests)
        + lp32(certificates)
        + u32(min_sdk)
        + u32(max_sdk)
        + lp32(v3_attributes)
    )
    v3_signature = private_key.sign(
        v3_signed_data, padding.PKCS1v15(), hashes.SHA256()
    )
    v3_signature_record = u32(algorithm_id) + lp32(v3_signature)
    v3_signatures = lp32(v3_signature_record)
    v3_signer = (
        lp32(v3_signed_data)
        + u32(min_sdk)
        + u32(max_sdk)
        + lp32(v3_signatures)
        + lp32(public_key)
    )
    v3_value = lp32(lp32(v3_signer))

    v2_pair_value = u32(V2_BLOCK_ID) + v2_value
    v3_pair_value = u32(V3_BLOCK_ID) + v3_value
    pairs = (
        u64(len(v2_pair_value))
        + v2_pair_value
        + u64(len(v3_pair_value))
        + v3_pair_value
    )
    # Android's signer pads the full Signing Block to a 4096-byte multiple.
    # The padding pair is ignored by signature verification and keeps the
    # Central Directory aligned exactly as it was before signing.
    base_block_size = 8 + len(pairs) + 8 + len(SIG_BLOCK_MAGIC)
    padding_pair_size = (-base_block_size) % 4096
    if padding_pair_size:
        if padding_pair_size < 12:
            padding_pair_size += 4096
        padding_value = b"\0" * (padding_pair_size - 12)
        padding_pair_value = u32(VERITY_PADDING_BLOCK_ID) + padding_value
        pairs += u64(len(padding_pair_value)) + padding_pair_value
    block_size = len(pairs) + 8 + len(SIG_BLOCK_MAGIC)
    signing_block = u64(block_size) + pairs + u64(block_size) + SIG_BLOCK_MAGIC

    new_cd_offset = layout.central_directory_offset + len(signing_block)
    eocd = bytearray(unsigned_apk[layout.eocd_offset:])
    struct.pack_into("<I", eocd, 16, new_cd_offset)
    return (
        unsigned_apk[:layout.central_directory_offset]
        + signing_block
        + unsigned_apk[layout.central_directory_offset:layout.eocd_offset]
        + bytes(eocd)
    )


def signing_pairs(data: bytes, layout: ZipLayout) -> dict[int, bytes]:
    if layout.signing_block_offset == layout.central_directory_offset:
        return {}
    offset = layout.signing_block_offset + 8
    end = layout.central_directory_offset - 24
    pairs: dict[int, bytes] = {}
    while offset < end:
        if offset + 8 > end:
            raise ApkFormatError("Truncated APK Signing Block pair")
        pair_size = struct.unpack_from("<Q", data, offset)[0]
        offset += 8
        pair_end = offset + pair_size
        if pair_size < 4 or pair_end > end:
            raise ApkFormatError("Invalid APK Signing Block pair size")
        pair_id = struct.unpack_from("<I", data, offset)[0]
        pairs.setdefault(pair_id, data[offset + 4:pair_end])
        offset = pair_end
    if offset != end:
        raise ApkFormatError("APK Signing Block pairs do not fill block")
    return pairs


def signature_parameters(algorithm_id: int):
    if algorithm_id == 0x0101:
        return hashes.SHA256(), padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32)
    if algorithm_id == 0x0102:
        return hashes.SHA512(), padding.PSS(mgf=padding.MGF1(hashes.SHA512()), salt_length=64)
    if algorithm_id == 0x0103:
        return hashes.SHA256(), padding.PKCS1v15()
    if algorithm_id == 0x0104:
        return hashes.SHA512(), padding.PKCS1v15()
    if algorithm_id == 0x0201:
        return hashes.SHA256(), ec.ECDSA(hashes.SHA256())
    if algorithm_id == 0x0202:
        return hashes.SHA512(), ec.ECDSA(hashes.SHA512())
    raise ApkFormatError(f"Unsupported signature algorithm: 0x{algorithm_id:04x}")


def parse_algorithm_records(data: bytes) -> list[tuple[int, bytes]]:
    records: list[tuple[int, bytes]] = []
    for record in iter_lp32(data):
        if len(record) < 8:
            raise ApkFormatError("Truncated algorithm record")
        algorithm_id = struct.unpack_from("<I", record, 0)[0]
        value, end = read_lp32(record, 4)
        if end != len(record):
            raise ApkFormatError("Trailing data in algorithm record")
        records.append((algorithm_id, value))
    return records


def verify_v2(data: bytes) -> dict[str, object]:
    layout = parse_layout(data)
    pairs = signing_pairs(data, layout)
    if V2_BLOCK_ID not in pairs:
        raise ApkFormatError("APK Signature Scheme v2 block not found")

    signer_results: list[dict[str, object]] = []
    signers_blob, signers_end = read_lp32(pairs[V2_BLOCK_ID], 0)
    if signers_end != len(pairs[V2_BLOCK_ID]):
        raise ApkFormatError("Trailing data in v2 signer sequence")
    signers = list(iter_lp32(signers_blob))
    if not signers:
        raise ApkFormatError("No v2 signers found")

    for signer_number, signer in enumerate(signers, 1):
        signed_data, offset = read_lp32(signer, 0)
        signatures_blob, offset = read_lp32(signer, offset)
        public_key_der, offset = read_lp32(signer, offset)
        if offset != len(signer):
            raise ApkFormatError("Trailing data in v2 signer")

        signatures = parse_algorithm_records(signatures_blob)
        digests_blob, signed_offset = read_lp32(signed_data, 0)
        certificates_blob, signed_offset = read_lp32(signed_data, signed_offset)
        _attributes_blob, signed_offset = read_lp32(signed_data, signed_offset)
        # Recent Android build-tools may append empty, length-prefixed reserved
        # fields. They are covered by the signature but do not change v2
        # content-digest verification.
        while signed_offset < len(signed_data):
            reserved, signed_offset = read_lp32(signed_data, signed_offset)
            if reserved:
                raise ApkFormatError("Unexpected non-empty reserved v2 signed-data field")
        digests = parse_algorithm_records(digests_blob)
        if [x[0] for x in signatures] != [x[0] for x in digests]:
            raise ApkFormatError("Digest and signature algorithm lists differ")

        certificates = list(iter_lp32(certificates_blob))
        if not certificates:
            raise ApkFormatError("Signer has no certificate")
        certificate = x509.load_der_x509_certificate(certificates[0])
        public_key = serialization.load_der_public_key(public_key_der)
        certificate_public_key_der = certificate.public_key().public_bytes(
            serialization.Encoding.DER,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        if certificate_public_key_der != public_key_der:
            raise ApkFormatError("Certificate public key does not match signer public key")

        verified_algorithms: list[str] = []
        for (algorithm_id, signature), (_, expected_digest) in zip(signatures, digests):
            hash_algorithm, signature_padding = signature_parameters(algorithm_id)
            actual_digest = content_digest(data, layout, hash_algorithm)
            if actual_digest != expected_digest:
                raise ApkFormatError(
                    f"APK content digest mismatch for algorithm 0x{algorithm_id:04x}"
                )
            if isinstance(public_key, rsa.RSAPublicKey):
                public_key.verify(signature, signed_data, signature_padding, hash_algorithm)
            elif isinstance(public_key, ec.EllipticCurvePublicKey):
                public_key.verify(signature, signed_data, signature_padding)
            else:
                raise ApkFormatError("Unsupported public key type")
            verified_algorithms.append(f"0x{algorithm_id:04x}")

        signer_results.append(
            {
                "signer": signer_number,
                "subject": certificate.subject.rfc4514_string(),
                "certificate_sha256": certificate.fingerprint(hashes.SHA256()).hex(),
                "algorithms": verified_algorithms,
            }
        )

    return {
        "verified": True,
        "scheme": "v2",
        "signing_block_offset": layout.signing_block_offset,
        "central_directory_offset": layout.central_directory_offset,
        "signers": signer_results,
    }


def verify_v3(data: bytes) -> dict[str, object]:
    layout = parse_layout(data)
    pairs = signing_pairs(data, layout)
    if V3_BLOCK_ID not in pairs:
        raise ApkFormatError("APK Signature Scheme v3 block not found")

    signers_blob, signers_end = read_lp32(pairs[V3_BLOCK_ID], 0)
    if signers_end != len(pairs[V3_BLOCK_ID]):
        raise ApkFormatError("Trailing data in v3 signer sequence")
    signers = list(iter_lp32(signers_blob))
    if not signers:
        raise ApkFormatError("No v3 signers found")

    signer_results: list[dict[str, object]] = []
    for signer_number, signer in enumerate(signers, 1):
        signed_data, offset = read_lp32(signer, 0)
        if offset + 8 > len(signer):
            raise ApkFormatError("Truncated v3 signer SDK range")
        outer_min_sdk, outer_max_sdk = struct.unpack_from("<II", signer, offset)
        offset += 8
        signatures_blob, offset = read_lp32(signer, offset)
        public_key_der, offset = read_lp32(signer, offset)
        if offset != len(signer):
            raise ApkFormatError("Trailing data in v3 signer")

        digests_blob, signed_offset = read_lp32(signed_data, 0)
        certificates_blob, signed_offset = read_lp32(signed_data, signed_offset)
        if signed_offset + 8 > len(signed_data):
            raise ApkFormatError("Truncated signed v3 SDK range")
        signed_min_sdk, signed_max_sdk = struct.unpack_from(
            "<II", signed_data, signed_offset
        )
        signed_offset += 8
        _attributes_blob, signed_offset = read_lp32(signed_data, signed_offset)
        if signed_offset != len(signed_data):
            raise ApkFormatError("Trailing data in v3 signed data")
        if (signed_min_sdk, signed_max_sdk) != (outer_min_sdk, outer_max_sdk):
            raise ApkFormatError("Signed and outer v3 SDK ranges differ")

        signatures = parse_algorithm_records(signatures_blob)
        digests = parse_algorithm_records(digests_blob)
        if [x[0] for x in signatures] != [x[0] for x in digests]:
            raise ApkFormatError("v3 digest and signature algorithm lists differ")

        certificates = list(iter_lp32(certificates_blob))
        if not certificates:
            raise ApkFormatError("v3 signer has no certificate")
        certificate = x509.load_der_x509_certificate(certificates[0])
        public_key = serialization.load_der_public_key(public_key_der)
        certificate_public_key_der = certificate.public_key().public_bytes(
            serialization.Encoding.DER,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        if certificate_public_key_der != public_key_der:
            raise ApkFormatError("v3 certificate and signer public keys differ")

        verified_algorithms: list[str] = []
        for (algorithm_id, signature), (_, expected_digest) in zip(signatures, digests):
            hash_algorithm, signature_padding = signature_parameters(algorithm_id)
            if content_digest(data, layout, hash_algorithm) != expected_digest:
                raise ApkFormatError(
                    f"APK v3 content digest mismatch for algorithm 0x{algorithm_id:04x}"
                )
            if isinstance(public_key, rsa.RSAPublicKey):
                public_key.verify(
                    signature, signed_data, signature_padding, hash_algorithm
                )
            elif isinstance(public_key, ec.EllipticCurvePublicKey):
                public_key.verify(signature, signed_data, signature_padding)
            else:
                raise ApkFormatError("Unsupported v3 public key type")
            verified_algorithms.append(f"0x{algorithm_id:04x}")

        signer_results.append(
            {
                "signer": signer_number,
                "subject": certificate.subject.rfc4514_string(),
                "certificate_sha256": certificate.fingerprint(hashes.SHA256()).hex(),
                "min_sdk": outer_min_sdk,
                "max_sdk": outer_max_sdk,
                "algorithms": verified_algorithms,
            }
        )

    return {"verified": True, "scheme": "v3", "signers": signer_results}


def verify_all(data: bytes) -> dict[str, object]:
    return {"v2": verify_v2(data), "v3": verify_v3(data)}


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    sign_parser = subparsers.add_parser("sign")
    sign_parser.add_argument("--input", required=True, type=Path)
    sign_parser.add_argument("--output", required=True, type=Path)
    sign_parser.add_argument("--key", required=True, type=Path)
    sign_parser.add_argument("--cert", required=True, type=Path)

    verify_parser = subparsers.add_parser("verify")
    verify_parser.add_argument("apk", type=Path)

    args = parser.parse_args()
    if args.command == "sign":
        certificate_bytes = args.cert.read_bytes()
        if b"-----BEGIN CERTIFICATE-----" in certificate_bytes:
            certificate = x509.load_pem_x509_certificate(certificate_bytes)
            certificate_der = certificate.public_bytes(serialization.Encoding.DER)
        else:
            certificate_der = certificate_bytes
        signed = build_signing_block(
            args.input.read_bytes(), args.key.read_bytes(), certificate_der
        )
        args.output.write_bytes(signed)
        print(json.dumps(verify_all(signed), indent=2))
    elif args.command == "verify":
        print(json.dumps(verify_all(args.apk.read_bytes()), indent=2))


if __name__ == "__main__":
    main()
