# Angel-OS Physical Booter & Real Hardware OS Installer

The `physical-booter/` toolkit provides genuine multi-language bootloaders, partitioned USB/hard-disk images, and OS installers so **Angel-OS** can be installed onto physical partitions, booted on bare-metal x86/UEFI/BIOS hardware, or launched as a local-account desktop shell.

> **Account Policy:** Angel-OS enforces **Local Account Always** across both virtual and physical installations. User accounts and files reside strictly on the local partition/machine (`C:\Users\<Username>`) without cloud authentication.

---

## Included Tooling

| File | Language | Purpose |
| --- | --- | --- |
| `angel_booter.S` / `angel_booter.bin` | 16-bit x86 Assembly | Assembled 512-byte real-mode bootloader fitting cleanly under 446 bytes before the 64-byte MBR partition table (`0x55AA`) with interactive keyboard boot menu (`[1]` Boot Local OS, `[2]` Probe BIOS & Partitions, `[R]` Reboot). |
| `build_physical_booter.py` | Python 3 | Builds both `ANGELOS_PHYSICAL_BOOT.iso` (ISO-9660 + El Torito x86 bootable CD) and `ANGELOS_USB_DISK.img` (raw partitioned disk image with active MBR table). |
| `install_angelos_linux.sh` | Bash + systemd + GRUB2 | Installs Angel-OS into `/opt/angel-os`, initializes offline local account state in `/var/lib/angel-os/local_accounts.json`, registers a kiosk launcher + systemd service, and writes `/etc/grub.d/42_angel_os`. |
| `Install-AngelOS-Windows.ps1` | PowerShell | Installs Angel-OS onto a chosen drive/partition (`C:\Angel-OS`), provisions a strictly offline Local Account folder, and creates a fullscreen Desktop launcher shortcut. |
| `Flash-AngelOS-USB.bat` | Windows Batch | Interactive CLI wizard for Windows users to generate `.iso` and `.img` images via Python 3. |

---

## Quick Usage

### 1. Build Bootable `.ISO` & Partitioned USB `.IMG`

```bash
python3 physical-booter/build_physical_booter.py --out-dir ./boot-media --user Michael --fs FAT32
```

- **Test in QEMU:**
  ```bash
  qemu-system-x86_64 -cdrom ./boot-media/ANGELOS_PHYSICAL_BOOT.iso
  qemu-system-x86_64 -hda ./boot-media/ANGELOS_USB_DISK.img
  ```
- **Inspect MBR Partition Table on Linux:**
  ```bash
  fdisk -l ./boot-media/ANGELOS_USB_DISK.img
  ```
- **Write to a Real USB Flash Drive (replace `/dev/sdX` carefully):**
  ```bash
  sudo dd if=./boot-media/ANGELOS_USB_DISK.img of=/dev/sdX bs=4M status=progress conv=fsync
  ```
  *(Or select `ANGELOS_USB_DISK.img` / `ANGELOS_PHYSICAL_BOOT.iso` inside Rufus or BalenaEtcher on Windows/macOS.)*

### 2. Re-Assemble the x86 Bootloader From Source (Optional)

```bash
as --32 physical-booter/angel_booter.S -o angel_booter.o
ld -m elf_i386 -Ttext 0x7C00 --oformat binary angel_booter.o -o physical-booter/angel_booter.bin
```
