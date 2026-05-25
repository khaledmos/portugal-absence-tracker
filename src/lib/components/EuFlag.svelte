<script lang="ts">
  // Stylised EU flag (used as the Schengen Area marker) — blue disc with
  // 12 yellow stars evenly spaced on a circle.
  let { size = 20 }: { size?: number } = $props();

  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
    return { cx: 12 + 7 * Math.cos(angle), cy: 12 + 7 * Math.sin(angle) };
  });
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class="flex-shrink-0"
  aria-label="Schengen Area"
>
  <circle cx="12" cy="12" r="11" fill="#003399" />
  <g fill="#FFCC00">
    {#each stars as s, i (i)}
      <circle cx={s.cx} cy={s.cy} r="0.9" />
    {/each}
  </g>
  <circle cx="12" cy="12" r="11" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="0.5" />
</svg>
