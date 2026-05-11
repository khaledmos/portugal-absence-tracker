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

<div class="rounded-xl border bg-white p-4 dark:bg-neutral-900">
  <h3 class="mb-2 text-sm font-semibold">Card timeline</h3>
  <div class="relative h-7 rounded bg-neutral-100 dark:bg-neutral-800">
    {#each trips as t (t.id)}
      {@const left = pct(t.portugalExitDate)}
      {@const width = Math.max(0.5, pct(t.portugalReturnDate) - left)}
      <div
        class="absolute top-1 h-5 rounded-sm {t.status === 'past'
          ? 'bg-blue-600'
          : 'border border-dashed border-blue-700 bg-blue-300'}"
        style="left: {left}%; width: {width}%"
        title="{t.portugalExitDate} → {t.portugalReturnDate}"
      ></div>
    {/each}
    <div class="absolute -top-0.5 -bottom-0.5 w-0.5 bg-red-500" style="left: {pct(today)}%"></div>
  </div>
  <div class="mt-2 flex justify-between text-[10px] text-neutral-500">
    <span>{card.issuedDate}</span>
    <span>today</span>
    <span>{card.expiryDate}</span>
  </div>
  <div class="mt-2 flex items-center gap-3 text-[10px] text-neutral-500">
    <span class="flex items-center gap-1">
      <span class="inline-block h-2 w-3 rounded-sm bg-blue-600"></span> Trips outside Portugal
    </span>
    <span class="flex items-center gap-1">
      <span class="inline-block h-3 w-0.5 bg-red-500"></span> Today
    </span>
  </div>
</div>
