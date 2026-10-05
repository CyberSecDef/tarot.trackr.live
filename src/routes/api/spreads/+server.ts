import { json } from '@sveltejs/kit';
import { SPREADS } from '#lib/spreads.js';

export function GET() {
	return json(SPREADS, { headers: { 'cache-control': 'public, max-age=3600' } });
}
