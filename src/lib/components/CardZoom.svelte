<script lang="ts" module>
	export interface ZoomCard {
		id: string;
		name: string;
		label: string;
		reversed: boolean;
	}
</script>

<script lang="ts">
	import { artFor } from '#lib/art.js';

	let { card, onclose }: { card: ZoomCard | null; onclose: () => void } = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (card && !dialog.open) dialog.showModal();
		if (!card && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	{onclose}
	onclick={(e) => e.target === dialog && onclose()}
	aria-label={card ? `${card.name}${card.reversed ? ', reversed' : ''}` : 'Card'}
>
	{#if card}
		{@const art = artFor(card.id)}
		<figure>
			{#if art}
				<img src={art} alt={card.name} class:reversed={card.reversed} />
			{/if}
			<figcaption>
				<span class="label">{card.label}</span>
				<span class="name">{card.name}{card.reversed ? ' · reversed' : ''}</span>
			</figcaption>
		</figure>
		<button type="button" class="close" onclick={onclose} aria-label="Close">✕</button>
	{/if}
</dialog>

<style>
	dialog {
		padding: 0;
		border: none;
		background: transparent;
		max-width: min(92vw, 420px);
		overflow: visible;
	}
	dialog::backdrop {
		background: rgb(8 4 16 / 0.82);
		backdrop-filter: blur(4px);
	}
	figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
	}
	img {
		width: 100%;
		max-height: 78dvh;
		object-fit: contain;
		border-radius: 12px;
		border: 2px solid #d8b25a;
		box-shadow:
			0 0 40px rgb(216 178 90 / 0.3),
			0 20px 50px rgb(0 0 0 / 0.6);
	}
	img.reversed {
		transform: rotate(180deg);
	}
	figcaption {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: #f1e8d4;
		font-family: var(--font-head);
	}
	.label {
		color: #d8b25a;
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.close {
		position: absolute;
		top: -0.6rem;
		right: -0.6rem;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		border: 1px solid #d8b25a;
		background: #26153e;
		color: #f3d98b;
		font-size: 1rem;
		cursor: pointer;
	}
</style>
