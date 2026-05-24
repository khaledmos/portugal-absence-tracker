<script lang="ts">
  import { resolve } from '$app/paths';
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import HomeSummary from '$lib/components/HomeSummary.svelte';
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
  <p class="caption">Loading…</p>
{:else if !activeCard}
  <div class="card text-center">
    <p class="mb-2">No active residence card.</p>
    <a href={resolve('/cards')} class="text-sm underline">Add a card →</a>
  </div>
{:else if compliance}
  <!-- Hero summary (always reflects today; the toggle below does not affect it) -->
  <div class="mb-4">
    <HomeSummary card={activeCard} {compliance} />
  </div>

  {#if compliance.portugal.consecutive.currentlyAbroad}
    <div class="card mb-4 border-l-4 border-amber-400 !rounded-l-md">
      <div class="text-sm">
        <strong>You are currently abroad —</strong> day {compliance.portugal.consecutive
          .currentStreakDays}. Return by
        <strong>{compliance.portugal.consecutive.limitDate}</strong>
        to stay under the {compliance.portugal.consecutive.budgetMonths}-month consecutive limit.
      </div>
    </div>
  {/if}

  <!-- View toggle -->
  <div class="tab-toggle mb-4">
    <button
      class="tab-toggle-btn {view === 'today' ? 'tab-toggle-btn-active' : ''}"
      onclick={() => (view = 'today')}>Current count</button
    >
    <button
      class="tab-toggle-btn {view === 'projected' ? 'tab-toggle-btn-active' : ''}"
      onclick={() => (view = 'projected')}>Including planned trips</button
    >
  </div>

  <!-- Absence tiles -->
  <div class="mb-4 grid grid-cols-2 gap-3">
    <AbsenceTile
      label="Outside Portugal"
      used={view === 'today'
        ? compliance.portugal.interpolated.used
        : compliance.portugal.projectedAfterPlanned.interpolatedUsed}
      budget={compliance.portugal.interpolated.budgetDays}
      sub={compliance.portugal.interpolated.budgetMonthsLabel}
    >
      {#snippet icon()}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      {/snippet}
    </AbsenceTile>
    <AbsenceTile
      label="Outside Schengen"
      used={view === 'today'
        ? compliance.schengen.interpolated.used
        : compliance.schengen.projectedAfterPlanned.interpolatedUsed}
      budget={compliance.schengen.interpolated.budgetDays}
      sub={compliance.schengen.interpolated.budgetMonthsLabel}
    >
      {#snippet icon()}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
        </svg>
      {/snippet}
    </AbsenceTile>
  </div>

  <!-- Longest single absence -->
  <div class="card mb-4 flex items-center gap-3">
    <span class="metric-icon-circle">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
        aria-hidden="true"
      >
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </svg>
    </span>
    <div class="min-w-0 flex-1">
      <div class="text-sm text-neutral-500">Longest single absence</div>
      <div class="mt-0.5">
        <span class="text-lg font-semibold">{compliance.portugal.consecutive.used} d</span>
        <span class="text-sm text-neutral-500"
          >/ {compliance.portugal.consecutive.budgetMonths}-month limit</span
        >
      </div>
    </div>
  </div>

  <Timeline card={activeCard} trips={data.trips} {today} />
{/if}
