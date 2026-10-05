<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { artFor } from '#lib/art.js';
	import CardZoom, { type ZoomCard } from '#lib/components/CardZoom.svelte';
	import ReadingView from '#lib/components/ReadingView.svelte';
	import SpreadLayout from '#lib/components/SpreadLayout.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const reading = $derived(data.reading);

	// Flip the cards on arrival; a shared reading is already complete.
	let revealed = $state(0);
	let zoom = $state<ZoomCard | null>(null);

	onMount(() => {
		const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (instant) {
			revealed = reading.cards.length;
			return;
		}
		const timer = setInterval(() => {
			revealed += 1;
			if (revealed >= reading.cards.length) clearInterval(timer);
		}, 260);
		return () => clearInterval(timer);
	});

	const title = $derived(`${reading.cards.map((c) => c.name).join(' · ')} | Tarot`);
	const description = $derived(reading.opening || 'A tarot reading from tarot.trackr.live');
	const image = $derived(artFor(reading.cards[0]?.id ?? ''));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={page.url.href} />
	{#if image}
		<meta property="og:image" content={new URL(image, page.url.origin).href} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="shared">
	<p class="kicker">A shared reading</p>
	<SpreadLayout
		spread={reading.spread}
		cards={reading.cards}
		{revealed}
		onselect={(i) => (zoom = reading.cards[i])}
	/>
	{#if revealed >= reading.cards.length}
		<ReadingView {reading} />
	{/if}
	<p class="own"><a href="/" class="draw">Draw your own reading</a></p>
</section>

<CardZoom card={zoom} onclose={() => (zoom = null)} />

<style>
	.shared {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding-top: 1rem;
	}
	.kicker {
		margin: 0;
		text-align: center;
		font-family: var(--font-head);
		font-size: 0.85rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--emerald);
	}
	.own {
		text-align: center;
	}
	.draw {
		display: inline-block;
		padding: 0.8rem 2.2rem;
		font-family: var(--font-head);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-decoration: none;
		color: #1a0d2c;
		background: linear-gradient(180deg, #f6e2a0, #d8b25a 55%, #b38a30);
		border-radius: 999px;
	}
</style>
