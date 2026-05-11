<script lang="ts">
  let { label, used, budget, sub }: { label: string; used: number; budget: number; sub: string } =
    $props();

  const pct = $derived(Math.min(100, Math.round((used / budget) * 100)));
  const tone = $derived(pct < 50 ? 'ok' : pct < 80 ? 'warn' : 'danger');
  const barColor = $derived(
    tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-red-500'
  );
</script>

<div class="rounded-xl border bg-white p-4 dark:bg-neutral-900">
  <div class="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
  <div class="mt-1 text-3xl font-bold">
    {used}<span class="text-sm font-medium text-neutral-500"> / {budget} days</span>
  </div>
  <div class="mt-1 text-xs text-neutral-500">{sub}</div>
  <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
    <div class="h-full {barColor}" style="width: {pct}%"></div>
  </div>
</div>
