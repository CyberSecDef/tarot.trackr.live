/**
 * PM2 process definition for tarot.trackr.live on the DreamHost VPS.
 *
 * Lives at ~/tarot.trackr.live/app/ecosystem.config.cjs; deploy.sh copies it
 * there. The TypeSafe key is NOT in here: Node loads it from the server's
 * .env via --env-file, so it never ends up in PM2's dump file or `pm2 show`.
 */
const path = require('node:path');

const APP = __dirname;

module.exports = {
	apps: [
		{
			name: 'tarot',
			cwd: APP,
			script: 'build/index.js',
			node_args: ['--env-file=.env'],
			instances: 1, // the rate limiter and spend ledger are per-process
			exec_mode: 'fork',
			env: {
				NODE_ENV: 'production',
				// DreamHost's proxy connects to the site's public IP (not localhost),
				// so listen there. src/hooks.server.ts then refuses any socket that
				// isn't the proxy itself, so the open port can't be used directly.
				HOST: process.env.TAROT_HOST || '208.97.156.39',
				TRUSTED_PROXIES:
					process.env.TAROT_TRUSTED_PROXIES || '208.97.156.39,208.97.156.55,127.0.0.1,::1',
				PORT: process.env.TAROT_PORT || '8010',
				ORIGIN: 'https://tarot.trackr.live',
				// Behind the proxy every request arrives from the proxy's address; the real
				// client is the last X-Forwarded-For hop (used for rate limiting).
				ADDRESS_HEADER: 'X-Forwarded-For',
				XFF_DEPTH: '1',
				TAROT_DATA_DIR: path.join(APP, 'data')
			},
			max_memory_restart: '300M',
			exp_backoff_restart_delay: 200,
			kill_timeout: 5000,
			out_file: path.join(APP, 'logs', 'out.log'),
			error_file: path.join(APP, 'logs', 'error.log'),
			merge_logs: true,
			time: true
		}
	]
};
