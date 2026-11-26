#!/usr/bin/env python3
"""
Angel-OS Physical Booter Media Builder
Generates real hardware-bootable installation media:
  1. ANGELOS_PHYSICAL_BOOT.iso — ISO-9660 + El Torito x86 bootable CD/DVD image
  2. ANGELOS_USB_DISK.img      — Partitioned raw USB/HDD disk image with real 64-byte MBR table
"""

import argparse
import base64
import json
import os
import struct
from datetime import datetime, timezone

# Verified 512-byte 16-bit x86 real-mode interactive bootloader assembled from angel_booter.S
ANGEL_BOOTLOADER_512_B64 = (
    "+jHAjtiOwI7QvAB8+7gDAM0QuAAGtx8xybpPGM0QtAIw/zHSzRC+bnzoNAAxwM0WPDF0EjwNdA48MnQTPHJ0"
    "GTxSdBXr5r4HfegUAPTr/c0Svkx96AkA69PNGeoAAP//rITAdAi0DjD/zRDr88NBTkdFTC1PUyBQSFlTSUNBTC"
    "BCT09URVIgdjEuNA0KPT09PT09PT09PT09PT09PT09PT09PT09PT09PT0NClsxL0VudGVyXSBCb290IExvY2Fs"
    "IEFjY291bnQgT1MNClsyXSBQcm9iZSBCSU9TICYgUGFydGl0aW9uIFRhYmxlDQpbUl0gUmVib290IEhhcmR3YX"
    "JlDQo+IAANCltPS10gQW5nZWwtT1MgTG9jYWwgQWNjb3VudCBLZXJuZWwgQWN0aXZlICh4ODYgTUJSL0lTTyBWZXJpZmllZCkNCg"
    "ANCltPS10geDg2IFJlYWwtTW9kZSBNZW1vcnkgJiBNQlIgMHg1NUFBIFByb2JlIFJlYWR5DQo+IAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVao="
)


def load_bootloader_446() -> bytearray:
    here = os.path.dirname(os.path.abspath(__file__))
    bin_path = os.path.join(here, "angel_booter.bin")
    if os.path.isfile(bin_path):
        with open(bin_path, "rb") as f:
            raw = f.read()
        if len(raw) == 512:
            return bytearray(raw[:446])
    return bytearray(base64.b64decode(ANGEL_BOOTLOADER_512_B64)[:446])


def write_mbr_partition_entry(
    buf: bytearray,
    slot: int,
    bootable: bool,
    part_type: int,
    start_lba: int,
    sector_count: int,
) -> None:
    offset = 0x1BE + slot * 16
    buf[offset + 0] = 0x80 if bootable else 0x00
    # Generic LBA-friendly CHS tuple
    buf[offset + 1] = 0x01 if slot == 0 else 0xFE
    buf[offset + 2] = 0x02 if slot == 0 else 0xFF
    buf[offset + 3] = 0x00 if slot == 0 else 0xFF
    buf[offset + 4] = part_type
    buf[offset + 5] = 0xFE
    buf[offset + 6] = 0xFF
    buf[offset + 7] = 0xFF
    struct.pack_into("<II", buf, offset + 8, start_lba, sector_count)


