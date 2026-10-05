import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DECK } from '#lib/deck.js';
import { SPREADS } from '#lib/spreads.js';
import { draw } from './draw.js';
import { isSeed, newSeed, Stream } from './rng.js';

/** Fixed seeds, so the statistical tests are reproducible instead of flaky. */
function seedFor(i: number): string {
	return createHash('sha256').update(`test-${i}`).digest().subarray(0, 16).toString('base64url');
}

/** Upper 0.1% point of chi-squared with 77 degrees of freedom (Wilson–Hilferty). */
const CHI2_77_P001 = 121.2;

function chiSquared(counts: number[], expected: number): number {
	return counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
}

describe('deck', () => {
	it('has 78 unique cards: 22 major, 14 per suit', () => {
		expect(DECK).toHaveLength(78);
		expect(new Set(DECK.map((c) => c.id)).size).toBe(78);
		expect(DECK.filter((c) => c.arcana === 'major')).toHaveLength(22);
		for (const suit of ['wands', 'cups', 'swords', 'pentacles']) {
			expect(DECK.filter((c) => c.suit === suit)).toHaveLength(14);
		}
	});

	it('keeps the ids the spec and content use', () => {
		const ids = DECK.map((c) => c.id);
		expect(ids).toContain('major_00_fool');
		expect(ids).toContain('major_16_tower');
		expect(ids).toContain('major_10_wheel_of_fortune');
		expect(ids).toContain('cups_11_page');
		expect(ids).toContain('pentacles_14_king');
	});
});

describe('seeds', () => {
	it('are 128-bit base64url and fresh each time', () => {
		const a = newSeed();
		expect(isSeed(a)).toBe(true);
		expect(newSeed()).not.toBe(a);
	});

	it('rejects anything that is not a seed', () => {
		for (const bad of ['', 'short', 'x'.repeat(23), 'AAAAAAAAAAAAAAAAAAAA+/', 42, null]) {
			expect(isSeed(bad)).toBe(false);
		}
		expect(() => new Stream('nope', 'draw')).toThrow();
	});

	it('separate purposes give independent streams', () => {
		const seed = seedFor(1);
		const draws = new Stream(seed, 'draw');
		const assembly = new Stream(seed, 'assembly');
		const x = Array.from({ length: 16 }, () => draws.int(1000));
		const y = Array.from({ length: 16 }, () => assembly.int(1000));
		expect(x).not.toEqual(y);
	});
});

describe('draw', () => {
	const celtic = SPREADS.celtic_cross;

	it('is deterministic for a seed', () => {
		const seed = seedFor(7);
		expect(draw(seed, celtic, true)).toEqual(draw(seed, celtic, true));
	});

	it('deals distinct cards, one per position', () => {
		const dealt = draw(seedFor(3), celtic, true);
		expect(dealt).toHaveLength(10);
		expect(new Set(dealt.map((d) => d.card.id)).size).toBe(10);
		expect(dealt.map((d) => d.position.id)).toEqual(celtic.positions.map((p) => p.id));
	});

	it('turning reversals off keeps the same cards upright', () => {
		const seed = seedFor(11);
		const withRev = draw(seed, celtic, true);
		const without = draw(seed, celtic, false);
		expect(without.map((d) => d.card.id)).toEqual(withRev.map((d) => d.card.id));
		expect(without.every((d) => !d.reversed)).toBe(true);
	});

	it('a smaller spread deals a prefix of the same shuffle', () => {
		const seed = seedFor(5);
		expect(draw(seed, SPREADS.three, true).map((d) => d.card.id)).toEqual(
			draw(seed, celtic, true)
				.slice(0, 3)
				.map((d) => d.card.id)
		);
	});

	it('is uniform: chi-squared over 100k shuffles, first and last position', () => {
		const N = 100_000;
		const first = new Array(78).fill(0);
		const last = new Array(78).fill(0);
		const index = new Map(DECK.map((c, i) => [c.id, i]));
		let reversed = 0;
		for (let i = 0; i < N; i++) {
			const dealt = draw(seedFor(i), celtic, true);
			first[index.get(dealt[0].card.id)!]++;
			last[index.get(dealt[9].card.id)!]++;
			if (dealt[0].reversed) reversed++;
		}
		expect(chiSquared(first, N / 78)).toBeLessThan(CHI2_77_P001);
		expect(chiSquared(last, N / 78)).toBeLessThan(CHI2_77_P001);
		// Binomial(100k, 0.5): sd ≈ 158, so ±800 is beyond five sigma.
		expect(Math.abs(reversed - N / 2)).toBeLessThan(800);
	}, 60_000);
});

describe('Stream.int', () => {
	it('stays in range and covers it without modulo bias', () => {
		const stream = new Stream(seedFor(99), 'test');
		const counts = new Array(7).fill(0);
		for (let i = 0; i < 70_000; i++) counts[stream.int(7)]++;
		// df = 6, upper 0.1% point ≈ 22.46
		expect(chiSquared(counts, 10_000)).toBeLessThan(22.46);
	});

	it('rejects nonsense ranges', () => {
		const stream = new Stream(seedFor(1), 'test');
		expect(() => stream.int(0)).toThrow(RangeError);
		expect(() => stream.int(1.5)).toThrow(RangeError);
	});
});
