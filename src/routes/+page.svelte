<script lang="ts">
  import { resolve } from '$app/paths';
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import AbsenceTile from '$lib/components/AbsenceTile.svelte';
  import Timeline from '$lib/components/Timeline.svelte';

  const today = todayISO();
  const activeCard = $derived(
    data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate)
  );
  const compliance = $derived(
    activeCard
      ? computeCardCompliance({
          card: activeCard,
          trips: data.trips,
          today,
          settings: data.settings
        })
      : null
  );
  let view = $state<'today' | 'projected'>('today');
</script>

{#if !data.loaded}
  <p>Loading…</p>
{:else if !activeCard}
  <div class="rounded-xl border p-4 text-center">
    <p>No active residence card.</p>
    <a href={resolve('/cards')} class="text-sm underline">Add a card →</a>
  </div>
{:else if compliance}
  <header class="mb-4 rounded-xl bg-black p-4 text-white">
    <div class="text-xs uppercase opacity-60">Active card</div>
    <div class="font-semibold">{activeCard.label}</div>
    <div class="mt-0.5 text-xs opacity-75">
      {activeCard.issuedDate} → {activeCard.expiryDate} · {compliance.elapsedDays} / {compliance.validityDays}
      days
    </div>
    <div class="mt-2 h-1.5 overflow-hidden rounded bg-white/20">
      <div
        class="h-full bg-emerald-300"
        style="width: {Math.min(100, (compliance.elapsedDays / compliance.validityDays) * 100)}%"
      ></div>
    </div>
  </header>

  {#if compliance.portugal.consecutive.currentlyAbroad}
    <div
      class="mb-4 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-3 text-sm dark:bg-amber-950/30"
    >
      <strong>You are currently abroad —</strong> day {compliance.portugal.consecutive
        .currentStreakDays}. Return by
      <strong>{compliance.portugal.consecutive.limitDate}</strong>
      to stay under the {compliance.portugal.consecutive.budgetMonths}-month consecutive limit.
    </div>
  {/if}

  <div class="mb-3 flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm dark:bg-neutral-800">
    <button
      class="flex-1 rounded py-1 {view === 'today' ? 'bg-black text-white' : ''}"
      onclick={() => (view = 'today')}>As of today</button
    >
    <button
      class="flex-1 rounded py-1 {view === 'projected' ? 'bg-black text-white' : ''}"
      onclick={() => (view = 'projected')}>Projected (incl. planned)</button
    >
  </div>

  <div class="mb-4 grid grid-cols-2 gap-3">
    <AbsenceTile
      label="Portugal absence"
      used={view === 'today'
        ? compliance.portugal.interpolated.used
        : compliance.portugal.projectedAfterPlanned.interpolatedUsed}
      budget={compliance.portugal.interpolated.budgetDays}
      sub={compliance.portugal.interpolated.budgetMonthsLabel}
    />
    <AbsenceTile
      label="Schengen absence"
      used={view === 'today'
        ? compliance.schengen.interpolated.used
        : compliance.schengen.projectedAfterPlanned.interpolatedUsed}
      budget={compliance.schengen.interpolated.budgetDays}
      sub={compliance.schengen.interpolated.budgetMonthsLabel}
    />
  </div>

  <div class="mb-4 rounded-xl border p-4">
    <div class="text-xs text-neutral-500">Longest consecutive absence</div>
    <div class="mt-1 font-semibold">
      {compliance.portugal.consecutive.used} d
      <span class="text-sm text-neutral-500"
        >/ {compliance.portugal.consecutive.budgetMonths}-month limit</span
      >
    </div>
  </div>

  <Timeline card={activeCard} trips={data.trips} {today} />
{/if}
