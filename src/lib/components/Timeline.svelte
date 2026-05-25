<script lang="ts">
  import { differenceInCalendarDays, parseISO } from 'date-fns';
  import type { Card, Trip, ISODate } from '$lib/domain/types';

  let { card, trips, today }: { card: Card; trips: Trip[]; today: ISODate } = $props();

  const total = $derived(
    differenceInCalendarDays(parseISO(card.expiryDate), parseISO(card.issuedDate)) + 1
  );

  function pct(date: ISODate): number {
    const days = differenceInCalendarDays(parseISO(date), parseISO(card.issuedDate));
    return Math.max(0, Math.min(100, (days / total) * 100));
  }
</script>

<div class="card">
  <h3 class="section-title mb-3">Absences across this card</h3>
  <div class="relative h-7 rounded-full bg-neutral-100">
    {#each trips as t (t.id)}
      {@const left = pct(t.portugalExitDate)}
      {@const width = Math.max(0.8, pct(t.portugalReturnDate) - left)}
      <div
        class="absolute top-1 h-5 rounded-md {t.status === 'past'
          ? 'bg-amber-500'
          : 'border border-dashed border-amber-500 bg-amber-200'}"
        style="left: {left}%; width: {width}%"
        title="{t.portugalExitDate} → {t.portugalReturnDate}"
      ></div>
    {/each}
    <div class="absolute -top-1 -bottom-1 w-0.5 bg-blue-500" style="left: {pct(today)}%"></div>
  </div>
  <div class="caption-muted mt-3 flex justify-between">
    <span>{card.issuedDate}</span>
    <span>today</span>
    <span>{card.expiryDate}</span>
  </div>
  <div class="caption-muted mt-3 flex items-center gap-4">
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-2.5 w-3 rounded-sm bg-amber-500"></span> Days outside Portugal
    </span>
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-3 w-0.5 bg-blue-500"></span> Today
    </span>
  </div>
</div>
