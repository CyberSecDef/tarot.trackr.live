import type { Handle } from '@sveltejs/kit/hooks';
import { TRUSTED_PROXIES } from '$app/env/private';

/**
 * Only the reverse proxy may talk to this server.
 *
 * DreamHost's proxy connects to the site's public IP, so the app has to
 * listen there, which also makes it reachable directly from the internet.
 * A direct visitor would skip HTTPS and could set their own X-Forwarded-For
 * to dodge the per-IP rate limit. This checks the actual TCP peer (not any
 * header, which a client controls) against the proxy's addresses and
 * answers 404 to everyone else. Empty TRUSTED_PROXIES disables the check,
 * which is what local development wants.
 */
const trusted = new Set(
	TRUSTED_PROXIES.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
);

function peer(address: string | undefined): string {
	// IPv4 clients on a dual-stack socket appear as ::ffff:1.2.3.4.
	return (address ?? '').replace(/^::ffff:/, '');
}

export const handle: Handle = async ({ event, resolve }) => {
	if (trusted.size) {
		const address = peer(event.platform?.req?.socket?.remoteAddress);
		if (!trusted.has(address)) {
			console.warn(`[guard] refused direct connection from ${address || 'unknown'}`);
			return new Response('Not found', { status: 404 });
		}
	}
	return resolve(event);
};
