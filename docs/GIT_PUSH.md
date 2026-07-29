# Pushing this project to Git

## Safe to commit

- `src/`, `server/`, `docs/`, `scripts/`
- `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`
- `startup.sh`, `README.md`, `.env.example`, `.gitignore`
- SQL under `docs/supabase/`

## Never commit

| Path | Why |
|---|---|
| `.env` | Live Stripe / Twilio / Supabase secrets |
| `.deploy/` | DO tokens, SSH private keys, root password |
| `node_modules/` | Reinstall with npm |
| `screenshots/` | Optional local QA |
| Any real `sk_live_` / `sk_test_` / tokens in markdown | Rotate if leaked |

## Commands

```bash
cd /path/to/workspace
git status
git check-ignore -v .env .deploy/   # should be ignored

git add README.md docs/ src/ server/ scripts/ package.json package-lock.json \
  vite.config.ts tsconfig.json startup.sh .env.example .gitignore

git status   # review: no .env, no .deploy

git commit -m "BusyProxy: live deploy docs, proxy access, edge control plane"
git push
```

## After push

1. On DO: rsync or pull (private repo + deploy key), keep `.env` only on server.  
2. `systemctl restart busyproxy`  
3. Confirm https://busyproxy.net from allowlisted IP.

## Docs for reviewers

1. [PROJECT_STATUS.md](./PROJECT_STATUS.md)  
2. [DEPLOY.md](./DEPLOY.md)  
3. [PROXY_ACCESS.md](./PROXY_ACCESS.md)  
4. [PRICING.md](./PRICING.md)  
5. [NETWORK_ARCHITECTURE.md](./NETWORK_ARCHITECTURE.md)  
