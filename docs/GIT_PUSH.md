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
| `.deploy/` | DO tokens, SSH private keys |
| `node_modules/` | Reinstall with npm |
| `screenshots/` | Optional local QA |
| Any `sk_live_`, `sk_test_` pasted into md | Rotate if leaked |

## Commands

```bash
cd /path/to/workspace
git init   # if new
git remote add origin git@github.com:YOU/busyproxy.git

git add -A
git status   # review: no .env

git commit -m "feat: BusyProxy platform — marketing, OTP, Stripe, edge control plane"
git branch -M main
git push -u origin main
```

## After push

1. Set GitHub Actions secrets if you add CI (do not put production service role in PR logs).  
2. On DO: clone private repo with deploy key, copy `.env` manually onto the server.  
3. Run `scripts/install-server.sh`.

## Docs map for reviewers

1. Start: `README.md`  
2. Status: `docs/PROJECT_STATUS.md`  
3. Pricing: `docs/PRICING.md`  
4. Network: `docs/NETWORK_ARCHITECTURE.md`  
5. Deploy: `docs/DEPLOY.md`  
6. Spec: `docs/SYSTEM_SPEC.md`
