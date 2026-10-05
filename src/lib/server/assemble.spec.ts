import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SPREADS } from '#lib/spreads.js';
import { parseShare, sharePath } from '#lib/share.js';
import { assemble } from './assemble.js';
import {
	fallbackClassification,
	sanitizeClassification,
	StubClassifier,
	type Classification
} from './classify.js';
import type { CardContent, ContentBundle } from './content.js';
import { draw } from './draw.js';
import { createReading, rebuildReading } from './reading.js';

const SEED = createHash('sha256').update('assembly').digest().subarray(0, 16).toString('base64url');

/** Fixture content: every card the fixture seed deals gets the same small entry. */
function fixtureCard(id: string, name: string): CardContent {
	const leaf = (tag: string) => [
		`${tag} one: {keyword} for {card}.`,
		`${tag} two: {keyword} again.`,
		`{keyword} opens ${tag} three.`
	];
	return {
		id,
		name,
		facets: [
			{ id: 'first', keywords: ['alpha thing'] },
			{ id: 'second', keywords: ['beta thing'] }
		],
		fragments: {
			upright: {
				love: { anxious: leaf('love-anxious') },
				general: { neutral: leaf('gen-neutral') }
			},
			reversed: { general: { neutral: leaf('rev-gen-neutral') } }
		}
	};
}

function fixtureBundle(cardIds: { id: string; name: string }[]): ContentBundle {
	return {
		cards: new Map(cardIds.map((c) => [c.id, fixtureCard(c.id, c.name)])),
		openings: {
			anxious: ['Breathe; this is a gentle look.', 'Take this slowly.', 'One card at a time.'],
			curious: [],
			grieving: [],
			skeptical: [],
			hopeful: [],
			neutral: ['Here is your reading.', 'The cards are laid out.', 'Let us look.']
		},
		connectors: {
			past: ['Behind you sits {card}.', 'In {position}, {card}.', 'Earlier: {card}.'],
			present: ['Now: {card}.', 'Here and now, {card}.', 'Today brings {card}.'],
			future: ['Ahead lies {card}.', 'Coming: {card}.', 'Next, {card}.'],
			self: [],
			obstacle: [],
			outcome: [],
			advice: []
		},
		closings: {
			general: {
				neutral: [
					'{anchor_a} and {anchor_b} speak to each other here.',
					'Hold {anchor_a} beside {anchor_b}.',
					'Between {anchor_a} and {anchor_b} runs the thread.'
				]
			}
		},
		singleClosings: {
			general: { neutral: ['Carry {card} with you.', 'Let {card} settle.', 'Return to {card}.'] }
		}
	};
}

const three = SPREADS.three;
const cards = draw(SEED, three, true);
const bundle = fixtureBundle(cards.map((c) => c.card));

function cls(overrides: Partial<Classification> = {}): Classification {
	return { ...fallbackClassification(cards), facets: ['second', 'second', 'second'], ...overrides };
}

