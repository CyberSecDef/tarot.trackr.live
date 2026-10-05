# Deploying to DreamHost

The site is a Node server (SvelteKit `adapter-node`) on the trackr VPS
(`vps30818.dreamhostps.com`, Node 24), kept running by **PM2**. It listens on
`208.97.156.39:8010`, and DreamHost's proxy maps `https://tarot.trackr.live` to it.
The build happens here; `build/` has no runtime dependencies, so PM2 is the
only thing the server needs.

## Once

1. **PM2 on the VPS** (as the site's DreamHost user):

   ```bash
   npm install -g pm2      # if that fails with EACCES:
   #   npm config set prefix ~/.npm-global
   #   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bash_profile && source ~/.bash_profile
   #   npm install -g pm2
   pm2 --version
   ```

2. **`.env.local`** in this repo (gitignored):

   ```sh
   DREAMHOST_USER=dh_xxxxxx
   DREAMHOST_PASS=...      # only read by --install-key; delete afterwards
   # TAROT_PORT=8010       # change only if 8010 is taken on the VPS
   ```

3. **DNS and domain**: add `tarot.trackr.live` in the DreamHost panel, with an
   A record to the VPS (the other trackr sites use `208.97.156.39`).
4. **Key and server setup**:

   ```bash
   ./deploy/deploy.sh --install-key   # same key the other trackr sites use
   ./deploy/deploy.sh --setup         # app dir, server .env, pm2-logrotate, @reboot resurrect
   ./deploy/deploy.sh                 # first deploy starts the PM2 process
   ```

5. **Proxy**: in the panel, under Servers → Proxy, map `tarot.trackr.live` to
   port `8010`.
6. **HTTPS**: enable the free Let's Encrypt certificate once DNS resolves.

## Every time

```bash
./deploy/deploy.sh --dry-run
./deploy/deploy.sh
```

It builds, rsyncs `build/` and `ecosystem.config.cjs` to
`~/tarot.trackr.live/app/`, runs `pm2 startOrReload` and `pm2 save`, then checks
that the site and `/api/spreads` answer.

## On the server

```bash
pm2 status                 # is it up, how many restarts
pm2 logs tarot             # live logs (also in ~/tarot.trackr.live/app/logs/)
pm2 restart tarot --update-env
```

PM2 restarts the process if it crashes (with backoff) or grows past 300 MB.
`pm2-logrotate` keeps the logs bounded. A crontab line, `@reboot pm2
resurrect`, brings the saved process list back after a reboot; this needs no
root. If you do have sudo on the VPS, `pm2 startup` (systemd) is the
alternative.

The server's `.env` holds only `TYPESAFE_API_KEY`, mode 600, and deploys never
touch it. Node reads it through `--env-file`, so it never appears in PM2's
saved state or in `pm2 show`. To rotate the key, edit that file and run
`pm2 restart tarot`.

**Why the app listens on the public IP.** DreamHost's proxy connects to the
site's IP (`208.97.156.39`), not to `localhost`; with the app on `127.0.0.1`
the site returns 503 (the domain's `~/logs/tarot.trackr.live/https/error.log`
shows `attempt to connect to 208.97.156.39:8010 ... failed`). Listening there
also exposes port 8010 to the internet, so `src/hooks.server.ts` checks the
TCP peer of every connection against `TRUSTED_PROXIES` and answers 404 to
anything that isn't the proxy. It checks the socket, not a header, so it
can't be spoofed. Each deploy confirms `http://tarot.trackr.live:8010/` is
refused. If DreamHost ever moves the site's IP, set `TAROT_HOST` and
`TAROT_TRUSTED_PROXIES` in `.env.local` and redeploy.

The ecosystem file sets `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1`:
every request arrives from the proxy, so without them the 10-per-minute rate
limit would be shared by every visitor.

## Jev spend ceiling

Every Jev call reserves its worst-case cost before it is sent and is refused
if that could cross **$10 per UTC month** or **$1 per UTC day**. Refused calls
never reach TypeSafe, and the reading falls back to the untailored version, so
the site keeps working. Spend is recorded from each response's real token
usage in `~/tarot.trackr.live/app/data/jev-usage.json`, which deploys leave
alone. The log notes 50%, 80% and 95% of the month.

Change the caps or prices with `JEV_MONTHLY_BUDGET_USD`, `JEV_DAILY_BUDGET_USD`,
`JEV_PRICE_INPUT_PER_MTOK` and `JEV_PRICE_OUTPUT_PER_MTOK` in the server's
`.env`, then `pm2 restart tarot`. If TypeSafe changes its prices, update them:
the ceiling is only as accurate as the prices it multiplies by.

This counts only this app's calls. Give the site its own TypeSafe key so
nothing else draws on the same account.
