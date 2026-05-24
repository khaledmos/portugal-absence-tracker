<script lang="ts">
  import type { Card } from '$lib/domain/types';
  import type { CardCompliance } from '$lib/engine/compliance';

  let { card, compliance }: { card: Card; compliance: CardCompliance } = $props();

  // Card validity progress — outer ring (always reflects today, never planned trips)
  const cardElapsedPct = $derived(
    Math.min(100, Math.round((compliance.elapsedDays / compliance.validityDays) * 100))
  );
  const cardDaysRemaining = $derived(Math.max(0, compliance.validityDays - compliance.elapsedDays));

  // Portugal absence — inner ring (always current count, never projected/planned)
  const absenceUsed = $derived(compliance.portugal.interpolated.used);
  const absenceBudget = $derived(compliance.portugal.interpolated.budgetDays);
  const absencePct = $derived(
    absenceBudget > 0 ? Math.min(100, Math.round((absenceUsed / absenceBudget) * 100)) : 0
  );
  const absenceDaysRemaining = $derived(Math.max(0, absenceBudget - absenceUsed));

  // Inner ring color follows the same tone scale as the absence tiles
  const absenceColor = $derived(
    absencePct < 50 ? '#10b981' : absencePct < 80 ? '#f59e0b' : '#ef4444'
  );

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
  <div class="flex flex-col items-center">
    <!-- Nested rings + HTML overlay for centre text -->
    <div class="relative">
      <svg
        viewBox="0 0 200 200"
        class="h-44 w-44 sm:h-52 sm:w-52"
        role="img"
        aria-label="Card validity {cardElapsedPct}% elapsed, Portugal absence {absencePct}% used"
      >
        <!-- Outer ring (card validity) -->
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
        <!-- Inner ring (Portugal absence used) -->
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
          style="transition: stroke-dashoffset 0.6s ease;"
        />
      </svg>
      <!-- Centre text overlay (HTML — more reliable than SVG <text> across iOS Safari) -->
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div class="text-[28px] font-bold leading-none sm:text-[32px]">
          {absenceDaysRemaining}
        </div>
        <div class="mt-1 text-xs text-neutral-500">days left</div>
      </div>
    </div>

    <!-- Legend: ring colour + percentage -->
    <div class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-600">
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-2.5 w-2.5 rounded-full" style="background: {CARD_RING};"></span>
        Card {cardElapsedPct}% elapsed
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-2.5 w-2.5 rounded-full" style="background: {absenceColor};"
        ></span>
        Absence {absencePct}% used
      </span>
    </div>

    <!-- Plain-English summary -->
    <p class="mt-4 text-center text-[15px] leading-snug">
      You have <strong>{absenceDaysRemaining} days</strong> left outside Portugal, within
      <strong>{cardDaysRemaining} days</strong> remaining on this card.
    </p>

    <!-- Subtitle -->
    <p class="caption-muted mt-2">
      Active card · {card.issuedDate} → {card.expiryDate}
    </p>
  </div>
</div>
