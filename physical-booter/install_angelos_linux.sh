#!/usr/bin/env bash
# Angel-OS Bare-Metal Linux & Dual-Boot GRUB2 Physical Installer
# Installs Angel-OS into a dedicated OS folder (/opt/angel-os), provisions a strictly
# offline Local Account profile (/var/lib/angel-os), creates a Chromium Kiosk session,
# and optionally registers a physical GRUB2 boot menu option.
set -euo pipefail

LOCAL_USER="${ANGELOS_USER:-Michael}"
TARGET_DIR="${ANGELOS_DIR:-/opt/angel-os}"
STATE_DIR="/var/lib/angel-os"
WEB_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "================================================================"
echo "  ANGEL-OS PHYSICAL OS INSTALLER (Linux / GRUB2 / Local Account)"
echo "================================================================"
echo "  Target System Directory : $TARGET_DIR"
echo "  Local Account Policy    : LOCAL ACCOUNT ALWAYS (Offline Only)"
echo "  Primary Local Username  : $LOCAL_USER"
echo ""

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "[!] Run with sudo to install system-wide to $TARGET_DIR and configure GRUB2/systemd:"
  echo "    sudo ANGELOS_USER=\"$LOCAL_USER\" $0"
  exit 1
fi

mkdir -p "$TARGET_DIR" "$STATE_DIR"

# 1. Build or copy prebuilt offline web shell
if [ -f "$WEB_SRC_DIR/dist/index.html" ]; then
  cp -r "$WEB_SRC_DIR/dist/"* "$TARGET_DIR/"
elif [ -f "$WEB_SRC_DIR/index.html" ] && [ -d "$WEB_SRC_DIR/assets" ]; then
  cp -r "$WEB_SRC_DIR/"* "$TARGET_DIR/"
elif command -v npm >/dev/null 2>&1 && [ -f "$WEB_SRC_DIR/package.json" ]; then
  echo "[*] Building Angel-OS offline bundle..."
  (cd "$WEB_SRC_DIR" && VITE_BASE=./ npm run build)
  cp -r "$WEB_SRC_DIR/dist/"* "$TARGET_DIR/"
else
  echo "[!] Could not locate built Angel-OS bundle (dist/ or assets/). Run VITE_BASE=./ npm run build first."
  exit 1
fi

# 2. Initialize strictly Local Account configuration (Zero cloud auth)
cat > "$STATE_DIR/local_accounts.json" <<EOF
{
  "accountPolicy": "LOCAL_ACCOUNT_ALWAYS",
  "activeLocalAccount": "$LOCAL_USER",
  "accounts": [
    {
      "username": "$LOCAL_USER",
      "role": "Administrator",
      "localOnly": true,
      "homeDir": "C:\\\\Users\\\\$LOCAL_USER"
    }
  ]
}
EOF

# 3. Create kiosk launcher binary (/usr/local/bin/angel-os-boot)
cat > /usr/local/bin/angel-os-boot <<'LAUNCHER'
#!/usr/bin/env bash
PORT=4195
DIR="/opt/angel-os"
python3 -m http.server "$PORT" --directory "$DIR" >/tmp/angelos-http.log 2>&1 &
HTTP_PID=$!
trap "kill $HTTP_PID 2>/dev/null || true" EXIT
sleep 0.6
BROWSER=""
for bin in google-chrome chromium chromium-browser microsoft-edge; do
  if command -v "$bin" >/dev/null 2>&1; then
    BROWSER="$bin"
    break
  fi
done
if [ -n "$BROWSER" ]; then
  "$BROWSER" --kiosk --no-first-run --app="http://127.0.0.1:$PORT"
else
  echo "Angel-OS running at http://127.0.0.1:$PORT (Press Ctrl+C to stop)"
  wait "$HTTP_PID"
fi
LAUNCHER
chmod +x /usr/local/bin/angel-os-boot

# 4. Install optional Desktop Entry
mkdir -p /usr/share/applications
cat > /usr/share/applications/angel-os.desktop <<EOF
[Desktop Entry]
Name=Angel-OS (Windows 11+10 Hybrid)
Comment=Boot Angel-OS Shell (Local Account Always)
Exec=/usr/local/bin/angel-os-boot
Terminal=false
Type=Application
Categories=System;
EOF

# 5. Add systemd kiosk service for dedicated boot appliances
cat > /etc/systemd/system/angel-os-kiosk.service <<EOF
[Unit]
Description=Angel-OS Physical Shell Service (Local Account Always)
After=network.target graphical.target

[Service]
Type=simple
ExecStart=/usr/local/bin/angel-os-boot
Restart=on-failure

[Install]
WantedBy=graphical.target
EOF

# 6. Register GRUB2 custom menu entry if update-grub exists
if [ -d /etc/grub.d ]; then
  cat > /etc/grub.d/42_angel_os <<'GRUBEOF'
#!/bin/sh
exec tail -n +3 $0
menuentry "Angel-OS (Windows 11+10 Hybrid — Local Account Boot)" {
  linux /boot/vmlinuz-angelos root=UUID=angelos ro systemd.unit=angel-os-kiosk.service
  initrd /boot/initrd.img-angelos
}
GRUBEOF
  chmod +x /etc/grub.d/42_angel_os
  echo "[*] Registered GRUB2 boot template (/etc/grub.d/42_angel_os)."
fi

echo ""
echo "[OK] Angel-OS installed physically to $TARGET_DIR!"
echo "     Run 'angel-os-boot' anytime, or launch 'Angel-OS' from your system app menu."
