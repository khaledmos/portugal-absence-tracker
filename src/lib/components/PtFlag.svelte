<script lang="ts">
  // Stylised Portuguese flag — green/red bands with an approximated coat of
  // arms (yellow armillary disc + small red/white shield) that reads as a
  // crest at 18-22px, rather than a target.
  let { size = 20 }: { size?: number } = $props();
  // Unique clip ID so multiple instances on the same page don't collide.
  const id = $props.id();
</script>

<svg viewBox="0 0 24 24" width={size} height={size} class="flex-shrink-0" aria-label="Portugal">
  <defs>
    <clipPath id="pt-clip-{id}"><circle cx="12" cy="12" r="11" /></clipPath>
  </defs>
  <g clip-path="url(#pt-clip-{id})">
    <rect x="0" y="0" width="9" height="24" fill="#006837" />
    <rect x="9" y="0" width="15" height="24" fill="#D52B1E" />
    <!-- Yellow armillary disc -->
    <circle cx="9" cy="12" r="4" fill="#FFCC00" />
    <!-- Red shield: rounded-top rectangle with a triangular bottom -->
    <path d="M7.2 10 L10.8 10 L10.8 12.8 L9 14.6 L7.2 12.8 Z" fill="#D52B1E" />
    <!-- White inner shield -->
    <path d="M8 10.6 L10 10.6 L10 12.4 L9 13.5 L8 12.4 Z" fill="#FFFFFF" />
  </g>
  <circle cx="12" cy="12" r="11" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="0.5" />
</svg>
