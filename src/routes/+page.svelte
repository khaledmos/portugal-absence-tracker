<script lang="ts">
  import { resolve } from '$app/paths';
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import HomeSummary from '$lib/components/HomeSummary.svelte';
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

  // Active scope (mirror of HomeSummary's source-of-truth — settings)
  const scope = $derived<'portugal' | 'schengen'>(
    data.settings.defaultScopeView === 'schengen' ? 'schengen' : 'portugal'
  );

  // "Other-scope" chip below the hero — opposite scope at a glance
  const otherCompliance = $derived(
    compliance ? (scope === 'portugal' ? compliance.schengen : compliance.portugal) : null
  );
  const otherScopeLabel = $derived(scope === 'portugal' ? 'Schengen' : 'Portugal');
  const otherDaysLeft = $derived(
    otherCompliance
      ? Math.max(0, otherCompliance.interpolated.budgetDays - otherCompliance.interpolated.used)
      : 0
  );
  const otherPct = $derived(
    otherCompliance && otherCompliance.interpolated.budgetDays > 0
      ? Math.min(
          100,
          Math.round(
            (otherCompliance.interpolated.used / otherCompliance.interpolated.budgetDays) * 100
          )
        )
      : 0
  );

  // Planned-trips impact card — render only when planned trips exist
  const hasPlanned = $derived(data.trips.some((t) => t.status === 'planned'));

  const portugalNowLeft = $derived(
    compliance
      ? Math.max(
          0,
          compliance.portugal.interpolated.budgetDays - compliance.portugal.interpolated.used
        )
      : 0
  );
  const portugalProjectedLeft = $derived(
    compliance
      ? Math.max(
          0,
          compliance.portugal.interpolated.budgetDays -
            compliance.portugal.projectedAfterPlanned.interpolatedUsed
        )
      : 0
  );
  const schengenNowLeft = $derived(
    compliance
      ? Math.max(
          0,
          compliance.schengen.interpolated.budgetDays - compliance.schengen.interpolated.used
        )
      : 0
  );
  const schengenProjectedLeft = $derived(
    compliance
      ? Math.max(
          0,
          compliance.schengen.interpolated.budgetDays -
            compliance.schengen.projectedAfterPlanned.interpolatedUsed
        )
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
  <!-- HERO -->
  <div class="mb-3">
    <HomeSummary {compliance} />
  </div>

  {#if compliance.portugal.consecutive.currentlyAbroad}
    <div class="card mb-3 border-l-4 border-amber-400 !rounded-l-md">
      <div class="text-sm">
        <strong>You are currently abroad —</strong> day {compliance.portugal.consecutive
          .currentStreakDays}. Return by
        <strong>{compliance.portugal.consecutive.limitDate}</strong>
        to stay under the {compliance.portugal.consecutive.budgetMonths}-month consecutive limit.
      </div>
    </div>
  {/if}

  <!-- Other-scope chip (single line) -->
  {#if otherCompliance}
    <p class="caption mb-4 text-center">
      <span class="text-neutral-500">{otherScopeLabel} absence:</span>
      <strong>{otherDaysLeft} days left</strong>
      <span class="text-neutral-400">·</span>
      <span class="text-neutral-500">{otherPct}% used</span>
    </p>
  {/if}

  <!-- Planned trips impact (only if any planned trip exists) -->
  {#if hasPlanned}
    <div class="card mb-4 space-y-3">
      <h3 class="section-title">Planned trips impact</h3>
      <p class="caption-muted">
        If you take your planned trips, your remaining days will change like this:
      </p>
      <div class="space-y-1.5 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-neutral-600">Portugal</span>
          <span>
            <span class="text-neutral-500">{portugalNowLeft}</span>
            <span class="text-neutral-400">→</span>
            <strong>{portugalProjectedLeft}</strong>
            <span class="text-neutral-500">days left</span>
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-neutral-600">Schengen</span>
          <span>
            <span class="text-neutral-500">{schengenNowLeft}</span>
            <span class="text-neutral-400">→</span>
            <strong>{schengenProjectedLeft}</strong>
            <span class="text-neutral-500">days left</span>
          </span>
        </div>
      </div>
    </div>
  {/if}

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

  <!-- Footnote at the very end -->
  <p class="caption-muted mt-4 text-center">
    8 months (≈244 days) · Calculated at 30.4375 days/month
  </p>
{/if}
