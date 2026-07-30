#!/usr/bin/env bash
# Build Fastlane/supply metadata + images for Google Play (en-US).
# Run from repo root or android/:
#   ./android/scripts/prepare-play-assets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
META="$ROOT/android/fastlane/metadata/android/en-US"
IMG="$META/images"
PHONE="$IMG/phoneScreenshots"
BRAND="$ROOT/public/brand"
APP_SHOTS="$ROOT/public/app"

mkdir -p "$META/changelogs" "$PHONE"

# --- Text metadata ---
printf '%s\n' 'BusyProxy' >"$META/title.txt"
printf '%s\n' 'Earn by sharing spare Wi‑Fi or mobile data. Transparent pay per GB.' \
  >"$META/short_description.txt"
cat >"$META/full_description.txt" <<'EOF'
BusyProxy turns spare internet capacity on your phone into earnings.

HOW IT WORKS
• Sign in with your phone number (SMS one-time code)
• Read the short disclosure and start sharing when you choose
• Authorized BusyProxy clients may route traffic through your selected network
• You earn per gigabyte shared — rates are shown clearly in the app
• Stop anytime from the app or the ongoing notification

RATES (subject to change; always shown in-app)
• Wi‑Fi: $0.20 per GB
• Mobile data: $0.12 per GB
• Cash out from $20 via Stripe when available

YOU STAY IN CONTROL
• Sharing is always opt-in — never automatic without your action
• Choose Automatic, Wi‑Fi only, or Mobile only
• Foreground notification while a session is active
• No proxy passwords shown to earners (operators manage access separately)

PRIVACY & ACCOUNT
• We do not log the content of traffic that exits through your phone
• Delete your account anytime in the app, on the web dashboard, or at
  https://busyproxy.net/account-deletion
• Privacy Policy: https://busyproxy.net/privacy
• Terms: https://busyproxy.net/terms
• Support: support@busyproxy.net

REQUIREMENTS
• Android 8.0+
• Internet connection
• For mobile sharing: a plan that allows the use you select

BusyProxy is for legitimate bandwidth sharing only. Abuse, fraud, and illegal
use are prohibited.
EOF

printf '%s\n' 'https://busyproxy.net' >"$META/website.txt" 2>/dev/null || true
# supply uses these optional contact files in some versions:
printf '%s\n' 'support@busyproxy.net' >"$META/contactEmail.txt" || true
printf '%s\n' 'https://busyproxy.net/privacy' >"$META/privacy_url.txt" || true

cat >"$META/changelogs/1.txt" <<'EOF'
First Play release of BusyProxy.

• Share Wi‑Fi or mobile bandwidth and earn per GB
• Phone OTP sign-in, clear rates, stop anytime
• Stripe withdrawals when you reach the minimum
• Privacy-first earner app — no proxy credentials in the UI
EOF

# --- Icon 512×512 (no transparency preferred for Play high-res icon) ---
python3 <<PY
from PIL import Image
from pathlib import Path
root = Path("$ROOT")
src = root / "public/brand/icon-1024.png"
if not src.exists():
    src = root / "public/brand/icon-master.png"
im = Image.open(src).convert("RGBA")
# Flatten onto dark brand background (Play high-res icon should be opaque)
bg = Image.new("RGBA", im.size, (7, 9, 14, 255))
bg.paste(im, mask=im.split()[-1] if im.mode == "RGBA" else None)
out = bg.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
out_path = root / "android/fastlane/metadata/android/en-US/images/icon.png"
out_path.parent.mkdir(parents=True, exist_ok=True)
out.save(out_path, "PNG")
print("icon", out_path, out.size)
PY

# --- Feature graphic 1024×500 ---
python3 <<PY
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root = Path("$ROOT")
W, H = 1024, 500
# Dark gradient-ish base
img = Image.new("RGB", (W, H), (7, 9, 14))
draw = ImageDraw.Draw(img)
# accent bar
for y in range(H):
    t = y / H
    r = int(7 + (37 - 7) * t * 0.3)
    g = int(9 + (99 - 9) * t * 0.15)
    b = int(14 + (235 - 14) * t * 0.25)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# logo
logo_src = root / "public/brand/icon-1024.png"
if logo_src.exists():
    logo = Image.open(logo_src).convert("RGBA")
    logo = logo.resize((220, 220), Image.Resampling.LANCZOS)
    img.paste(logo, (72, (H - 220) // 2), logo)

# text
try:
    font_lg = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 64)
    font_sm = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 32)
except Exception:
    font_lg = ImageFont.load_default()
    font_sm = font_lg

draw = ImageDraw.Draw(img)
draw.text((340, 160), "BusyProxy", fill=(255, 255, 255), font=font_lg)
draw.text((340, 250), "Share bandwidth. Get paid per GB.", fill=(160, 175, 200), font=font_sm)
out = root / "android/fastlane/metadata/android/en-US/images/featureGraphic.png"
img.save(out, "PNG")
print("featureGraphic", out, img.size)
PY

# --- Phone screenshots (use real product captures; normalize to 1080-wide) ---
# Order for store listing
SHOTS=(
  "02-home.png:01-home.png"
  "03-sharing.png:02-sharing.png"
  "04-agent-traffic.png:03-agent.png"
  "00-consent.png:04-consent.png"
  "01-login.png:05-login.png"
  "06-account.png:06-account.png"
  "05-oneplus-sharing.png:07-oneplus.png"
)

i=0
for entry in "${SHOTS[@]}"; do
  src_name="${entry%%:*}"
  dst_name="${entry##*:}"
  src="$APP_SHOTS/$src_name"
  if [[ ! -f "$src" ]]; then
    echo "skip missing $src"
    continue
  fi
  i=$((i + 1))
  dst="$PHONE/$dst_name"
  python3 - <<PY
from PIL import Image
from pathlib import Path
src = Path("$src")
dst = Path("$dst")
im = Image.open(src).convert("RGB")
# Play: max dimension 3840; keep portrait phone ratio, target width 1080
w, h = im.size
target_w = 1080
if w != target_w:
    target_h = int(h * (target_w / w))
    im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
im.save(dst, "PNG", optimize=True)
print("shot", dst.name, im.size)
PY
done

# Copy assets into google-play/assets for humans
OUT_ASSETS="$ROOT/google-play/assets"
mkdir -p "$OUT_ASSETS/phoneScreenshots"
cp -f "$IMG/icon.png" "$OUT_ASSETS/icon-512.png"
cp -f "$IMG/featureGraphic.png" "$OUT_ASSETS/featureGraphic-1024x500.png"
cp -f "$PHONE"/* "$OUT_ASSETS/phoneScreenshots/" 2>/dev/null || true

echo ""
echo "✓ Play assets ready"
echo "  metadata: $META"
echo "  icon:     $IMG/icon.png"
echo "  feature:  $IMG/featureGraphic.png"
echo "  phones:   $PHONE ($(ls -1 "$PHONE" | wc -l | tr -d ' ') files)"
ls -la "$IMG" "$PHONE"
