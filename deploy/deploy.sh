#!/usr/bin/env bash
#
# Build tarot.trackr.live here, rsync it to the DreamHost VPS, restart it.
#
#   ./deploy/deploy.sh --install-key   one-time: put your SSH key on the server
#   ./deploy/deploy.sh --setup         one-time: create the app dir, server .env, cron keepalive
#   ./deploy/deploy.sh --dry-run       show what would change, transfer nothing
#   ./deploy/deploy.sh                 build, upload, restart, verify
#   ./deploy/deploy.sh --no-build      upload the build/ that is already there
#
# Unlike the static trackr sites this is a running Node server (SvelteKit
# adapter-node), kept alive by PM2. It listens on 127.0.0.1:$TAROT_PORT
# (default 8010) and DreamHost's proxy maps https://tarot.trackr.live to it.
# build/ is self-contained (no runtime dependencies); PM2 is the only thing
# the server needs installed.
#
# Settings come from .env.local (gitignored):
#
#   DREAMHOST_USER=dh_xxxxxx
#   DREAMHOST_PASS=...              # only used by --install-key
#   DREAMHOST_HOST=...              # optional, default below
#   TAROT_PORT=8010                 # optional; must match the panel's proxy
#
# The TypeSafe key lives only on the server, in ~/tarot.trackr.live/app/.env,
# written once by --setup from this repo's .env. Deploys never copy it.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"

DEFAULT_HOST="vps30818.dreamhostps.com"
DOMAIN="tarot.trackr.live"
SSH_KEY="${HOME}/.ssh/id_ed25519_dreamhost"

BUILD=1 DRY_RUN=0 INSTALL_KEY=0 SETUP=0
for arg in "$@"; do
	case "$arg" in
	--no-build) BUILD=0 ;;
	--dry-run) DRY_RUN=1 ;;
	--install-key) INSTALL_KEY=1 ;;
	--setup) SETUP=1 ;;
	-h | --help) sed -n '3,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
	*) echo "unknown flag: $arg" >&2; exit 2 ;;
	esac
done

die() { echo "error: $*" >&2; exit 1; }

[[ -f .env.local ]] || die ".env.local not found. See the header of this script."
# shellcheck disable=SC1091
set -a; source .env.local; set +a

: "${DREAMHOST_USER:?DREAMHOST_USER is not set in .env.local}"
HOST="${DREAMHOST_HOST:-$DEFAULT_HOST}"
PORT="${TAROT_PORT:-8010}"
TARGET="${DREAMHOST_USER}@${HOST}"
SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10 "$TARGET")
# Login shell, so PM2 and Node from the user's profile (npm prefix, nvm) are on PATH.
remote() { "${SSH[@]}" "bash -lc $(printf '%q' "$1")"; }

# ------------------------------------------------------------- one-time: key

if [[ $INSTALL_KEY -eq 1 ]]; then
	: "${DREAMHOST_PASS:?DREAMHOST_PASS is not set in .env.local}"
	[[ -f "${SSH_KEY}.pub" ]] || die "no public key at ${SSH_KEY}.pub"
	command -v sshpass >/dev/null || die "sshpass is not installed"
	SSHPASS="$DREAMHOST_PASS" sshpass -e \
		ssh-copy-id -i "${SSH_KEY}.pub" -o StrictHostKeyChecking=accept-new "$TARGET"
	"${SSH[@]}" true && echo "Key auth works. You can delete DREAMHOST_PASS from .env.local now."
	exit 0
fi

"${SSH[@]}" true 2>/dev/null || die "cannot reach ${TARGET} with key auth. Run: $0 --install-key"

# Everything lives in ~/tarot.trackr.live/app, outside any web root.
APP='$HOME/'"${DOMAIN}/app"

# ------------------------------------------------------------ one-time: setup

if [[ $SETUP -eq 1 ]]; then
	KEY_LINE="$(grep -E '^TYPESAFE_API_KEY=' .env 2>/dev/null || true)"
	[[ -n "$KEY_LINE" ]] || die "no TYPESAFE_API_KEY in this repo's .env to copy to the server"
	remote "command -v pm2 >/dev/null" \
		|| die "pm2 is not on the server's PATH. On the VPS run: npm install -g pm2 (see DEPLOY.md)"
	remote "mkdir -p ${APP}/build ${APP}/logs ${APP}/data && chmod 700 ${APP}"
	# The key goes over ssh stdin, never as an argument, so it never appears in
	# a process list on either machine.
	printf '%s\n' "$KEY_LINE" | "${SSH[@]}" "umask 077; cat > ${APP}/.env"
	# Log rotation (idempotent) and resurrect-at-boot without needing root.
	remote "pm2 describe pm2-logrotate >/dev/null 2>&1 || pm2 install pm2-logrotate"
	remote "( crontab -l 2>/dev/null | grep -v 'pm2 resurrect' ;
		echo '@reboot bash -lc \"pm2 resurrect\"' ) | crontab -"
	echo "Setup done. Deploy next, then in the DreamHost panel proxy ${DOMAIN} to port ${PORT}."
	exit 0
fi

# ------------------------------------------------------------------- build

if [[ $BUILD -eq 1 ]]; then
	echo "Building ..."
	npm run build
else
	[[ -f build/index.js ]] || die "no build/index.js and --no-build was given"
	if [[ -n "$(find src content static -newer build/index.js -print -quit 2>/dev/null)" ]]; then
		die "build/ is older than the sources. Drop --no-build."
	fi
fi
[[ -f build/index.js ]] || die "build produced no build/index.js"

# ------------------------------------------------------------------ transfer

RSYNC_FLAGS=(-az --delete --human-readable --stats --chmod=D755,F644)
[[ $DRY_RUN -eq 1 ]] && RSYNC_FLAGS+=(--dry-run --itemize-changes)

echo "  from  ${ROOT}/build/"
echo "  to    ${TARGET}:~/${DOMAIN}/app/build/"
rsync "${RSYNC_FLAGS[@]}" -e "ssh -i ${SSH_KEY}" ./build/ "${TARGET}:${DOMAIN}/app/build/"
rsync -az --chmod=F600 -e "ssh -i ${SSH_KEY}" deploy/ecosystem.config.cjs "${TARGET}:${DOMAIN}/app/ecosystem.config.cjs" \
	$([[ $DRY_RUN -eq 1 ]] && echo --dry-run)

if [[ $DRY_RUN -eq 1 ]]; then
	echo "Dry run complete."
	exit 0
fi

# ------------------------------------------------------------ restart, verify

# Start or reload with the new build, then save so `pm2 resurrect` at boot
# brings back this exact process list.
remote "cd ${APP} && TAROT_PORT=${PORT} pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save"

URL="https://${DOMAIN}/"
for _ in 1 2 3 4 5; do
	CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$URL" 2>/dev/null || echo 000)"
	[[ "$CODE" == "200" ]] && break
	sleep 2
done
if [[ "$CODE" == "200" ]]; then
	SPREADS="$(curl -sS --max-time 15 "${URL}api/spreads" | head -c 40)"
	echo "Deployed. ${URL} -> 200; /api/spreads -> ${SPREADS}..."
	exit 0
fi
echo "Deployed, but ${URL} returned ${CODE}. Check: pm2 logs tarot (on the server)." >&2
exit 1
