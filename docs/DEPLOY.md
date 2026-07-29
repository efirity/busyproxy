# Deploy BusyProxy to DigitalOcean (`busyproxy.net`)

## Target

| Item | Value |
|---|---|
| Droplet **name** | **`busyproxy`** (always — never random `t` / `x`) |
| Droplet ID | `588571657` |
| Region | Frankfurt (`fra1`) |
| Public IP | **`46.101.114.84`** |
| DNS | `@`, `www`, `app`, `portal` → `46.101.114.84` |
| Allowlist (intended) | **89.28.43.197/32** only for 22/80/443 |

## Naming rule

Any droplet created for this project **must** be named exactly:

```text
busyproxy
```

If a second machine is needed later: `busyproxy-edge-1`, `busyproxy-db`, etc. — always `busyproxy` prefix. Never leave default names like `t` or `ubuntu-s-1vcpu…`.

## Why deploy was blocked from the agent

The DigitalOcean API token can manage DNS and **rename** droplets, but **cannot** inject SSH keys or reset root password. The droplet only accepts SSH keys we do not have on the machine yet.

## Option A — 60 seconds (Recovery Console) then agent finishes

1. DigitalOcean → Droplet **`busyproxy`** → **Access** → **Launch Recovery Console**.
2. Log in as `root`.
3. Paste:

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL8vhM7p4PDlrLkMRJIgKy3Y/bv3G+b3yiPJ18E5W4z+ relay-deploy@sandbox' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
ufw allow OpenSSH || true
echo OK_KEY_INSTALLED
```

4. Reply in chat: **“key installed”** — agent will rsync the app, install Node 22, configure nginx + UFW allowlist for `89.28.43.197`, start the process.

## Option B — Full-write DO token

Create a PAT with **Write** on Droplets, Firewalls, SSH keys, Domains. Agent will:

1. Ensure droplet is named **`busyproxy`** with cloud-init SSH key + UFW allowlist  
2. Deploy app  
3. Attach cloud firewall: only `89.28.43.197` on 22/80/443  
4. Verify `http://busyproxy.net`

## Server install

Once files are on the host: `scripts/install-server.sh`  
App path: `/opt/busyproxy`

### UFW allowlist (your IP only)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow from 89.28.43.197 to any port 22,80,443 proto tcp
ufw --force enable
```

## DNS checklist

```text
busyproxy.net        A   46.101.114.84
www.busyproxy.net    A   46.101.114.84
app.busyproxy.net    A   46.101.114.84
portal.busyproxy.net A   46.101.114.84
```

## HTTPS note

With IP allowlist only, Let’s Encrypt HTTP-01 cannot validate from the public internet. Use HTTP for private preview, or DNS-01 later.
