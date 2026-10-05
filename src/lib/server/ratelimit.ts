/**
 * Fixed-window, in-memory, per-key limiter.
 *
 * In-memory is enough for one Node process on one VPS. Behind DreamHost's
 * proxy every request arrives from 127.0.0.1, so the client address must come
 * from the forwarded header: run with ADDRESS_HEADER=X-Forwarded-For and
 * XFF_DEPTH=1 (adapter-node settings) or all visitors share one bucket.
 */
export class RateLimiter {
	private windows = new Map<string, { start: number; count: number }>();

	constructor(
		private limit: number,
		private windowMs: number,
		private now: () => number = Date.now
	) {}

	/** Count a request. Returns seconds until the window resets when over the limit. */
	hit(key: string): { ok: true } | { ok: false; retryAfter: number } {
		const now = this.now();
		let entry = this.windows.get(key);
		if (!entry || now - entry.start >= this.windowMs) {
			entry = { start: now, count: 0 };
			this.windows.set(key, entry);
		}
		if (entry.count >= this.limit) {
			return { ok: false, retryAfter: Math.ceil((entry.start + this.windowMs - now) / 1000) };
		}
		entry.count++;
		if (this.windows.size > 10_000) this.sweep(now);
		return { ok: true };
	}

	private sweep(now: number) {
		for (const [key, entry] of this.windows) {
			if (now - entry.start >= this.windowMs) this.windows.delete(key);
		}
	}
}
