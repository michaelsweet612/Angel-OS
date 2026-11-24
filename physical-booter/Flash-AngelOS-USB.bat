@ECHO OFF
TITLE Angel-OS Physical Booter Media Creator
ECHO ==============================================================
ECHO   ANGEL-OS PHYSICAL BOOTER (.ISO & Raw USB Disk .IMG)
ECHO ==============================================================
ECHO.
SET /P LOCALUSER="Enter Default Local Account Name (Default: Michael): "
IF "%LOCALUSER%"=="" SET LOCALUSER=Michael
ECHO [1] Building ANGELOS_PHYSICAL_BOOT.iso & ANGELOS_USB_DISK.img for Local Account "%LOCALUSER%"...
python "%~dp0build_physical_booter.py" --out-dir "%~dp0out" --user "%LOCALUSER%" --fs FAT32
IF ERRORLEVEL 1 (
  ECHO [!] Python 3 is required to generate raw images from CLI.
  PAUSE
  EXIT /B 1
)
ECHO.
ECHO [OK] Built bootable images inside "%~dp0out\":
ECHO   - ANGELOS_PHYSICAL_BOOT.iso : Burn to CD/DVD or boot in VirtualBox / QEMU
ECHO   - ANGELOS_USB_DISK.img      : Flash onto a USB Drive using Rufus or BalenaEtcher
ECHO.
PAUSE