describe('assemble', () => {
	it('matches the snapshot for a fixed draw, classification and seed', () => {
		const reading = assemble(cards, cls({ domain: 'love', register: 'anxious' }), SEED, bundle);
		expect(reading.text).toMatchSnapshot();
	});

	it('is deterministic', () => {
		const c = cls({ domain: 'love', register: 'anxious' });
		expect(assemble(cards, c, SEED, bundle)).toEqual(assemble(cards, c, SEED, bundle));
	});

	it("uses the chosen facet's keyword", () => {
		const reading = assemble(cards, cls(), SEED, bundle);
		expect(reading.sections.every((s) => s.keyword === 'beta thing')).toBe(true);
		expect(reading.text).toContain('beta thing');
		expect(reading.text).not.toContain('alpha thing');
	});

	it('capitalises a slot that opens a sentence', () => {
		const reading = assemble(cards, cls(), SEED, bundle);
		expect(reading.text).not.toMatch(/(^|[.!?]\s+)beta thing/m);
	});

	it('never repeats a variant within one reading', () => {
		const reading = assemble(cards, cls(), SEED, bundle);
		const fragments = reading.sections.map((s) => s.text);
		expect(new Set(fragments).size).toBe(fragments.length);
	});

	it('falls back through neutral and general for a missing leaf', () => {
		// love.anxious exists only upright; money.hopeful exists nowhere.
		const reading = assemble(cards, cls({ domain: 'money', register: 'hopeful' }), SEED, bundle);
		expect(reading.fallbacks.some((f) => f.includes('money.hopeful → general.neutral'))).toBe(true);
		expect(reading.sections.every((s) => s.text.length > 0)).toBe(true);
	});

	it('falls back to the first facet for an unknown facet id', () => {
		const reading = assemble(cards, cls({ facets: ['nope', 'nope', 'nope'] }), SEED, bundle);
		expect(reading.sections.every((s) => s.keyword === 'alpha thing')).toBe(true);
	});

	it('renders a card with no content at all, without throwing', () => {
		const empty = { ...bundle, cards: new Map() };
		const reading = assemble(cards, cls(), SEED, empty);
		expect(reading.sections[0].text).toContain(cards[0].card.name);
		expect(reading.fallbacks.some((f) => f.endsWith('no content'))).toBe(true);
	});

	it('closes a single-card reading with the single-card closing', () => {
		const one = draw(SEED, SPREADS.single, true);
		const reading = assemble(one, fallbackClassification(one), SEED, fixtureBundle([one[0].card]));
		expect(reading.closing).toContain(one[0].card.name);
	});
});

describe('readings', () => {
	it('skips Jev entirely for an empty question', async () => {
		const stub = new StubClassifier({ domain: 'love' });
		const reading = await createReading({ question: '', spread: three, reversals: true }, stub);
		expect(stub.calls).toHaveLength(0);
		expect(reading.classification.fellBack).toEqual(['empty question']);
		expect(reading.classification.domain).toBe('general');
	});

	it('asks the classifier when there is a question', async () => {
		const stub = new StubClassifier({ domain: 'career', register: 'hopeful' });
		const reading = await createReading(
			{ question: 'New job?', spread: three, reversals: true },
			stub
		);
		expect(stub.calls[0].question).toBe('New job?');
		expect(reading.classification.domain).toBe('career');
	});

	it('degrades to the fallback when the classifier throws', async () => {
		const broken = { classify: async () => Promise.reject(new Error('jev down')) };
		const reading = await createReading(
			{ question: 'Hm?', spread: three, reversals: true },
			broken
		);
		expect(reading.classification.fellBack).toEqual(['classifier error']);
		expect(reading.assembled.text.length).toBeGreaterThan(0);
	});

	it('a share link rebuilds the same reading without the classifier', async () => {
		const stub = new StubClassifier({ domain: 'love', register: 'grieving', anchor: [2, 0] });
		const original = await createReading({ question: 'Us?', spread: three, reversals: true }, stub);
		const path = sharePath({
			seed: original.seed,
			spread: three.id,
			reversals: true,
			classification: original.classification
		});
		const url = new URL(path, 'https://tarot.trackr.live');
		const shared = parseShare(url.pathname.split('/').pop()!, url.searchParams)!;
		const rebuilt = rebuildReading(shared, three);
		expect(rebuilt.assembled.text).toBe(original.assembled.text);
		expect(url.searchParams.has('q')).toBe(false); // the question stays private by default
	});

	it('a tampered share link still renders, with bad fields replaced', () => {
		const clean = sanitizeClassification(
			{ domain: 'astrology' as never, register: 'hopeful', anchor: [0, 99], facets: ['x'] },
			cards
		);
		expect(clean.domain).toBe('general');
		expect(clean.register).toBe('hopeful');
		expect(clean.anchor).toEqual([0, 2]);
	});
});
