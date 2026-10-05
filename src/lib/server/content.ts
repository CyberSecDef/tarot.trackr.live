/**
 * Authored reading content, bundled at build time from content/.
 *
 * Everything a reading says comes from here. Jev only chooses among options
 * this module defines (domains, registers, facets); code fills the slots.
 */

import openings from '../../../content/openings.json';
import connectors from '../../../content/connectors.json';
import closings from '../../../content/closings.json';
import singleClosings from '../../../content/single_closings.json';

export const DOMAINS = ['love', 'career', 'money', 'health', 'spiritual', 'general'] as const;
/** What Jev may choose. `neutral` is fallback-only and never offered to Jev. */
export const JEV_REGISTERS = ['anxious', 'curious', 'grieving', 'skeptical', 'hopeful'] as const;
export const REGISTERS = [...JEV_REGISTERS, 'neutral'] as const;
export const ORIENTATIONS = ['upright', 'reversed'] as const;
export const EMPHASES = [
	'past',
	'present',
	'future',
	'self',
	'obstacle',
	'outcome',
	'advice'
] as const;
export const TIME_FOCI = ['past', 'present', 'future'] as const;

export type Domain = (typeof DOMAINS)[number];
export type Register = (typeof REGISTERS)[number];
export type JevRegister = (typeof JEV_REGISTERS)[number];
export type Orientation = (typeof ORIENTATIONS)[number];
export type Emphasis = (typeof EMPHASES)[number];
export type TimeFocus = (typeof TIME_FOCI)[number];

export interface Facet {
	id: string;
	/** Noun phrases, each usable in a fragment's {keyword} slot. */
	keywords: string[];
}

type Leaves = Partial<Record<Domain, Partial<Record<Register, string[]>>>>;

export interface CardContent {
	id: string;
	name: string;
	facets: Facet[];
	fragments: Partial<Record<Orientation, Leaves>>;
}

/** Opening lines, keyed by register. */
export type Openings = Record<Register, string[]>;
/** Position lead-ins, keyed by emphasis. Slots: {card}, {position}. */
export type Connectors = Record<Emphasis, string[]>;
/** Closing paragraphs. Slots: {anchor_a}, {anchor_b}. */
export type Closings = Partial<Record<Domain, Partial<Record<Register, string[]>>>>;
/** Closings for single-card readings, where there is no pair. Slot: {card}. */
export type SingleClosings = Partial<Record<Domain, Partial<Record<Register, string[]>>>>;

/** Placeholders each kind of text may use. Anything else is a lint error. */
export const SLOTS = {
	fragment: ['card', 'keyword'],
	opening: [],
	connector: ['card', 'position'],
	closing: ['anchor_a', 'anchor_b'],
	single_closing: ['card']
} as const;

const cardModules = import.meta.glob<CardContent>('../../../content/cards/*.json', {
	eager: true,
	import: 'default'
});

function byId(): Map<string, CardContent> {
	const cards = new Map<string, CardContent>();
	for (const [path, card] of Object.entries(cardModules)) {
		const fileId = path
			.split('/')
			.pop()!
			.replace(/\.json$/, '');
		if (card.id !== fileId) throw new Error(`content/cards/${fileId}.json declares id ${card.id}`);
		cards.set(card.id, card);
	}
	return cards;
}

export const CARD_CONTENT: ReadonlyMap<string, CardContent> = byId();

export const OPENINGS = openings as Openings;
export const CONNECTORS = connectors as Connectors;
export const CLOSINGS = closings as Closings;
export const SINGLE_CLOSINGS = singleClosings as SingleClosings;

/** Everything assembly reads. Injectable so tests can use fixed fixtures. */
export interface ContentBundle {
	cards: ReadonlyMap<string, CardContent>;
	openings: Openings;
	connectors: Connectors;
	closings: Closings;
	singleClosings: SingleClosings;
}

export const CONTENT: ContentBundle = {
	cards: CARD_CONTENT,
	openings: OPENINGS,
	connectors: CONNECTORS,
	closings: CLOSINGS,
	singleClosings: SINGLE_CLOSINGS
};
