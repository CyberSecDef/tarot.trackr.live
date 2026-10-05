<script lang="ts">
	/** A gilded divider: scrolling vines either side of a small star. */
	let { width = 280 }: { width?: number } = $props();
</script>

<svg class="flourish" viewBox="0 0 280 28" {width} aria-hidden="true">
	<g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
		<path d="M4 14 H96" />
		<path d="M184 14 H276" />
		<path d="M96 14 C108 2, 118 2, 122 10 C125 16, 117 20, 113 15" />
		<path d="M184 14 C172 2, 162 2, 158 10 C155 16, 163 20, 167 15" />
		<path d="M96 14 C108 26, 118 26, 122 18" opacity="0.6" />
		<path d="M184 14 C172 26, 162 26, 158 18" opacity="0.6" />
	</g>
	<path
		d="M140 3 L143.2 11 L151 14 L143.2 17 L140 25 L136.8 17 L129 14 L136.8 11 Z"
		fill="currentColor"
	/>
	<circle cx="140" cy="14" r="2" fill="var(--bg)" />
	<circle cx="4" cy="14" r="1.6" fill="currentColor" />
	<circle cx="276" cy="14" r="1.6" fill="currentColor" />
</svg>

<style>
	.flourish {
		display: block;
		margin: 0 auto;
		max-width: 100%;
		height: auto;
		color: var(--gold);
	}
</style>
