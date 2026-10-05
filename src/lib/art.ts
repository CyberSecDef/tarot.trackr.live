/**
 * Card art: Pamela Colman Smith's original Rider–Waite–Smith illustrations
 * (public domain), from the scans on Wikimedia Commons. See
 * src/lib/assets/cards/SOURCES.json for the file each image came from.
 */
const images = import.meta.glob<string>('./assets/cards/*.webp', {
	eager: true,
	query: '?url',
	import: 'default'
});

const byId = new Map(
	Object.entries(images).map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url])
);

/** URL of a card's art, or null when there is none (the card shows a text face). */
export function artFor(cardId: string): string | null {
	return byId.get(cardId) ?? null;
}
