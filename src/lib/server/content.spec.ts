import { describe, expect, it } from 'vitest';
import { DECK } from '#lib/deck.js';
import { CARD_CONTENT, CLOSINGS, CONNECTORS, OPENINGS, SINGLE_CLOSINGS } from './content.js';
import { lintCard, lintClosings, lintConnectors, lintOpenings } from './lint.js';

/**
 * One test per content file, so an author can lint just theirs:
 *   npx vitest run src/lib/server/content.spec.ts -t major_16_tower
 */
describe('content lint', () => {
	for (const card of DECK) {
		const content = CARD_CONTENT.get(card.id);
		it.skipIf(!content)(card.id, () => {
			expect(lintCard(content!)).toEqual([]);
		});
	}

	it('openings', () => expect(lintOpenings(OPENINGS)).toEqual([]));
	it('connectors', () => expect(lintConnectors(CONNECTORS)).toEqual([]));
	it('closings', () => expect(lintClosings(CLOSINGS, SINGLE_CLOSINGS)).toEqual([]));

	// Until every card is written, a missing card falls back at runtime rather than
	// failing the suite. CONTENT_COMPLETE=1 turns that into a hard requirement.
	it.runIf(process.env.CONTENT_COMPLETE === '1')('all 78 cards are written', () => {
		expect(DECK.filter((c) => !CARD_CONTENT.has(c.id)).map((c) => c.id)).toEqual([]);
	});
});
