/**
 * Share links: `/r/<seed>?s=<spread>&c=<classification>[&rv=0][&q=<question>]`
 *
 * The link carries the classification, so opening it rebuilds the reading
 * without asking Jev again (Jev is not deterministic; a re-ask could change
 * the text). The question is optional: the reading's words depend only on the
 * classification, so a link can be shared without revealing what was asked.
 *
 * `c` is `domain.register.timeFocus.anchorA-anchorB.facet,facet,...`, with an
 * empty anchor for single-card readings. Facets are ids, not indices, so
 * reordering a card's facets in content does not change old links.
 */

export interface SharedClassification {
	domain: string;
	register: string;
	timeFocus: string;
	anchor: [number, number] | null;
	facets: string[];
	source?: 'jev' | 'fallback';
}

export interface SharedReading {
	seed: string;
	spread: string;
	reversals: boolean;
	question?: string;
	classification: SharedClassification;
}

export function sharePath(reading: SharedReading): string {
	const c = reading.classification;
	const params = new URLSearchParams({ s: reading.spread });
	params.set(
		'c',
		[
			c.domain,
			c.register,
			c.timeFocus,
			c.anchor ? c.anchor.join('-') : '',
			c.facets.join(','),
			c.source === 'jev' ? 'j' : 'f'
		].join('.')
	);
	if (!reading.reversals) params.set('rv', '0');
	if (reading.question) params.set('q', reading.question);
	return `/r/${reading.seed}?${params}`;
}

/** Parse a share link's parts. Returns null only when it cannot be a reading at all. */
export function parseShare(seed: string, params: URLSearchParams): SharedReading | null {
	const spread = params.get('s');
	const c = params.get('c');
	if (!spread || !c) return null;
	const [domain = '', register = '', timeFocus = '', anchor = '', facets = '', source = ''] =
		c.split('.');
	const pair = anchor.split('-').map(Number);
	return {
		seed,
		spread,
		reversals: params.get('rv') !== '0',
		question: params.get('q') ?? undefined,
		classification: {
			domain,
			register,
			timeFocus,
			anchor: pair.length === 2 && pair.every(Number.isInteger) ? [pair[0], pair[1]] : null,
			facets: facets ? facets.split(',') : [],
			source: source === 'j' ? 'jev' : 'fallback'
		}
	};
}
