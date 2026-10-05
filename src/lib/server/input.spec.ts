import { describe, expect, it } from 'vitest';
import { cleanQuestion, MAX_QUESTION } from './input.js';
import { RateLimiter } from './ratelimit.js';

describe('cleanQuestion', () => {
	it('strips control and format characters and collapses whitespace', () => {
		expect(cleanQuestion('Will\u0000 I\n\nfind‮ work?​ ')).toBe('Will I find work?');
	});

	it('caps length in code points, not UTF-16 units', () => {
		const long = '🌙'.repeat(MAX_QUESTION + 50);
		expect(Array.from(cleanQuestion(long))).toHaveLength(MAX_QUESTION);
	});

	it('treats non-strings as an empty question', () => {
		for (const bad of [undefined, null, 42, { q: 'x' }]) expect(cleanQuestion(bad)).toBe('');
	});
});

describe('RateLimiter', () => {
	it('allows the limit per window, then reports when to retry', () => {
		let now = 0;
		const limiter = new RateLimiter(2, 60_000, () => now);
		expect(limiter.hit('a').ok).toBe(true);
		expect(limiter.hit('a').ok).toBe(true);
		const third = limiter.hit('a');
		expect(third).toEqual({ ok: false, retryAfter: 60 });
		expect(limiter.hit('b').ok).toBe(true); // other clients unaffected
		now = 60_000;
		expect(limiter.hit('a').ok).toBe(true); // window rolled over
	});
});
