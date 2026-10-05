/**
 * The 78-card Rider–Waite–Smith deck. Pure data, safe on client and server.
 *
 * Ids are stable and appear in share links and content filenames, so never
 * rename one: `major_16_tower`, `cups_11_page`, `pentacles_01_ace`.
 */

export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';

export interface Card {
	id: string;
	name: string;
	arcana: 'major' | 'minor';
	suit: Suit | null;
	/** Major: 0–21. Minor: 1 (Ace) – 14 (King). */
	number: number;
}

const MAJORS = [
	'The Fool',
	'The Magician',
	'The High Priestess',
	'The Empress',
	'The Emperor',
	'The Hierophant',
	'The Lovers',
	'The Chariot',
	'Strength',
	'The Hermit',
	'Wheel of Fortune',
	'Justice',
	'The Hanged Man',
	'Death',
	'Temperance',
	'The Devil',
	'The Tower',
	'The Star',
	'The Moon',
	'The Sun',
	'Judgement',
	'The World'
];

export const SUITS: Suit[] = ['wands', 'cups', 'swords', 'pentacles'];

const RANKS = [
	'Ace',
	'Two',
	'Three',
	'Four',
	'Five',
	'Six',
	'Seven',
	'Eight',
	'Nine',
	'Ten',
	'Page',
	'Knight',
	'Queen',
	'King'
];

function slug(name: string): string {
	return name
		.toLowerCase()
		.replace(/^the /, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '');
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

export const DECK: readonly Card[] = Object.freeze([
	...MAJORS.map((name, number) => ({
		id: `major_${pad(number)}_${slug(name)}`,
		name,
		arcana: 'major' as const,
		suit: null,
		number
	})),
	...SUITS.flatMap((suit) =>
		RANKS.map((rank, i) => ({
			id: `${suit}_${pad(i + 1)}_${rank.toLowerCase()}`,
			name: `${rank} of ${suit[0].toUpperCase()}${suit.slice(1)}`,
			arcana: 'minor' as const,
			suit,
			number: i + 1
		}))
	)
]);

export const CARDS_BY_ID: ReadonlyMap<string, Card> = new Map(DECK.map((c) => [c.id, c]));
