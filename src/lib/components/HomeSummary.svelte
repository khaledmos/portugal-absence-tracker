<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import type { CardCompliance } from '$lib/engine/compliance';
  import PtFlag from './PtFlag.svelte';
  import EuFlag from './EuFlag.svelte';

  let { compliance }: { compliance: CardCompliance } = $props();

  // Active scope is derived from settings (`'both'` falls back to Portugal).
  const scope = $derived<'portugal' | 'schengen'>(
    data.settings.defaultScopeView === 'schengen' ? 'schengen' : 'portugal'
  );

  async function switchScope(next: 'portugal' | 'schengen') {
    if (next === scope) return;
    await data.updateSettings({ defaultScopeView: next });
  }

  // Outer ring: card validity (scope-independent)
  const cardElapsedPct = $derived(
    Math.min(100, Math.round((compliance.elapsedDays / compliance.validityDays) * 100))
  );
  const cardDaysRemaining = $derived(Math.max(0, compliance.validityDays - compliance.elapsedDays));

  // Inner ring: absence for the active scope (always current count)
  const scopeCompliance = $derived(
    scope === 'portugal' ? compliance.portugal : compliance.schengen
  );
  const absenceUsed = $derived(scopeCompliance.interpolated.used);
  const absenceBudget = $derived(scopeCompliance.interpolated.budgetDays);
  const absencePct = $derived(
    absenceBudget > 0 ? Math.min(100, Math.round((absenceUsed / absenceBudget) * 100)) : 0
  );
  const absenceDaysRemaining = $derived(Math.max(0, absenceBudget - absenceUsed));

  const absenceColor = $derived(
    absencePct < 50 ? '#10b981' : absencePct < 80 ? '#f59e0b' : '#ef4444'
  );
  // Short label used in the legend (e.g. "Portugal absence: 53% used").
  const scopeLabel = $derived(scope === 'portugal' ? 'Portugal' : 'Schengen');
  // Long label used in the sentence — "the Schengen Area" reads better than bare "Schengen".
  const scopeSentenceLabel = $derived(scope === 'portugal' ? 'Portugal' : 'the Schengen Area');

  // Ring geometry (SVG viewBox 200×200, centre 100,100)
  const OUTER_R = 88;
  const INNER_R = 68;
  const STROKE = 10;
  const TRACK = '#e5e7eb';
  const CARD_RING = '#10b981';
  const OUTER_C = 2 * Math.PI * OUTER_R;
  const INNER_C = 2 * Math.PI * INNER_R;

  const outerOffset = $derived(OUTER_C * (1 - cardElapsedPct / 100));
  const innerOffset = $derived(INNER_C * (1 - absencePct / 100));
</script>

<div class="card">
  <!-- Scope tabs -->
  <div class="tab-toggle mb-4">
    <button
      class="tab-toggle-btn flex items-center justify-center gap-1.5 {scope === 'portugal'
        ? 'tab-toggle-btn-active'
        : ''}"
      onclick={() => switchScope('portugal')}
    >
      <PtFlag size={18} />
      Portugal absence
    </button>
    <button
      class="tab-toggle-btn flex items-center justify-center gap-1.5 {scope === 'schengen'
        ? 'tab-toggle-btn-active'
        : ''}"
      onclick={() => switchScope('schengen')}
    >
      <EuFlag size={18} />
      Schengen absence
    </button>
  </div>

  <!-- Title (no inline flag — scope is already conveyed by the active tab,
       legend, and sentence; pairing a scope flag with "Your remaining
       allowance" risks implying each scope has its own separate budget). -->
  <div class="mb-3 text-center">
    <h2 class="section-title">Your remaining allowance</h2>
  </div>

  <!-- Rings + centre overlay -->
  <div class="flex flex-col items-center">
    <div class="relative">
      <svg
        viewBox="0 0 200 200"
        class="h-44 w-44 sm:h-52 sm:w-52"
        role="img"
        aria-label="{scopeLabel} absence {absencePct}% used; card validity {cardElapsedPct}% passed"
      >
        <circle cx="100" cy="100" r={OUTER_R} stroke={TRACK} stroke-width={STROKE} fill="none" />
        <circle
          cx="100"
          cy="100"
          r={OUTER_R}
          stroke={CARD_RING}
          stroke-width={STROKE}
          fill="none"
          stroke-dasharray={OUTER_C}
          stroke-dashoffset={outerOffset}
          stroke-linecap="round"
          transform="rotate(-90 100 100)"
          style="transition: stroke-dashoffset 0.6s ease;"
        />
        <circle cx="100" cy="100" r={INNER_R} stroke={TRACK} stroke-width={STROKE} fill="none" />
        <circle
          cx="100"
          cy="100"
          r={INNER_R}
          stroke={absenceColor}
          stroke-width={STROKE}
          fill="none"
          stroke-dasharray={INNER_C}
          stroke-dashoffset={innerOffset}
          stroke-linecap="round"
          transform="rotate(-90 100 100)"
          style="transition: stroke-dashoffset 0.6s ease, stroke 0.3s ease;"
        />
      </svg>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div class="text-[28px] font-bold leading-none sm:text-[32px]">
          {absenceDaysRemaining}
        </div>
        <div class="mt-1 text-xs text-neutral-500">days left</div>
      </div>
    </div>

    <!-- Legend: absence first, new wording -->
    <div class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-600">
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-2.5 w-2.5 rounded-full" style="background: {absenceColor};"
        ></span>
        {scopeLabel} absence: {absencePct}% used
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-2.5 w-2.5 rounded-full" style="background: {CARD_RING};"></span>
        Card validity: {cardElapsedPct}% passed
      </span>
    </div>

    <!-- Sentence -->
    <p class="mt-4 text-center text-[15px] leading-snug">
      You can spend up to <strong>{absenceDaysRemaining} more days</strong> outside
      {scopeSentenceLabel} within the <strong>{cardDaysRemaining} days</strong> remaining on this card.
    </p>

    <!-- Subtitle -->
    <p class="caption-muted mt-2">
      You've used {absenceUsed} out of {absenceBudget} days of your absence allowance
    </p>
  </div>
</div>
