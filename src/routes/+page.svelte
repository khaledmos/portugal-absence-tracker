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

  const elapsedPct = $derived(
    compliance
      ? Math.min(100, Math.round((compliance.elapsedDays / compliance.validityDays) * 100))
      : 0
  );
</script>

{#if !data.loaded}
  <p class="caption">Loading…</p>
{:else if !activeCard}
  <div class="card text-center">
    <p class="mb-2">No active residence card.</p>
    <a href={resolve('/cards')} class="text-sm underline">Add a card →</a>
  </div>
{:else if compliance}
  <!-- Active card header (dark) -->
  <div class="card-dark mb-4 flex items-stretch gap-4">
    <!-- Stylized residence-card illustration -->
    <div class="relative flex-shrink-0">
      <svg
        width="86"
        height="74"
        viewBox="0 0 100 86"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        class="rounded-xl"
      >
        <!-- Card body -->
        <rect
          x="3"
          y="3"
          width="86"
          height="60"
          rx="8"
          fill="#ffffff"
          stroke="#e2e8f0"
          stroke-width="1"
        />
        <!-- Soft shield/crest accent -->
        <path
          d="M14 14 L22 11 L30 14 L30 25 C30 30 22 35 22 35 C22 35 14 30 14 25 Z"
          fill="#10b981"
          fill-opacity="0.15"
          stroke="#10b981"
          stroke-width="1.25"
          stroke-linejoin="round"
        />
        <path
          d="M19 22 L21.5 25 L26 19"
          stroke="#10b981"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
        <!-- Data lines (right side of card) -->
        <rect x="40" y="14" width="38" height="3" rx="1.5" fill="#94a3b8" opacity="0.6" />
        <rect x="40" y="22" width="28" height="2" rx="1" fill="#cbd5e1" opacity="0.7" />
        <rect x="40" y="28" width="32" height="2" rx="1" fill="#cbd5e1" opacity="0.7" />
        <!-- Bottom info line -->
        <rect x="14" y="50" width="48" height="2.5" rx="1.25" fill="#cbd5e1" opacity="0.55" />
        <!-- Green checkmark badge -->
        <circle cx="22" cy="68" r="13" fill="#10b981" />
        <path
          d="M16.5 68.5 L20.5 72.5 L27.5 65"
          stroke="#ffffff"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
    </div>

    <!-- Card metadata -->
    <div class="min-w-0 flex-1">
      <div class="text-[11px] font-medium uppercase tracking-wider opacity-60">Active card</div>
      <div class="mt-0.5 truncate text-xl font-bold">{activeCard.label}</div>
      <div class="mt-1 text-xs opacity-75">
        {activeCard.issuedDate} → {activeCard.expiryDate}
      </div>
      <div class="mt-0.5 text-xs opacity-75">
        {compliance.elapsedDays} / {compliance.validityDays} days elapsed · {elapsedPct}%
      </div>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div class="h-full bg-emerald-300" style="width: {elapsedPct}%"></div>
      </div>
    </div>
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
