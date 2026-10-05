import { error } from '@sveltejs/kit';
import { SPREADS } from '#lib/spreads.js';
import { parseShare } from '#lib/share.js';
import { cleanQuestion } from '#lib/server/input.js';
import { rebuildReading, toPublic } from '#lib/server/reading.js';
import { isSeed } from '#lib/server/rng.js';

/** Rebuild a shared reading from its link. Never calls Jev. */
export function load({ params, url }) {
	if (!isSeed(params.seed)) error(404, 'This reading could not be found.');
	const shared = parseShare(params.seed, url.searchParams);
	const spread = shared && SPREADS[shared.spread];
	if (!shared || !spread) error(404, 'This reading link is incomplete.');
	shared.question = cleanQuestion(shared.question) || undefined;
	return { reading: toPublic(rebuildReading(shared, spread)) };
}
