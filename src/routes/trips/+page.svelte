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
      .sort((a, b) => a.portugalExitDate.localeCompare(b.portugalExitDate))
      .filter((t) => {
        if (filter === 'past') return t.status === 'past';
        if (filter === 'planned') return t.status === 'planned';
        if (filter === 'outside') return !isSchengen(t.primaryDestinationCountry);
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
    return t.portugalExitDate <= today && today < t.portugalReturnDate;
  }
</script>

<header class="mb-5 flex items-center justify-between">
  <h1 class="page-title">Trips</h1>
  <button class="btn-primary" onclick={() => (creating = true)}>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      class="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
    Add trip
  </button>
</header>

<div class="mb-5 flex flex-wrap gap-2">
  {#each tabs as [v, label] (v)}
    <button
      class="filter-pill {filter === v ? 'filter-pill-active' : ''}"
      onclick={() => (filter = v)}>{label}</button
    >
  {/each}
</div>

{#if creating}<div class="mb-4"><TripForm onClose={() => (creating = false)} /></div>{/if}
{#if editing}
  <div class="mb-4"><TripForm initial={editing} onClose={() => (editing = null)} /></div>
{/if}

<ul class="space-y-3">
  {#each filtered as t (t.id)}
    {@const current = isCurrent(t)}
    {@const sch = isSchengen(t.primaryDestinationCountry)}
    {@const extra = t.otherCountriesVisited ?? []}
    <li class="card {current ? 'border-l-4 border-amber-400' : ''}">
      <button class="block w-full text-left" onclick={() => (editing = t)}>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 text-[17px] font-semibold">
              <span class="text-xl leading-none">{countryFlag(t.primaryDestinationCountry)}</span>
              <span class="truncate"
                >{countryName(t.primaryDestinationCountry)}{extra.length > 0
                  ? ` +${extra.length}`
                  : ''}</span
              >
            </div>
            <div class="caption-muted mt-1">
              {t.portugalExitDate} → {t.portugalReturnDate}
            </div>
            {#if extra.length > 0}
              <div class="caption mt-1.5">
                Visited: {extra.map((c) => `${countryFlag(c)} ${countryName(c)}`).join(', ')}
              </div>
            {/if}
          </div>
          <div class="text-base font-semibold whitespace-nowrap">
            {daysBetween(t.portugalExitDate, t.portugalReturnDate) - 1} d
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <span class="pill {sch ? 'pill-schengen' : 'pill-outside'}"
            >{sch ? 'Schengen' : 'Outside Schengen'}</span
          >
          {#each t.purposes ?? [] as p (p)}
            <span class="pill pill-purpose">{p}</span>
          {/each}
          {#if t.status === 'planned'}<span class="pill pill-planned">planned</span>{/if}
          {#if t.needsReview}<span class="pill pill-review">needs review</span>{/if}
        </div>
      </button>
    </li>
  {/each}
</ul>
