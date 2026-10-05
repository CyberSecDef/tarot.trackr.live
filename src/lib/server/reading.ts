import type { Spread } from '#lib/spreads.js';
import type { SharedReading } from '#lib/share.js';
import { assemble, type AssembledReading } from './assemble.js';
import {
	fallbackClassification,
	sanitizeClassification,
	type Classification,
	type Classifier
} from './classify.js';
import { draw, type DrawnCard } from './draw.js';
import { newSeed } from './rng.js';

export interface Reading {
	seed: string;
	spread: Spread;
	reversals: boolean;
	question: string;
	cards: DrawnCard[];
	classification: Classification;
	assembled: AssembledReading;
}

/** Draw and classify a new reading. Jev is asked only when there is a question. */
export async function createReading(
	opts: { question: string; spread: Spread; reversals: boolean },
	classifier: Classifier
): Promise<Reading> {
	const seed = newSeed();
	const cards = draw(seed, opts.spread, opts.reversals);
	let classification: Classification;
	if (!opts.question) {
		classification = fallbackClassification(cards, 'empty question');
	} else {
		try {
			classification = await classifier.classify({ question: opts.question, cards });
		} catch (err) {
			// A Jev outage degrades the reading; it never fails it.
			console.warn('[reading] classifier failed, using fallback:', (err as Error).message);
			classification = fallbackClassification(cards, 'classifier error');
		}
	}
	if (classification.fellBack.length) {
		console.info('[reading] fallbacks:', classification.fellBack.join('; '));
	}
	const assembled = assemble(cards, classification, seed);
	return { seed, ...opts, cards, classification, assembled };
}

/** Rebuild a shared reading exactly, without calling Jev. */
export function rebuildReading(shared: SharedReading, spread: Spread): Reading {
	const cards = draw(shared.seed, spread, shared.reversals);
	const classification = sanitizeClassification(
		shared.classification as Partial<Classification>,
		cards
	);
	return {
		seed: shared.seed,
		spread,
		reversals: shared.reversals,
		question: shared.question ?? '',
		cards,
		classification,
		assembled: assemble(cards, classification, shared.seed)
	};
}

/** The JSON shape the client receives. */
export function toPublic(reading: Reading) {
	return {
		seed: reading.seed,
		spread: reading.spread.id,
		reversals: reading.reversals,
		question: reading.question,
		cards: reading.cards.map((c) => ({
			id: c.card.id,
			name: c.card.name,
			position: c.position.id,
			label: c.position.label,
			emphasis: c.position.emphasis,
			reversed: c.reversed
		})),
		classification: {
			domain: reading.classification.domain,
			register: reading.classification.register,
			timeFocus: reading.classification.timeFocus,
			anchor: reading.classification.anchor,
			facets: reading.classification.facets,
			source: reading.classification.source
		},
		opening: reading.assembled.opening,
		sections: reading.assembled.sections,
		closing: reading.assembled.closing,
		text: reading.assembled.text
	};
}

export type PublicReading = ReturnType<typeof toPublic>;
