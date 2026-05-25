<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import { isSchengen } from '$lib/domain/countries';
  import CountryPicker from '$lib/components/CountryPicker.svelte';
  import type { Trip } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  const today = todayISO();
  const activeCard = $derived(
    data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate)
  );

  let portugalExitDate = $state('');
  let portugalReturnDate = $state('');
  let primaryDestinationCountry = $state('');

  const draft: Trip = $derived({
    id: '__sim__',
    status: 'planned',
    portugalExitDate,
    portugalReturnDate,
    primaryDestinationCountry
  });

  const result = $derived.by(() => {
    if (!activeCard || !portugalExitDate || !portugalReturnDate || !primaryDestinationCountry) {
      return null;
    }
    const before = computeCardCompliance({
      card: activeCard,
      trips: data.trips,
      today,
      settings: data.settings
    });
    const after = computeCardCompliance({
      card: activeCard,
      trips: [...data.trips, draft],
      today,
      settings: data.settings
    });
    return { before, after };
  });

  const overLimit = $derived(
    result &&
      (result.after.portugal.projectedAfterPlanned.interpolatedUsed >
        result.after.portugal.interpolated.budgetDays ||
        result.after.schengen.projectedAfterPlanned.interpolatedUsed >
          result.after.schengen.interpolated.budgetDays)
  );

  // "Days left" view — convert used → remaining so the simulator's numbers
  // match the wording the rest of the app uses ("days left", not "used").
  const ptBeforeLeft = $derived(
    result
      ? Math.max(
          0,
          result.before.portugal.interpolated.budgetDays -
            result.before.portugal.projectedAfterPlanned.interpolatedUsed
        )
      : 0
  );
  const ptAfterLeft = $derived(
    result
      ? Math.max(
          0,
          result.after.portugal.interpolated.budgetDays -
            result.after.portugal.projectedAfterPlanned.interpolatedUsed
        )
      : 0
  );
  const scBeforeLeft = $derived(
    result
      ? Math.max(
          0,
          result.before.schengen.interpolated.budgetDays -
            result.before.schengen.projectedAfterPlanned.interpolatedUsed
        )
      : 0
  );
  const scAfterLeft = $derived(
    result
      ? Math.max(
          0,
          result.after.schengen.interpolated.budgetDays -
            result.after.schengen.projectedAfterPlanned.interpolatedUsed
        )
      : 0
  );

  async function saveAsPlanned() {
    if (!primaryDestinationCountry) return;
    const trip: Trip = { ...draft, id: uuid() };
    await data.upsertTrip(trip);
    portugalExitDate = portugalReturnDate = primaryDestinationCountry = '';
  }
</script>

<header class="mb-5">
  <h1 class="page-title">Simulator</h1>
</header>

{#if !activeCard}
  <div class="card">
    <p class="caption">Add an active card first.</p>
  </div>
{:else}
  <div class="card mb-4 space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="sim-left" class="input-label">Left Portugal</label>
        <input id="sim-left" type="date" class="input" bind:value={portugalExitDate} />
      </div>
      <div>
        <label for="sim-return" class="input-label">Returned to Portugal</label>
        <input id="sim-return" type="date" class="input" bind:value={portugalReturnDate} />
      </div>
    </div>
    <div>
      <span class="input-label">Main destination country</span>
      <CountryPicker bind:value={primaryDestinationCountry} />
    </div>
    {#if primaryDestinationCountry}
      <p class="caption-muted">
        {isSchengen(primaryDestinationCountry)
          ? 'Inside Schengen — counts toward Portugal only'
          : 'Outside Schengen — counts toward both Portugal and Schengen'}
      </p>
    {/if}
  </div>

  {#if result}
    <div class="card space-y-4">
      <h2 class="section-title">Impact</h2>
      <div class="space-y-2 text-[15px]">
        <div class="flex items-center justify-between">
          <span class="text-neutral-500">Portugal absence</span>
          <span>
            {ptBeforeLeft}
            <span class="text-neutral-400">→</span>
            <strong>{ptAfterLeft}</strong>
            <span class="text-neutral-500">days left</span>
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-neutral-500">Schengen absence</span>
          <span>
            {scBeforeLeft}
            <span class="text-neutral-400">→</span>
            <strong>{scAfterLeft}</strong>
            <span class="text-neutral-500">days left</span>
          </span>
        </div>
      </div>
      <div
        class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm {overLimit
          ? 'bg-red-50 text-red-800'
          : 'bg-emerald-50 text-emerald-800'}"
      >
        <span class="text-base">{overLimit ? '⚠️' : '✓'}</span>
        <span>
          {overLimit
            ? 'This trip would exceed your interpolated absence budget.'
            : 'Within all limits.'}
        </span>
      </div>
      <button class="btn-primary w-full" onclick={saveAsPlanned}>Save as planned trip</button>
    </div>
  {/if}
{/if}
