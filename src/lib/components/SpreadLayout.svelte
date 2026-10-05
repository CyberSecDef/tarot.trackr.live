<script lang="ts">
	import { fly } from 'svelte/transition';
	import TarotCard from './TarotCard.svelte';

	interface LaidCard {
		id: string;
		name: string;
		label: string;
		reversed: boolean;
	}

	let {
		spread,
		cards,
		revealed,
		onselect
	}: {
		spread: string;
		cards: LaidCard[];
		/** How many cards, in order, are face up. */
		revealed: number;
		onselect?: (index: number) => void;
	} = $props();

	/**
	 * Celtic Cross grid slots (column / row), in position order: the present,
	 * the challenge crossing it, then foundation, recent past, crown, near
	 * future, and the staff of four rising on the right.
	 */
	const CELTIC = [
		'2 / 2',
		'2 / 2',
		'2 / 3',
		'1 / 2',
		'2 / 1',
		'3 / 2',
		'5 / 4',
		'5 / 3',
		'5 / 2',
		'5 / 1'
	];

	function area(i: number): string {
		if (spread !== 'celtic_cross') return '';
		const [col, row] = CELTIC[i].split(' / ');
		return `grid-column:${col};grid-row:${row}`;
	}
</script>

<div class="spread {spread}" role="list">
	{#each cards as card, i (card.id)}
		<div
			class="slot"
			class:crossing={spread === 'celtic_cross' && i === 1}
			style={area(i)}
			role="listitem"
			in:fly={{ y: -40, duration: 500, delay: i * 110 }}
		>
			<TarotCard
				id={card.id}
				name={card.name}
				reversed={card.reversed}
				label={card.label}
				revealed={i < revealed}
				onselect={onselect ? () => onselect(i) : undefined}
			/>
			<span class="label" class:shown={i < revealed}>{card.label}</span>
		</div>
	{/each}
</div>

<style>
	.spread {
		display: grid;
		justify-content: center;
		gap: clamp(10px, 3vw, 28px);
		margin: 0 auto;
	}

	.single {
		grid-template-columns: min(240px, 58vw);
	}
	.three {
		grid-template-columns: repeat(3, min(190px, 28vw));
	}
	.celtic_cross {
		--w: min(128px, 19vw);
		/* column 4 is a narrow gutter that sets the staff apart from the cross */
		grid-template-columns: repeat(3, var(--w)) calc(var(--w) * 0.12) var(--w);
		grid-template-rows: repeat(4, auto);
		gap: clamp(6px, 2vw, 18px);
		align-items: center;
	}

	.slot {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
	}

	/* The challenge lies sideways across the present. */
	.crossing {
		z-index: 2;
		transform: rotate(90deg) scale(0.92);
		pointer-events: auto;
	}
	.crossing .label {
		transform: rotate(-90deg) translateX(-40%);
		display: none;
	}

	.label {
		font-family: var(--font-head);
		font-size: clamp(0.62rem, 1.8vw, 0.85rem);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-align: center;
		color: var(--gold);
		opacity: 0;
		transition: opacity 0.6s ease 0.4s;
	}
	.label.shown {
		opacity: 1;
	}
	.celtic_cross .label {
		font-size: clamp(0.5rem, 1.5vw, 0.7rem);
	}
</style>