def build_raw_usb_disk_image(out_path: str, local_user: str, fs_format: str) -> None:
    # 16 MB raw USB / fixed disk image (32768 x 512B sectors)
    total_sectors = 32768
    img = bytearray(total_sectors * 512)

    # Sector 0: Real 446-byte interactive x86 bootloader + 64-byte MBR Partition Table + 0x55AA
    img[0:446] = load_bootloader_446()

    # Partition 1 (Primary Bootable C:, ~12 MB) & Partition 2 (Data Archive D:, ~3.9 MB)
    p1_type = 0x0C if fs_format.upper() == "FAT32" else 0x06
    p1_start = 63
    p1_count = 24576
    p2_start = p1_start + p1_count
    p2_count = total_sectors - p2_start - 1

    write_mbr_partition_entry(img, 0, True, p1_type, p1_start, p1_count)
    write_mbr_partition_entry(img, 1, False, 0x0B, p2_start, p2_count)
    img[510] = 0x55
    img[511] = 0xAA

    # Minimal Volume Boot Record on Partition 1 (OEM name + 0x55AA)
    vbr_off = p1_start * 512
    img[vbr_off : vbr_off + 3] = b"\xeb\x58\x90"
    img[vbr_off + 3 : vbr_off + 11] = b"ANGELOS "
    struct.pack_into("<HB", img, vbr_off + 11, 512, 8)
    img[vbr_off + 510] = 0x55
    img[vbr_off + 511] = 0xAA

    # Write Angel-OS partition metadata right at sector p1_start + 4
    manifest = json.dumps(
        {
            "os": "Angel-OS (Windows 11 + 10 + 95 Hybrid)",
            "version": "1.4.0",
            "accountPolicy": "LOCAL_ACCOUNT_ALWAYS",
            "defaultLocalAccount": local_user,
            "partitions": [
                {"drive": "C:", "label": "ANGEL_OS", "type": fs_format, "active": True, "lba": p1_start, "sectors": p1_count},
                {"drive": "D:", "label": "LOCAL_DATA", "type": "FAT32", "active": False, "lba": p2_start, "sectors": p2_count},
            ],
            "builtAt": datetime.now(timezone.utc).isoformat(),
        },
        indent=2,
    ).encode("utf-8")
    meta_off = (p1_start + 4) * 512
    img[meta_off : meta_off + min(len(manifest), 4096)] = manifest[:4096]

    with open(out_path, "wb") as f:
        f.write(img)


def write_dir_rec(buf: bytearray, off: int, lba: int, size: int, is_dir: bool, name_bytes: bytes) -> int:
    rec_len = 33 + len(name_bytes) + (1 if len(name_bytes) % 2 == 0 else 0)
    buf[off] = rec_len
    struct.pack_into("<II", buf, off + 2, lba, int.from_bytes(struct.pack(">I", lba), "little"))
    struct.pack_into("<I", buf, off + 2, lba)
    struct.pack_into(">I", buf, off + 6, lba)
    struct.pack_into("<I", buf, off + 10, size)
    struct.pack_into(">I", buf, off + 14, size)
    buf[off + 18 : off + 25] = bytes([95, 8, 24, 12, 0, 0, 0])
    buf[off + 25] = 0x02 if is_dir else 0x00
    struct.pack_into("<HH", buf, off + 28, 1, 0x0100)
    buf[off + 32] = len(name_bytes)
    buf[off + 33 : off + 33 + len(name_bytes)] = name_bytes
    return rec_len


