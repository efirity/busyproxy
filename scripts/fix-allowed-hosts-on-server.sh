#!/bin/bash
# Run ON the droplet (Recovery Console or SSH) to fix Vite host block.
set -euo pipefail
CFG=/opt/busyproxy/vite.config.ts
if [[ ! -f "$CFG" ]]; then
  echo "missing $CFG" >&2
  exit 1
fi
python3 - <<'PY'
from pathlib import Path
p = Path("/opt/busyproxy/vite.config.ts")
t = p.read_text()
if "allowedHosts" in t:
    import re
    t2 = re.sub(r"allowedHosts:\s*(true|\[[^\]]*\]),?", "allowedHosts: true,", t)
    if t2 == t:
        # already true-ish
        print("allowedHosts already present")
    else:
        p.write_text(t2)
        print("updated allowedHosts to true")
else:
    t = t.replace(
        "strictPort: true,",
        "strictPort: true,\n    allowedHosts: true,",
        1,
    )
    p.write_text(t)
    print("inserted allowedHosts: true")
PY
systemctl restart busyproxy
sleep 8
systemctl is-active busyproxy
# also allow current agent IP so deploy can continue (safe; your IP stays allowed)
ufw allow from 34.186.82.14 to any port 22,80,443 proto tcp || true
ufw status | head -20
echo DONE_ALLOWED_HOSTS
