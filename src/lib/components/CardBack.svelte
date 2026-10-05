<!--
	The card back: violet field, emerald inner frame, a gilt sun with a crescent
	moon inside it, and a scatter of stars. Pure SVG, so it is crisp at any size
	and costs nothing to load.
-->
<svg viewBox="0 0 120 208" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
	<defs>
		<radialGradient id="cb-field" cx="50%" cy="45%" r="75%">
			<stop offset="0%" stop-color="#4a2a7c" />
			<stop offset="70%" stop-color="#26123f" />
			<stop offset="100%" stop-color="#160a27" />
		</radialGradient>
		<linearGradient id="cb-gilt" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#f6e2a0" />
			<stop offset="50%" stop-color="#cfa449" />
			<stop offset="100%" stop-color="#8c6a24" />
		</linearGradient>
		<pattern id="cb-stars" width="24" height="24" patternUnits="userSpaceOnUse">
			<circle cx="4" cy="6" r="0.6" fill="#f3d98b" opacity="0.55" />
			<circle cx="16" cy="18" r="0.45" fill="#f3d98b" opacity="0.4" />
			<circle cx="19" cy="4" r="0.35" fill="#ffffff" opacity="0.35" />
		</pattern>
	</defs>

	<rect width="120" height="208" rx="8" fill="url(#cb-field)" />
	<rect width="120" height="208" rx="8" fill="url(#cb-stars)" />
	<rect
		x="5"
		y="5"
		width="110"
		height="198"
		rx="5"
		fill="none"
		stroke="url(#cb-gilt)"
		stroke-width="1.4"
	/>
	<rect
		x="9"
		y="9"
		width="102"
		height="190"
		rx="3"
		fill="none"
		stroke="#2f9e78"
		stroke-width="0.9"
	/>

	<!-- corner flourishes -->
	{#each [[9, 9, 1, 1], [111, 9, -1, 1], [9, 199, 1, -1], [111, 199, -1, -1]] as [x, y, sx, sy] (`${x}-${y}`)}
		<g
			transform="translate({x} {y}) scale({sx} {sy})"
			fill="none"
			stroke="url(#cb-gilt)"
			stroke-width="0.9"
		>
			<path d="M0 14 C0 5, 5 0, 14 0" />
			<path d="M4 18 C6 10, 10 6, 18 4" opacity="0.7" />
			<circle cx="5" cy="5" r="1.4" fill="url(#cb-gilt)" stroke="none" />
		</g>
	{/each}

	<!-- sun -->
	<g transform="translate(60 104)">
		{#each Array.from({ length: 16 }, (_, i) => i * 22.5) as angle (angle)}
			<path
				d="M0 -22 L2.2 -34 L0 -40 L-2.2 -34 Z"
				transform="rotate({angle})"
				fill="url(#cb-gilt)"
				opacity={angle % 45 === 0 ? 1 : 0.6}
			/>
		{/each}
		<circle r="21" fill="none" stroke="url(#cb-gilt)" stroke-width="1.4" />
		<circle r="17" fill="#1d0f33" stroke="#2f9e78" stroke-width="0.8" />
		<!-- crescent -->
		<path d="M4 -11 A11 11 0 1 0 4 11 A8.5 8.5 0 1 1 4 -11 Z" fill="url(#cb-gilt)" />
		<circle cx="7.5" cy="-2" r="0.9" fill="#f3d98b" />
	</g>

	<!-- top and bottom stars -->
	{#each [40, 168] as cy (cy)}
		<path
			transform="translate(60 {cy})"
			d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z"
			fill="url(#cb-gilt)"
		/>
		<circle
			cx="60"
			{cy}
			r="11"
			fill="none"
			stroke="#2f9e78"
			stroke-width="0.6"
			stroke-dasharray="1 2"
		/>
	{/each}
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