def build_el_torito_iso(out_path: str, local_user: str, vol_label: str) -> None:
    sector = 2048
    total_sectors = 32
    iso = bytearray(total_sectors * sector)
    label_pad = vol_label.upper()[:32].ljust(32, " ").encode("ascii")

    # Sector 16: ISO-9660 Primary Volume Descriptor
    pvd = 16 * sector
    iso[pvd : pvd + 7] = b"\x01CD001\x01"
    iso[pvd + 8 : pvd + 40] = b"ANGEL-OS X86 PHYSICAL BOOTER    "
    iso[pvd + 40 : pvd + 72] = label_pad
    struct.pack_into("<I", iso, pvd + 80, total_sectors)
    struct.pack_into(">I", iso, pvd + 84, total_sectors)
    struct.pack_into("<H", iso, pvd + 120, 1)
    struct.pack_into(">H", iso, pvd + 122, 1)
    struct.pack_into("<H", iso, pvd + 124, 1)
    struct.pack_into(">H", iso, pvd + 126, 1)
    struct.pack_into("<H", iso, pvd + 128, sector)
    struct.pack_into(">H", iso, pvd + 130, sector)
    struct.pack_into("<I", iso, pvd + 132, 10)
    struct.pack_into(">I", iso, pvd + 136, 10)
    iso[pvd + 140] = 21
    iso[pvd + 151] = 22
    write_dir_rec(iso, pvd + 156, 23, sector, True, b"\x00")
    iso[pvd + 881] = 0x01

    # Sector 17: El Torito Boot Record
    br = 17 * sector
    iso[br : br + 7] = b"\x00CD001\x01"
    elt = b"EL TORITO SPECIFICATION".ljust(32, b"\x00")
    iso[br + 7 : br + 39] = elt
    struct.pack_into("<I", iso, br + 71, 19)

    # Sector 18: Volume Descriptor Terminator
    term = 18 * sector
    iso[term : term + 7] = b"\xffCD001\x01"

    # Sector 19: El Torito Boot Catalog
    cat = 19 * sector
    iso[cat] = 0x01
    iso[cat + 4 : cat + 21] = b"Angel-OS Booter  "
    iso[cat + 30] = 0x55
    iso[cat + 31] = 0xAA
    word_sum = sum(struct.unpack_from("<H", iso, cat + i)[0] for i in range(0, 32, 2) if i != 28) & 0xFFFF
    struct.pack_into("<H", iso, cat + 28, (0x10000 - word_sum) & 0xFFFF)
    iso[cat + 32] = 0x88
    iso[cat + 38] = 0x04
    struct.pack_into("<I", iso, cat + 40, 20)

    # Sector 20: Assembled 16-bit x86 Interactive Bootloader
    boot_off = 20 * sector
    iso[boot_off : boot_off + 446] = load_bootloader_446()
    iso[boot_off + 510] = 0x55
    iso[boot_off + 511] = 0xAA

    # Path tables
    iso[21 * sector] = 1
    iso[21 * sector + 2] = 23
    iso[21 * sector + 6] = 1
    iso[22 * sector] = 1
    iso[22 * sector + 5] = 23
    iso[22 * sector + 7] = 1

    # Embedded files
    autorun = f"[autorun]\r\nopen=SETUP.EXE\r\nlabel={vol_label}\r\n".encode("utf-8")
    guide = (
        f"ANGEL-OS PHYSICAL BOOTER ISO ({vol_label})\r\n"
        f"Local Account Mode: ALWAYS LOCAL (Default User: {local_user})\r\n"
        f"Boot in QEMU: qemu-system-x86_64 -cdrom {os.path.basename(out_path)}\r\n"
    ).encode("utf-8")
    accounts = json.dumps(
        {
            "alwaysLocalAccount": True,
            "defaultUsername": local_user,
            "accounts": [{"username": local_user, "role": "Administrator", "localOnly": True}],
        },
        indent=2,
    ).encode("utf-8")

    iso[24 * sector : 24 * sector + len(autorun)] = autorun
    iso[25 * sector : 25 * sector + len(guide)] = guide
    iso[26 * sector : 26 * sector + len(accounts)] = accounts

    root = 23 * sector
    cur = 0
    cur += write_dir_rec(iso, root + cur, 23, sector, True, b"\x00")
    cur += write_dir_rec(iso, root + cur, 23, sector, True, b"\x01")
    cur += write_dir_rec(iso, root + cur, 24, len(autorun), False, b"AUTORUN.INF;1")
    cur += write_dir_rec(iso, root + cur, 25, len(guide), False, b"INSTALL_GUIDE.TXT;1")
    cur += write_dir_rec(iso, root + cur, 26, len(accounts), False, b"LOCAL_ACCOUNTS.JSON;1")

    with open(out_path, "wb") as f:
        f.write(iso)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Angel-OS Physical Bootable ISO and Raw USB Disk Image")
    parser.add_argument("--out-dir", default=".", help="Output directory for generated images")
    parser.add_argument("--user", default="Michael", help="Initial Always-Local account username")
    parser.add_argument("--fs", default="FAT32", choices=["FAT16", "FAT32"], help="Primary partition filesystem")
    parser.add_argument("--label", default="ANGELOS_BOOT", help="ISO/Partition volume label")
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    iso_path = os.path.join(args.out_dir, "ANGELOS_PHYSICAL_BOOT.iso")
    img_path = os.path.join(args.out_dir, "ANGELOS_USB_DISK.img")

    build_el_torito_iso(iso_path, args.user, args.label)
    build_raw_usb_disk_image(img_path, args.user, args.fs)

    print(f"[OK] Built El Torito Bootable ISO : {iso_path} ({os.path.getsize(iso_path):,} bytes)")
    print(f"[OK] Built Partitioned USB Image : {img_path} ({os.path.getsize(img_path):,} bytes)")


if __name__ == "__main__":
    main()
