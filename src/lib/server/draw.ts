import { DECK, type Card } from '#lib/deck.js';
import type { Position, Spread } from '#lib/spreads.js';
import { Stream } from './rng.js';

export interface DrawnCard {
	card: Card;
	position: Position;
	reversed: boolean;
}

/**
 * Shuffle the full deck from the seed and deal one card per position.
 *
 * Reversals are decided for every card in the deck, whether or not reversals
 * are enabled, so toggling them changes only orientation, never which cards
 * are dealt. Turning reversals off for a shared reading keeps its cards.
 */
export function draw(seed: string, spread: Spread, reversals: boolean): DrawnCard[] {
	const stream = new Stream(seed, 'draw');
	const deck = stream.shuffle([...DECK]);
	const flips = deck.map(() => stream.bool());
	return spread.positions.map((position, i) => ({
		card: deck[i],
		position,
		reversed: reversals && flips[i]
	}));
}
