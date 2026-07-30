#!/usr/bin/env bash
# Print SPKI certificate pins for OkHttp CertificatePinner.
# Use after Let's Encrypt intermediate/root changes (leaf renew alone is fine).
#
#   ./android/scripts/print-ssl-pins.sh
#   ./android/scripts/print-ssl-pins.sh busyproxy.net
#
# Compare output to pins in:
#   app/src/main/java/net/busyproxy/app/network/SecureOkHttp.kt
set -euo pipefail

HOST="${1:-busyproxy.net}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Connecting to $HOST:443 …"
echo | openssl s_client -connect "$HOST:443" -servername "$HOST" -showcerts 2>/dev/null \
  | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{print}' >"$TMP/chain.pem"

i=0
c=0
while openssl x509 -out "$TMP/c$i.pem" 2>/dev/null; do
  :
done < /dev/null

# Split with csplit/awk
python3 - "$TMP" <<'PY'
import re, sys, subprocess, hashlib, base64, pathlib
tmp = pathlib.Path(sys.argv[1])
raw = (tmp / "chain.pem").read_text()
certs = re.findall(r"-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----", raw, re.S)
print(f"\n# Chain for host ({len(certs)} certs)\n")
for i, c in enumerate(certs):
    p = tmp / f"cert{i}.pem"
    p.write_text(c + "\n")
    meta = subprocess.check_output(
        ["openssl", "x509", "-in", str(p), "-noout", "-subject", "-issuer", "-enddate"],
        text=True,
    )
    der = subprocess.check_output(["openssl", "x509", "-in", str(p), "-pubkey", "-noout"])
    spki = subprocess.check_output(["openssl", "pkey", "-pubin", "-outform", "DER"], input=der)
    pin = base64.b64encode(hashlib.sha256(spki).digest()).decode()
    print(f"# cert[{i}]")
    for line in meta.strip().splitlines():
        print(f"# {line}")
    print(f'"sha256/{pin}",')
    print()
print("# Copy any NEW intermediate/root pins into SecureOkHttp.kt")
print("# Leaf-only changes after renew do NOT require an app update if intermediate/root pins remain.")
PY
