<script lang="ts">
  import { resolve } from '$app/paths';
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import HomeSummary from '$lib/components/HomeSummary.svelte';
  import OnboardingCard from '$lib/components/OnboardingCard.svelte';
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

  // Schengen is shown only as a neutral practical "recorded" view — never as
  // an allowance or "days left" — so the hero stays Portugal-only and this
  // figure reports the number of Schengen-absence days recorded so far.
  const schengenRecorded = $derived(compliance ? compliance.schengen.interpolated.used : 0);

  // Planned-trips impact card — render only when planned trips exist
  const hasPlanned = $derived(data.trips.some((t) => t.status === 'planned'));

  // Portugal: legal allowance → remaining ("days left") framing.
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
  // Schengen: practical view → recorded/used ("days recorded") framing.
  const schengenNowUsed = $derived(compliance ? compliance.schengen.interpolated.used : 0);
  const schengenProjectedUsed = $derived(
    compliance ? compliance.schengen.projectedAfterPlanned.interpolatedUsed : 0
  );
</script>

{#if !data.loaded}
  <p class="caption">Loading…</p>
{:else if data.cards.length === 0}
  <!-- Fresh user — full onboarding card (install + backup + sync guidance) -->
  <OnboardingCard />
{:else if !activeCard}
  <!-- Existing user, no card active right now (e.g. last card just expired) -->
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

  <!-- Schengen recorded chip (neutral, practical view — not an allowance) -->
  <p class="caption mb-4 flex items-center justify-center gap-1.5 text-center">
    <!-- Neutral globe icon (deliberately not the EU flag — this is a
         practical recorded view, not a legal limit). -->
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-3.5 w-3.5 text-neutral-400"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
    <span class="text-neutral-500">Schengen absence:</span>
    <strong>{schengenRecorded} days recorded</strong>
  </p>

  <!-- Planned trips impact (only if any planned trip exists) -->
  {#if hasPlanned}
    <div class="card mb-4 space-y-3">
      <h3 class="section-title">Planned trips impact</h3>
      <p class="caption-muted">
        If you take your planned trips, your remaining days will change like this:
      </p>
      <div class="space-y-1.5 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-neutral-600">Portugal absence</span>
          <span>
            <span class="text-neutral-500">{portugalNowLeft}</span>
            <span class="text-neutral-400">→</span>
            <strong>{portugalProjectedLeft}</strong>
            <span class="text-neutral-500">days left</span>
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-neutral-600">Schengen absence</span>
          <span>
            <span class="text-neutral-500">{schengenNowUsed}</span>
            <span class="text-neutral-400">→</span>
            <strong>{schengenProjectedUsed}</strong>
            <span class="text-neutral-500">days recorded</span>
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
