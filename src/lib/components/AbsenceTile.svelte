<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    used,
    budget,
    sub,
    icon
  }: {
    label: string;
    used: number;
    budget: number;
    sub: string;
    icon?: Snippet;
  } = $props();

  const pct = $derived(budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0);
  const remaining = $derived(Math.max(0, budget - used));
  const tone = $derived(pct < 50 ? 'ok' : pct < 80 ? 'warn' : 'danger');
  const barColor = $derived(
    tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-red-500'
  );
</script>

<div class="card">
  <div class="flex items-center gap-2.5">
    {#if icon}
      <span class="metric-icon-circle">{@render icon()}</span>
    {/if}
    <div class="text-[15px] font-semibold">{label}</div>
  </div>
  <div class="mt-3 text-[34px] font-bold leading-none">
    {used}<span class="text-sm font-medium text-neutral-500"> / {budget} days used</span>
  </div>
  <div class="caption mt-2">{pct}% used · {remaining} days remaining</div>
  <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200/70">
    <div class="h-full {barColor}" style="width: {pct}%"></div>
  </div>
  <div class="caption-muted mt-2.5">{sub}</div>
</div>
