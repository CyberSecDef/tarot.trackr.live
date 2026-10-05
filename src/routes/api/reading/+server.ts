import { error, json } from '@sveltejs/kit';
import { READING_RATE_LIMIT } from '$app/env/private';
import { SPREADS } from '#lib/spreads.js';
import { classifier } from '#lib/server/classifier.js';
import { cleanQuestion } from '#lib/server/input.js';
import { RateLimiter } from '#lib/server/ratelimit.js';
import { createReading, toPublic } from '#lib/server/reading.js';

const limiter = new RateLimiter(READING_RATE_LIMIT, 60_000);

export async function POST({ request, getClientAddress }) {
	const verdict = limiter.hit(getClientAddress());
	if (!verdict.ok) {
		return json(
			{ message: 'Too many readings. The cards need a moment.' },
			{ status: 429, headers: { 'retry-after': String(verdict.retryAfter) } }
		);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		error(400, 'Body must be JSON');
	}

	const spread = SPREADS[String(body.spread ?? '')];
	if (!spread) error(400, `Unknown spread; expected one of ${Object.keys(SPREADS).join(', ')}`);

	const reading = await createReading(
		{ question: cleanQuestion(body.question), spread, reversals: body.reversals !== false },
		classifier
	);
	return json(toPublic(reading));
}
