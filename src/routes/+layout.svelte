<script lang="ts">
	import '#lib/styles/theme.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="sky" aria-hidden="true"></div>

<header>
	<a href="/" class="brand">
		<span class="mark" aria-hidden="true">☾</span>
		<span class="title">Tarot</span>
		<span class="sub">trackr.live</span>
	</a>
</header>

<main>
	{@render children()}
</main>

<footer>
	<p>
		For reflection and entertainment only. Tarot doesn't predict the future, and nothing here is
		medical, legal, or financial advice.
	</p>
	<p class="credit">
		Card art by Pamela Colman Smith (1909), public domain. Readings are written in advance and
		chosen for your question by <a href="https://typesafe.ai" rel="noopener">Jev</a>; no text is
		generated on the fly.
	</p>
</footer>

<style>
	.sky {
		position: fixed;
		inset: 0;
		z-index: -1;
		background:
			radial-gradient(
				ellipse 80% 50% at 50% -10%,
				color-mix(in srgb, var(--violet) 45%, transparent),
				transparent 70%
			),
			radial-gradient(
				ellipse 60% 40% at 100% 100%,
				color-mix(in srgb, var(--emerald-deep) 55%, transparent),
				transparent 70%
			),
			radial-gradient(
				ellipse 50% 40% at 0% 80%,
				color-mix(in srgb, var(--violet-deep) 60%, transparent),
				transparent 70%
			),
			var(--bg);
	}
	.sky::before,
	.sky::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			radial-gradient(1px 1px at 20% 30%, var(--gold-bright), transparent),
			radial-gradient(1px 1px at 70% 15%, #fff, transparent),
			radial-gradient(1.5px 1.5px at 40% 70%, var(--gold-bright), transparent),
			radial-gradient(1px 1px at 85% 55%, #fff, transparent),
			radial-gradient(1px 1px at 10% 85%, var(--gold-bright), transparent),
			radial-gradient(1.2px 1.2px at 60% 45%, #fff, transparent),
			radial-gradient(1px 1px at 93% 88%, var(--gold-bright), transparent);
		background-size: 340px 340px;
		opacity: 0.55;
		animation: twinkle 7s ease-in-out infinite alternate;
	}
	.sky::after {
		background-size: 510px 510px;
		background-position: 130px 90px;
		animation-delay: -3.5s;
		opacity: 0.35;
	}
	@keyframes twinkle {
		from {
			opacity: 0.2;
		}
		to {
			opacity: 0.6;
		}
	}
	@media (prefers-color-scheme: light) {
		.sky::before,
		.sky::after {
			opacity: 0.15;
		}
	}

	header {
		display: flex;
		justify-content: center;
		padding: 1.6rem 1rem 0.4rem;
	}
	.brand {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		text-decoration: none;
		color: var(--ink);
	}
	.mark {
		font-size: 1.6rem;
		color: var(--gold);
		text-shadow: var(--glow);
	}
	.title {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 6vw, 2.6rem);
		background: linear-gradient(180deg, var(--gold-bright), var(--gold));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.sub {
		font-family: var(--font-head);
		font-size: 0.8rem;
		letter-spacing: 0.2em;
		color: var(--emerald);
		text-transform: uppercase;
	}

	main {
		padding: 0 16px 3rem;
	}

	footer {
		max-width: 44rem;
		margin: 0 auto;
		padding: 2rem 16px 3rem;
		text-align: center;
		font-size: 0.95rem;
		color: var(--muted);
		border-top: 1px solid color-mix(in srgb, var(--gold) 25%, transparent);
	}
	.credit {
		font-size: 0.85rem;
	}
</style>
