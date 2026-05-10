<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { countryFlag, countryName, isSchengen } from '$lib/domain/countries';
  import { daysBetween } from '$lib/engine/dates';
  import TripForm from './TripForm.svelte';
  import type { Trip } from '$lib/domain/types';

  type Filter = 'all' | 'past' | 'planned' | 'outside';
  let filter = $state<Filter>('all');
  let editing = $state<Trip | null>(null);
  let creating = $state(false);

  const today = todayISO();

  const filtered = $derived(
    data.trips
      .slice()
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      .filter((t) => {
        if (filter === 'past') return t.status === 'past';
        if (filter === 'planned') return t.status === 'planned';
        if (filter === 'outside') return !isSchengen(t.destinationCountry);
        return true;
      })
  );

  const tabs: [Filter, string][] = [
    ['all', 'All'],
    ['past', 'Past'],
    ['planned', 'Planned'],
    ['outside', 'Outside Schengen']
  ];

  function isCurrent(t: Trip) {
    return t.departureDate <= today && today < t.returnDate;
  }
</script>

<header class="mb-4 flex items-center justify-between">
  <h1 class="text-xl font-semibold">Trips</h1>
  <button class="rounded bg-black px-3 py-2 text-white" onclick={() => (creating = true)}
    >+ Add trip</button
  >
</header>

<div class="mb-4 flex gap-2 text-xs">
  {#each tabs as [v, label] (v)}
    <button
      class="rounded-full border px-3 py-1 {filter === v ? 'bg-black text-white' : ''}"
      onclick={() => (filter = v)}>{label}</button
    >
  {/each}
</div>

{#if creating}<TripForm onClose={() => (creating = false)} />{/if}
{#if editing}<TripForm initial={editing} onClose={() => (editing = null)} />{/if}

<ul class="mt-3 space-y-2">
  {#each filtered as t (t.id)}
    {@const current = isCurrent(t)}
    {@const sch = isSchengen(t.destinationCountry)}
    <li
      class="rounded-xl border p-3 {current
        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
        : ''}"
    >
      <button class="w-full text-left" onclick={() => (editing = t)}>
        <div class="flex justify-between">
          <span class="font-semibold"
            >{countryFlag(t.destinationCountry)}
            {countryName(t.destinationCountry)}{t.destinationCity
              ? ' — ' + t.destinationCity
              : ''}</span
          >
          <span class="text-sm font-semibold"
            >{daysBetween(t.departureDate, t.returnDate) - 1} d</span
          >
        </div>
        <div class="text-xs text-neutral-500">
          {t.departureDate} → {t.returnDate}
          {t.departureAirport ? '· ' + t.departureAirport : ''}{t.arrivalAirport
            ? '→' + t.arrivalAirport
            : ''}
        </div>
        <div class="mt-1 flex gap-1 text-xs">
          <span
            class="rounded px-1.5 py-0.5 {sch
              ? 'bg-blue-100 text-blue-900'
              : 'bg-amber-100 text-amber-900'}">{sch ? 'Schengen' : 'Outside Schengen'}</span
          >
          {#if t.purpose}<span class="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900"
              >{t.purpose}</span
            >{/if}
          {#if t.status === 'planned'}<span
              class="rounded bg-purple-100 px-1.5 py-0.5 text-purple-900">planned</span
            >{/if}
          {#if t.needsReview}<span class="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-900"
              >needs review ⚠️</span
            >{/if}
        </div>
      </button>
    </li>
  {/each}
</ul>
