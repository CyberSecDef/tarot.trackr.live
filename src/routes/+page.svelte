<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { SPREADS } from '#lib/spreads.js';
	import { sharePath } from '#lib/share.js';
	import { addHistory, clearHistory, loadHistory, type HistoryEntry } from '#lib/history.js';
	import type { PublicReading } from '#lib/server/reading.js';
	import CardBack from '#lib/components/CardBack.svelte';
	import CardZoom, { type ZoomCard } from '#lib/components/CardZoom.svelte';
	import Flourish from '#lib/components/Flourish.svelte';
	import ReadingView from '#lib/components/ReadingView.svelte';
	import SpreadLayout from '#lib/components/SpreadLayout.svelte';

	const MAX = 500;
	const SPREAD_ORDER = ['single', 'three', 'celtic_cross'] as const;
	const ICONS: Record<string, number> = { single: 1, three: 3, celtic_cross: 10 };

	type Phase = 'ask' | 'shuffling' | 'revealing' | 'read';

	let question = $state('');
	let spread = $state<string>('three');
	let reversals = $state(true);
	let phase = $state<Phase>('ask');
	let reading = $state<PublicReading | null>(null);
	let revealed = $state(0);
	let error = $state('');
	let zoom = $state<ZoomCard | null>(null);
	let history = $state<HistoryEntry[]>([]);
	let results: HTMLElement | undefined = $state();

	const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
	const sleep = (ms: number) => new Promise((r) => setTimeout(r, reduceMotion() ? 0 : ms));

	onMount(() => {
		history = loadHistory();
	});

	async function draw(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		phase = 'shuffling';
		reading = null;
		revealed = 0;
		try {
			const [response] = await Promise.all([
				fetch('/api/reading', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ question, spread, reversals })
				}),
				sleep(1400) // let the shuffle breathe, even when Jev is quick
			]);
			const body = await response.json();
			if (!response.ok) throw new Error(body.message ?? 'The cards would not come.');
			reading = body as PublicReading;
		} catch (e) {
			error = (e as Error).message || 'Something went wrong. Please try again.';
			phase = 'ask';
			return;
		}

		phase = 'revealing';
		await tick();
		results?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
		await sleep(500 + reading.cards.length * 110);
		for (let i = 1; i <= reading.cards.length; i++) {
			if (phase !== 'revealing') break;
			revealed = i;
			await sleep(reading.cards.length > 3 ? 420 : 750);
		}
		finish();
	}

	function finish() {
		if (!reading) return;
		revealed = reading.cards.length;
		phase = 'read';
		history = addHistory({
			path: sharePath({
				seed: reading.seed,
				spread: reading.spread,
				reversals: reading.reversals,
				question: reading.question || undefined,
				classification: reading.classification
			}),
			spread: reading.spread,
			cards: reading.cards.map((c) => c.name + (c.reversed ? ' (r)' : '')),
			at: Date.now()
		});
	}

	function again() {
		phase = 'ask';
		reading = null;
		revealed = 0;
		question = '';
		scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
	}
</script>

<svelte:head>
	<title>Tarot · trackr.live</title>
	<meta
		name="description"
		content="Ask a question, draw from the Rider–Waite–Smith deck, and receive a reading written for what you asked."
	/>
</svelte:head>

