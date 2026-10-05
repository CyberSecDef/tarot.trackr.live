# Deploying to DreamHost

The site is a Node server (SvelteKit `adapter-node`) on the trackr VPS
(`vps30818.dreamhostps.com`, Node 24). It listens on `127.0.0.1:3417`, and
DreamHost's proxy maps `https://tarot.trackr.live` to it. The build happens
here; `build/` has no runtime dependencies, so nothing is installed there.

## Once

1. **`.env.local`** in the repo root (gitignored):

   ```sh
   DREAMHOST_USER=dh_xxxxxx
   DREAMHOST_PASS=...      # only read by --install-key; delete afterwards
   # TAROT_PORT=3417       # if 3417 is taken on the VPS
   ```

2. **DNS and domain**: in the DreamHost panel, add `tarot.trackr.live` with an
   A record to the VPS (the other trackr sites use `208.97.156.39`).
3. **Key and server setup**:

   ```bash
   ./deploy/deploy.sh --install-key   # same key the other trackr sites use
   ./deploy/deploy.sh --setup         # app dir, server .env with the TypeSafe key, cron keepalive
   ```

4. **Proxy**: in the panel, under Servers → Proxy, map `tarot.trackr.live` to
   port `3417`.
5. **HTTPS**: enable the free Let's Encrypt certificate once DNS resolves.

## Every time

```bash
./deploy/deploy.sh --dry-run
./deploy/deploy.sh
```

It builds, rsyncs `build/` to `~/tarot.trackr.live/app/build/`, restarts the
process, and checks that the site and `/api/spreads` answer.

## On the server

`~/tarot.trackr.live/app/run.sh status|start|stop|restart`. Logs are in
`~/tarot.trackr.live/app/logs/server.log`. Cron restarts the process within
five minutes if it dies, and starts it at boot.

The server's `.env` holds only `TYPESAFE_API_KEY`, mode 600. Deploys never
touch it. To rotate the key, edit it there and run `run.sh restart`.

`run.sh` sets `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1`: behind the
proxy every request arrives from `127.0.0.1`, so without them the
10-per-minute rate limit would be shared by every visitor.
