import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SPREADS } from '#lib/spreads.js';
import { BudgetExceededError, JevBudget } from './budget.js';
import { draw } from './draw.js';
import { buildRequest, JevClassifier } from './jev.js';
import { createReading } from './reading.js';

function ledgerPath() {
	return join(mkdtempSync(join(tmpdir(), 'tarot-budget-')), 'jev-usage.json');
}

function budget(over: Partial<ConstructorParameters<typeof JevBudget>[0]> = {}) {
	let now = new Date('2026-10-15T12:00:00Z');
	const b = new JevBudget({
		monthlyUsd: 1,
		dailyUsd: 0.5,
		inputPerMTok: 1_000_000, // $1 per token: easy arithmetic
		outputPerMTok: 0,
		path: ledgerPath(),
		now: () => now,
		...over
	});
	return { b, setNow: (d: string) => (now = new Date(d)) };
}

describe('JevBudget', () => {
	it('settles at the real cost from usage, not the estimate', () => {
		const { b } = budget();
		b.reserve(0.3)({ input_tokens: 0.1 as unknown as number }); // $0.10
		expect(b.status().spentUsd).toBeCloseTo(0.1);
	});

	it('keeps the estimate when a call fails, since it may have been billed', () => {
		const { b } = budget();
		b.reserve(0.2)();
		expect(b.status().spentUsd).toBeCloseTo(0.2);
	});

	it('refuses a call that could cross the daily cap', () => {
		const { b } = budget();
		b.reserve(0.4)();
		expect(() => b.reserve(0.2)).toThrow(BudgetExceededError);
		expect(b.status().refused).toBe(1);
	});

	it('refuses a call that could cross the monthly cap, across days', () => {
		const { b, setNow } = budget();
		b.reserve(0.45)();
		setNow('2026-10-16T12:00:00Z');
		b.reserve(0.45)();
		setNow('2026-10-17T12:00:00Z');
		expect(() => b.reserve(0.2)).toThrow(/monthly/);
	});

	it('counts calls still in flight, so a burst cannot overshoot', () => {
		const { b } = budget();
		const first = b.reserve(0.3);
		expect(() => b.reserve(0.3)).toThrow(BudgetExceededError); // 0.6 > daily 0.5
		first({ input_tokens: 0.05 as unknown as number });
		expect(() => b.reserve(0.3)).not.toThrow();
	});

	it('survives a restart', () => {
		const path = ledgerPath();
		const now = () => new Date('2026-10-15T12:00:00Z');
		const opts = {
			monthlyUsd: 1,
			dailyUsd: 1,
			inputPerMTok: 1_000_000,
			outputPerMTok: 0,
			path,
			now
		};
		new JevBudget(opts).reserve(0.7)();
		const reborn = new JevBudget(opts);
		expect(reborn.status().spentUsd).toBeCloseTo(0.7);
		expect(() => reborn.reserve(0.4)).toThrow(BudgetExceededError);
		expect(JSON.parse(readFileSync(path, 'utf8')).month).toBe('2026-10');
	});

	it('starts fresh in a new month', () => {
		const { b, setNow } = budget();
		b.reserve(0.45)();
		setNow('2026-11-01T00:00:01Z');
		expect(b.status().spentUsd).toBe(0);
		expect(() => b.reserve(0.45)).not.toThrow();
	});

	it('estimates high: above the real usage measured for every spread', () => {
		// Live usage at the 500-char question limit (2026-10-04): input tokens.
		const measured = { single: 1089, three: 1611, celtic_cross: 4308 };
		const b = new JevBudget({
			monthlyUsd: 10,
			dailyUsd: 1,
			inputPerMTok: 0.042,
			outputPerMTok: 0,
			path: ledgerPath()
		});
		const seed = createHash('sha256').update('est').digest().subarray(0, 16).toString('base64url');
		for (const [spread, tokens] of Object.entries(measured)) {
			const body = buildRequest(
				{ question: 'x'.repeat(500), cards: draw(seed, SPREADS[spread], true) },
				'jev-latest'
			);
			expect(b.estimate(body)).toBeGreaterThan(b.cost(tokens, 0));
		}
	});
});

describe('Jev under the budget', () => {
	const seed = createHash('sha256').update('jevb').digest().subarray(0, 16).toString('base64url');
	const cards = draw(seed, SPREADS.three, true);

	it('never calls Jev once the budget is spent, and the reading still renders', async () => {
		const { b } = budget({ monthlyUsd: 0, dailyUsd: 0 });
		let fetched = 0;
		const jev = new JevClassifier({
			apiKey: 'k',
			baseUrl: 'https://jev.test/v1',
			model: 'm',
			budget: b,
			fetch: (async () => {
				fetched++;
				return new Response('{}');
			}) as typeof fetch
		});
		const reading = await createReading(
			{ question: 'Will it work out?', spread: SPREADS.three, reversals: true },
			jev
		);
		expect(fetched).toBe(0);
		expect(reading.classification.fellBack).toEqual(['jev monthly budget reached']);
		expect(reading.assembled.text.length).toBeGreaterThan(0);
	});

	it('records the real usage of a successful call', async () => {
		const { b } = budget({ inputPerMTok: 0.042, monthlyUsd: 10, dailyUsd: 1 });
		const jev = new JevClassifier({
			apiKey: 'k',
			baseUrl: 'https://jev.test/v1',
			model: 'm',
			budget: b,
			fetch: (async () =>
				new Response(
					JSON.stringify({ answers: {}, usage: { input_tokens: 1611, output_tokens: 354 } })
				)) as typeof fetch
		});
		await jev.classify({ question: 'q', cards });
		expect(b.status().spentUsd).toBeCloseTo((1611 * 0.042) / 1_000_000, 12);
		expect(b.status().calls).toBe(1);
	});
});
