#!/usr/bin/env bash
#
# Runs on the server, from ~/tarot.trackr.live/app/.
#
#   run.sh start     start if not running
#   run.sh stop      stop if running
#   run.sh restart   stop, then start
#   run.sh ensure    start only if it has died (cron calls this every 5 min)
#   run.sh status    say whether it is running
set -euo pipefail

APP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$APP/server.pid"
LOG="$APP/logs/server.log"
PORT="${TAROT_PORT:-3417}"

running() { [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

start() {
	running && return 0
	mkdir -p "$APP/logs"
	# Keep the log bounded without needing logrotate.
	if [[ -f "$LOG" && $(stat -c %s "$LOG") -gt 5000000 ]]; then mv "$LOG" "$LOG.1"; fi
	(
		cd "$APP"
		set -a
		# shellcheck disable=SC1091
		source "$APP/.env"
		set +a
		# Bound to localhost; DreamHost's proxy is the only way in. Behind the
		# proxy every request comes from 127.0.0.1, so the real client address
		# (for rate limiting) is the last X-Forwarded-For hop.
		HOST=127.0.0.1 PORT="$PORT" ORIGIN="https://tarot.trackr.live" \
			ADDRESS_HEADER=X-Forwarded-For XFF_DEPTH=1 NODE_ENV=production \
			nohup node build/index.js >>"$LOG" 2>&1 &
		echo $! >"$PIDFILE"
	)
	sleep 1
	running && echo "started (pid $(cat "$PIDFILE"), port $PORT)" || { echo "failed to start; see $LOG" >&2; exit 1; }
}

stop() {
	if running; then
		kill "$(cat "$PIDFILE")"
		for _ in 1 2 3 4 5 6 7 8 9 10; do running || break; sleep 0.5; done
		running && kill -9 "$(cat "$PIDFILE")"
	fi
	rm -f "$PIDFILE"
}

case "${1:-status}" in
start) start ;;
stop) stop && echo stopped ;;
restart) stop; start ;;
ensure) running || start ;;
status) running && echo "running (pid $(cat "$PIDFILE"))" || echo "not running" ;;
*) echo "usage: $0 start|stop|restart|ensure|status" >&2; exit 2 ;;
esac
