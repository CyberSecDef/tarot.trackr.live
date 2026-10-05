<script lang="ts">
	import { artFor } from '#lib/art.js';
	import CardBack from './CardBack.svelte';

	let {
		id,
		name,
		reversed = false,
		revealed = false,
		label = '',
		onselect
	}: {
		id: string;
		name: string;
		reversed?: boolean;
		revealed?: boolean;
		label?: string;
		onselect?: () => void;
	} = $props();

	const art = $derived(artFor(id));
	const description = $derived(
		revealed
			? `${label ? `${label}: ` : ''}${name}${reversed ? ', reversed' : ''}`
			: 'A card, face down'
	);
</script>

<button
	class="card"
	class:revealed
	type="button"
	aria-label={description}
	disabled={!revealed || !onselect}
	onclick={() => onselect?.()}
>
	<span class="inner">
		<span class="side back"><CardBack /></span>
		<span class="side face" class:reversed>
			{#if art}
				<img src={art} alt="" loading="lazy" decoding="async" draggable="false" />
			{:else}
				<span class="text-face">
					<span class="text-name">{name}</span>
				</span>
			{/if}
			<svg class="frame" viewBox="0 0 100 173" preserveAspectRatio="none" aria-hidden="true">
				<rect
					x="2"
					y="2"
					width="96"
					height="169"
					rx="5"
					fill="none"
					stroke="currentColor"
					stroke-width="1.2"
				/>
			</svg>
			{#each ['tl', 'tr', 'bl', 'br'] as corner (corner)}
				<svg class="corner {corner}" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M2 16 C2 7, 7 2, 16 2" fill="none" stroke="currentColor" stroke-width="1.6" />
					<path
						d="M6 20 C7 12, 12 7, 20 6"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						opacity="0.7"
					/>
					<circle cx="5" cy="5" r="2" fill="currentColor" />
				</svg>
			{/each}
		</span>
	</span>
</button>

<style>
	.card {
		all: unset;
		display: block;
		width: 100%;
		aspect-ratio: var(--card-ratio);
		perspective: 1100px;
		cursor: default;
		-webkit-tap-highlight-color: transparent;
	}
	.card:not(:disabled) {
		cursor: zoom-in;
	}
	.card:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 4px;
		border-radius: var(--radius);
	}

	.inner {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		transition: transform 0.9s cubic-bezier(0.3, 0.7, 0.2, 1);
	}
	.revealed .inner {
		transform: rotateY(180deg);
	}
	.card:not(:disabled):hover .inner {
		transform: rotateY(180deg) translateY(-4px) scale(1.02);
	}

	.side {
		position: absolute;
		inset: 0;
		overflow: hidden;
		border-radius: calc(var(--radius) * 0.7);
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		box-shadow: var(--shadow);
	}
	.back {
		background: #1d0f33;
	}
	.face {
		transform: rotateY(180deg);
		background: #efe3c5;
		color: var(--gold);
		box-shadow: var(--shadow), var(--glow);
	}
	.face.reversed img,
	.face.reversed .text-face {
		transform: rotate(180deg);
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		user-select: none;
	}

	.text-face {
		display: grid;
		place-items: center;
		height: 100%;
		padding: 18%;
		background: radial-gradient(circle at 50% 40%, #fff7e2, #e3d2a8);
		text-align: center;
	}
	.text-name {
		font-family: var(--font-head);
		font-size: clamp(0.55rem, 2.2vw, 1rem);
		color: #3a1f63;
	}

	.frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		color: #c99a3a;
		pointer-events: none;
	}
	.corner {
		position: absolute;
		width: 18%;
		max-width: 26px;
		color: #d8b25a;
		filter: drop-shadow(0 0 2px rgb(0 0 0 / 0.5));
		pointer-events: none;
	}
	.tl {
		top: 3%;
		left: 4%;
	}
	.tr {
		top: 3%;
		right: 4%;
		transform: scaleX(-1);
	}
	.bl {
		bottom: 3%;
		left: 4%;
		transform: scaleY(-1);
	}
	.br {
		bottom: 3%;
		right: 4%;
		transform: scale(-1, -1);
	}
</style>
