import type { DrawnCard } from './draw.js';
import {
	CARD_CONTENT,
	DOMAINS,
	REGISTERS,
	TIME_FOCI,
	type Domain,
	type Register,
	type TimeFocus
} from './content.js';

/**
 * What Jev decides about a reading. Code turns this into text; Jev never
 * writes any. Every field has a fallback, and `fellBack` records which ones
 * were used, so logs and tests can tell a confident reading from a default.
 */
export interface Classification {
	domain: Domain;
	register: Register;
	timeFocus: TimeFocus;
	/** Chosen facet id per drawn card, in position order. */
	facets: string[];
	/** Indices into the draw of the two most connected cards; null for one card. */
	anchor: [number, number] | null;
	source: 'jev' | 'fallback';
	fellBack: string[];
}

export interface ClassifyInput {
	question: string;
	cards: DrawnCard[];
}

export interface Classifier {
	classify(input: ClassifyInput): Promise<Classification>;
}

export function firstFacet(cardId: string): string {
	return CARD_CONTENT.get(cardId)?.facets[0]?.id ?? '';
}

export function defaultAnchor(count: number): [number, number] | null {
	return count < 2 ? null : [0, count - 1];
}

/** The classification used when there is no question, no key, or no confidence. */
export function fallbackClassification(
	cards: DrawnCard[],
	reason = 'no classifier'
): Classification {
	return {
		domain: 'general',
		register: 'neutral',
		timeFocus: 'present',
		facets: cards.map((c) => firstFacet(c.card.id)),
		anchor: defaultAnchor(cards.length),
		source: 'fallback',
		fellBack: [reason]
	};
}

/** Always returns the fallback. Used when no API key is configured. */
export class FallbackClassifier implements Classifier {
	async classify({ cards }: ClassifyInput) {
		return fallbackClassification(cards);
	}
}

/** Test double: returns a fixed classification, filling facets per card. */
export class StubClassifier implements Classifier {
	calls: ClassifyInput[] = [];

	constructor(private fixed: Partial<Classification>) {}

	async classify(input: ClassifyInput): Promise<Classification> {
		this.calls.push(input);
		const base = fallbackClassification(input.cards);
		return { ...base, source: 'jev', fellBack: [], ...this.fixed };
	}
}

/**
 * Validate a classification from outside (a share link). Anything that does
 * not fit the current draw and content is replaced by its fallback, so a
 * stale or hand-edited link still renders.
 */
export function sanitizeClassification(
	raw: Partial<Classification>,
	cards: DrawnCard[]
): Classification {
	const fallback = fallbackClassification(cards, 'invalid share data');
	const pick = <T extends string>(value: unknown, allowed: readonly T[], dflt: T): T =>
		allowed.includes(value as T) ? (value as T) : dflt;
	const facets = cards.map((c, i) => {
		const wanted = raw.facets?.[i];
		const known = CARD_CONTENT.get(c.card.id)?.facets.some((f) => f.id === wanted);
		return known ? wanted! : fallback.facets[i];
	});
	let anchor = fallback.anchor;
	if (
		Array.isArray(raw.anchor) &&
		raw.anchor.length === 2 &&
		raw.anchor.every((i) => Number.isInteger(i) && i >= 0 && i < cards.length) &&
		raw.anchor[0] !== raw.anchor[1]
	) {
		anchor = [raw.anchor[0], raw.anchor[1]];
	}
	return {
		domain: pick(raw.domain, DOMAINS, fallback.domain),
		register: pick(raw.register, REGISTERS, fallback.register),
		timeFocus: pick(raw.timeFocus, TIME_FOCI, fallback.timeFocus),
		facets,
		anchor,
		source: raw.source === 'jev' ? 'jev' : 'fallback',
		fellBack: []
	};
}