{#if phase === 'ask' || phase === 'shuffling'}
	<section class="ask" out:fade={{ duration: 250 }}>
		<p class="lede">Hold a question in mind, then let the cards answer it.</p>
		<Flourish />

		<form onsubmit={draw}>
			<label class="question">
				<span class="visually-hidden">Your question</span>
				<textarea
					bind:value={question}
					maxlength={MAX}
					rows="3"
					placeholder="What would you like to ask? (or leave it blank for a general reading)"
					disabled={phase === 'shuffling'}></textarea>
				<span class="count" class:near={question.length > MAX - 50}>{question.length}/{MAX}</span>
			</label>

			<fieldset class="spreads" disabled={phase === 'shuffling'}>
				<legend>Choose a spread</legend>
				{#each SPREAD_ORDER as id (id)}
					<label class="spread" class:chosen={spread === id}>
						<input type="radio" name="spread" value={id} bind:group={spread} />
						<span class="pips" aria-hidden="true">
							{#each Array.from({ length: Math.min(ICONS[id], 5) }, (_, i) => i) as i (i)}
								<span class="pip"></span>
							{/each}
						</span>
						<span class="spread-name">{SPREADS[id].name}</span>
						<span class="spread-desc">{SPREADS[id].description}</span>
					</label>
				{/each}
			</fieldset>

			<label class="toggle">
				<input type="checkbox" bind:checked={reversals} disabled={phase === 'shuffling'} />
				<span class="track" aria-hidden="true"><span class="thumb"></span></span>
				Allow reversed cards
			</label>

			{#if error}
				<p class="error" role="alert">{error}</p>
			{/if}

			<button class="draw" type="submit" disabled={phase === 'shuffling'}>
				{phase === 'shuffling' ? 'Shuffling…' : 'Draw the cards'}
			</button>
		</form>

		{#if phase === 'shuffling'}
			<div class="deck" aria-label="Shuffling the deck" role="status" transition:fade>
				{#each [0, 1, 2] as i (i)}
					<div class="deck-card" style="--i:{i}"><CardBack /></div>
				{/each}
			</div>
		{/if}

		{#if history.length}
			<details class="history">
				<summary>Your recent readings</summary>
				<ul>
					{#each history as entry (entry.path)}
						<li>
							<a href={entry.path}>
								<span class="when">{new Date(entry.at).toLocaleDateString()}</span>
								{SPREADS[entry.spread]?.name ?? entry.spread}: {entry.cards.join(', ')}
							</a>
						</li>
					{/each}
				</ul>
				<button type="button" class="link" onclick={() => (clearHistory(), (history = []))}>
					Forget these
				</button>
			</details>
		{/if}
	</section>
{/if}

{#if reading && (phase === 'revealing' || phase === 'read')}
	<section class="results" bind:this={results} in:fade={{ duration: 400 }}>
		<SpreadLayout
			spread={reading.spread}
			cards={reading.cards}
			{revealed}
			onselect={phase === 'read' ? (i) => (zoom = reading!.cards[i]) : undefined}
		/>

		{#if phase === 'revealing'}
			<p class="skip">
				<button type="button" class="link" onclick={finish}>Reveal all</button>
			</p>
		{:else}
			<ReadingView {reading} />
			<p class="again">
				<button type="button" class="draw" onclick={again}>Ask another question</button>
			</p>
		{/if}
	</section>
{/if}

<CardZoom card={zoom} onclose={() => (zoom = null)} />

<style>
	.ask {
		max-width: 40rem;
		margin: 0 auto;
		text-align: center;
	}
	.lede {
		font-size: 1.35rem;
		font-style: italic;
		color: var(--ink-soft);
		margin: 0.6rem 0 0.8rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.3rem;
		margin-top: 1.6rem;
	}

	.question {
		position: relative;
		display: block;
	}
	textarea {
		width: 100%;
		resize: vertical;
		min-height: 6.5rem;
		padding: 1rem 1.1rem 1.6rem;
		font: inherit;
		font-size: 1.25rem;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--gold) 45%, transparent);
		border-radius: var(--radius);
		box-shadow: inset 0 0 18px rgb(0 0 0 / 0.15);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}
	textarea::placeholder {
		color: var(--muted);
		font-style: italic;
	}
	textarea:focus {
		outline: none;
		border-color: var(--gold);
		box-shadow:
			inset 0 0 18px rgb(0 0 0 / 0.15),
			var(--glow);
	}
	.count {
		position: absolute;
		right: 0.9rem;
		bottom: 0.5rem;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.count.near {
		color: var(--gold);
	}

	.spreads {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.8rem;
		margin: 0;
		padding: 0;
		border: none;
	}
	legend {
		width: 100%;
		margin-bottom: 0.6rem;
		font-family: var(--font-head);
		font-size: 0.85rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.spread {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.9rem 0.8rem 1rem;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--gold) 25%, transparent);
		border-radius: var(--radius);
		cursor: pointer;
		transition:
			border-color 0.2s,
			box-shadow 0.2s,
			transform 0.2s;
	}
	.spread:hover {
		transform: translateY(-2px);
	}
	.spread.chosen {
		border-color: var(--emerald);
		box-shadow:
			0 0 0 1px var(--emerald),
			0 0 22px color-mix(in srgb, var(--emerald) 30%, transparent);
	}
	.spread input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.spread:has(input:focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 3px;
	}
	.pips {
		display: flex;
		gap: 3px;
		height: 1.6rem;
		align-items: center;
	}
	.pip {
		width: 0.7rem;
		height: 1.15rem;
		border-radius: 2px;
		background: linear-gradient(160deg, var(--violet), var(--violet-deep));
		border: 1px solid var(--gold);
	}
	.spread-name {
		font-family: var(--font-head);
		font-size: 1rem;
		color: var(--ink);
	}
	.spread-desc {
		font-size: 0.95rem;
		line-height: 1.3;
		color: var(--muted);
	}

	.toggle {
		display: inline-flex;
		align-self: center;
		align-items: center;
		gap: 0.7rem;
		font-size: 1.1rem;
		color: var(--ink-soft);
		cursor: pointer;
	}
	.toggle input {
		position: absolute;
		opacity: 0;
	}
	.track {
		position: relative;
		width: 2.8rem;
		height: 1.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--muted) 35%, transparent);
		border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
		transition: background 0.25s;
	}
	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		background: var(--gold-bright);
		transition: transform 0.25s;
	}
	.toggle input:checked + .track {
		background: var(--emerald);
	}
	.toggle input:checked + .track .thumb {
		transform: translateX(1.3rem);
	}
	.toggle input:focus-visible + .track {
		outline: 2px solid var(--ring);
		outline-offset: 3px;
	}

	.draw {
		align-self: center;
		padding: 0.85rem 2.4rem;
		font-family: var(--font-head);
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #1a0d2c;
		background: linear-gradient(180deg, #f6e2a0, #d8b25a 55%, #b38a30);
		border: 1px solid #f3d98b;
		border-radius: 999px;
		box-shadow:
			0 6px 20px rgb(216 178 90 / 0.35),
			inset 0 1px 0 rgb(255 255 255 / 0.5);
		cursor: pointer;
		transition:
			transform 0.15s,
			box-shadow 0.2s;
	}
	.draw:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow:
			0 10px 28px rgb(216 178 90 / 0.5),
			inset 0 1px 0 rgb(255 255 255 / 0.5);
	}
	.draw:disabled {
		opacity: 0.7;
		cursor: progress;
	}

	.error {
		margin: 0;
		color: #ff9a9a;
	}

	.deck {
		position: relative;
		width: 120px;
		height: 208px;
		margin: 2.2rem auto 0;
	}
	.deck-card {
		position: absolute;
		inset: 0;
		border-radius: 9px;
		overflow: hidden;
		box-shadow: var(--shadow);
		animation: riffle 0.7s ease-in-out infinite alternate;
		animation-delay: calc(var(--i) * -0.23s);
	}
	@keyframes riffle {
		from {
			transform: translateX(-38px) rotate(-8deg);
		}
		to {
			transform: translateX(38px) rotate(8deg);
		}
	}

	.history {
		margin-top: 2.4rem;
		text-align: left;
		color: var(--ink-soft);
	}
	.history summary {
		cursor: pointer;
		font-family: var(--font-head);
		font-size: 0.9rem;
		letter-spacing: 0.08em;
		color: var(--gold);
		text-align: center;
	}
	.history ul {
		list-style: none;
		padding: 0;
		margin: 1rem 0;
	}
	.history li {
		padding: 0.4rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--gold) 15%, transparent);
		font-size: 1rem;
	}
	.history a {
		color: var(--ink-soft);
		text-decoration: none;
	}
	.history a:hover {
		color: var(--gold-bright);
	}
	.when {
		color: var(--emerald);
		margin-right: 0.5rem;
	}

	.link {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--gold);
		text-decoration: underline;
		cursor: pointer;
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: 2.2rem;
		padding-top: 1.4rem;
		scroll-margin-top: 1rem;
	}
	.skip,
	.again {
		text-align: center;
		margin: 0;
	}
</style>
