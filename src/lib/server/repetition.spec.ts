import { it, expect } from 'vitest';

/**
 * Different cards' authors drifted toward shared stock frames. Assembly
 * steers away from repeating them inside one reading; this keeps it honest
 * over 3000 simulated Celtic Cross readings (baseline before the fix: 65%).
 */
import { createHash } from 'node:crypto';
import { SPREADS } from '#lib/spreads.js';
import { draw } from '#lib/server/draw.js';
import { assemble } from '#lib/server/assemble.js';
import { fallbackClassification } from '#lib/server/classify.js';
import { DOMAINS, JEV_REGISTERS, CARD_CONTENT } from '#lib/server/content.js';

it('rarely repeats a four-word phrase inside one Celtic Cross reading', () => {
	const N = 3000;
	let repeated = 0,
		readingsWithRepeat = 0,
		worst = 0;
	for (let i = 0; i < N; i++) {
		const seed = createHash('sha256')
			.update('sim' + i)
			.digest()
			.subarray(0, 16)
			.toString('base64url');
		const cards = draw(seed, SPREADS.celtic_cross, true);
		const cls = {
			...fallbackClassification(cards),
			domain: DOMAINS[i % 6],
			register: JEV_REGISTERS[i % 5],
			facets: cards.map(
				(c, k) =>
					CARD_CONTENT.get(c.card.id)!.facets[(i + k) % CARD_CONTENT.get(c.card.id)!.facets.length]
						.id
			)
		};
		const r = assemble(cards, cls, seed);
		const count = new Map<string, number>();
		for (const s of r.sections) {
			const w = s.text.toLowerCase().match(/[a-z']+/g) ?? [];
			const seen = new Set<string>();
			for (let k = 0; k + 4 <= w.length; k++) seen.add(w.slice(k, k + 4).join(' '));
			for (const g of seen) count.set(g, (count.get(g) ?? 0) + 1);
		}
		const reps = [...count.values()].filter((c) => c > 1).length;
		repeated += reps;
		if (reps) readingsWithRepeat++;
		worst = Math.max(worst, reps);
	}
	expect(readingsWithRepeat / N).toBeLessThan(0.15);
	expect(repeated / N).toBeLessThan(0.3);
	expect(worst).toBeLessThanOrEqual(6);
}, 120000);
