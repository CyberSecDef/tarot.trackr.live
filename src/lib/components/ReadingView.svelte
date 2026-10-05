<script lang="ts">
	import { fade } from 'svelte/transition';
	import { sharePath } from '#lib/share.js';
	import type { PublicReading } from '#lib/server/reading.js';
	import Flourish from './Flourish.svelte';

	let { reading }: { reading: PublicReading } = $props();

	let includeQuestion = $state(false);
	let copied = $state(false);

	const path = $derived(
		sharePath({
			seed: reading.seed,
			spread: reading.spread,
			reversals: reading.reversals,
			question: includeQuestion ? reading.question : undefined,
			classification: reading.classification
		})
	);

	/** Split text around the first case-insensitive match of the keyword. */
	function highlight(text: string, keyword: string): [string, string, string] {
		const at = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
		if (at < 0) return [text, '', ''];
		return [
			text.slice(0, at),
			text.slice(at, at + keyword.length),
			text.slice(at + keyword.length)
		];
	}

	async function share() {
		const url = new URL(path, location.origin).toString();
		try {
			if (navigator.share && matchMedia('(pointer: coarse)').matches) {
				await navigator.share({ title: 'My tarot reading', url });
				return;
			}
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2200);
		} catch {
			prompt('Copy this link to your reading:', url);
		}
	}
</script>

<article class="reading" in:fade={{ duration: 700 }}>
	{#if reading.question}
		<p class="asked">“{reading.question}”</p>
	{/if}

	<p class="opening">{reading.opening}</p>

	<Flourish width={220} />

	{#each reading.sections as section, i (section.position)}
		{@const [before, mark, after] = highlight(section.text, section.keyword)}
		<section class="section" in:fade={{ duration: 600, delay: 200 + i * 160 }}>
			<h3>
				<span class="position">{section.label}</span>
				<span class="card-name">{section.cardName}{section.reversed ? ' · reversed' : ''}</span>
			</h3>
			<p>
				{before}{#if mark}<mark>{mark}</mark>{/if}{after}
			</p>
		</section>
	{/each}

	{#if reading.closing}
		<Flourish width={220} />
		<p class="closing">{reading.closing}</p>
	{/if}

	<div class="share">
		<button type="button" class="share-button" onclick={share}>
			{copied ? 'Link copied ✦' : 'Share this reading'}
		</button>
		{#if reading.question}
			<label class="include">
				<input type="checkbox" bind:checked={includeQuestion} />
				Include my question in the link
			</label>
		{/if}
	</div>
</article>

<style>
	.reading {
		max-width: 46rem;
		margin: 0 auto;
		padding: clamp(1.4rem, 4vw, 2.6rem);
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		backdrop-filter: blur(6px);
	}

	.asked {
		margin: 0 0 1rem;
		text-align: center;
		font-style: italic;
		color: var(--muted);
	}
	.opening,
	.closing {
		font-size: 1.32rem;
		text-align: center;
		color: var(--ink);
	}
	.opening {
		margin-top: 0;
	}

	.section {
		margin: 1.8rem 0;
	}
	h3 {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.2rem 0.75rem;
		margin: 0 0 0.4rem;
		font-size: 1rem;
	}
	.position {
		color: var(--gold);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.8rem;
	}
	.card-name {
		color: var(--ink);
		font-family: var(--font-head);
	}
	.section p {
		margin: 0;
		color: var(--ink-soft);
	}
	mark {
		background: none;
		color: var(--emerald);
		font-weight: 600;
		border-bottom: 1px solid color-mix(in srgb, var(--emerald) 50%, transparent);
	}

	.share {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		margin-top: 2rem;
	}
	.share-button {
		font: inherit;
		font-family: var(--font-head);
		font-size: 0.95rem;
		letter-spacing: 0.06em;
		padding: 0.6rem 1.4rem;
		color: var(--gold-bright);
		background: transparent;
		border: 1px solid var(--gold);
		border-radius: 999px;
		cursor: pointer;
		transition:
			background 0.2s,
			box-shadow 0.2s;
	}
	.share-button:hover {
		background: color-mix(in srgb, var(--gold) 12%, transparent);
		box-shadow: var(--glow);
	}
	.include {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 1rem;
		color: var(--muted);
	}
	.include input {
		accent-color: var(--emerald);
	}
</style>
