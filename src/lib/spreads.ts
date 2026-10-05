import raw from '../../content/spreads.json';

export type Emphasis = 'past' | 'present' | 'future' | 'self' | 'obstacle' | 'outcome' | 'advice';

export interface Position {
	id: string;
	label: string;
	emphasis: Emphasis;
}

export interface Spread {
	id: string;
	name: string;
	description: string;
	positions: Position[];
}

const EMPHASES = new Set<string>([
	'past',
	'present',
	'future',
	'self',
	'obstacle',
	'outcome',
	'advice'
]);

function load(): Record<string, Spread> {
	const spreads: Record<string, Spread> = {};
	for (const [id, spec] of Object.entries(raw)) {
		for (const p of spec.positions) {
			if (!EMPHASES.has(p.emphasis)) {
				throw new Error(`spreads.json: ${id}/${p.id} has unknown emphasis ${p.emphasis}`);
			}
		}
		spreads[id] = { id, ...spec, positions: spec.positions as Position[] };
	}
	return spreads;
}

export const SPREADS: Readonly<Record<string, Spread>> = Object.freeze(load());
