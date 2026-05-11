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

  let departureDate = $state('');
  let returnDate = $state('');
  let destinationCountry = $state('');

  const draft: Trip = $derived({
    id: '__sim__',
    departureDate,
    returnDate,
    destinationCountry,
    status: 'planned'
  });

  const result = $derived.by(() => {
    if (!activeCard || !departureDate || !returnDate || !destinationCountry) return null;
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

  async function saveAsPlanned() {
    if (!destinationCountry) return;
    const trip: Trip = { ...draft, id: uuid() };
    await data.upsertTrip(trip);
    departureDate = returnDate = destinationCountry = '';
  }
</script>

<h1 class="mb-4 text-xl font-semibold">🧮 Simulator</h1>

{#if !activeCard}
  <p class="text-sm">Add an active card first.</p>
{:else}
  <div class="space-y-3 rounded-xl border bg-white p-4 dark:bg-neutral-900">
    <div class="grid grid-cols-2 gap-2">
      <label class="block text-sm"
        >Departure
        <input
          type="date"
          class="mt-1 w-full rounded border px-2 py-1"
          bind:value={departureDate}
        />
      </label>
      <label class="block text-sm"
        >Return
        <input type="date" class="mt-1 w-full rounded border px-2 py-1" bind:value={returnDate} />
      </label>
    </div>
    <div class="text-sm">
      <div class="mb-1">Destination</div>
      <CountryPicker bind:value={destinationCountry} />
    </div>
    {#if destinationCountry}
      <div class="text-xs">
        {isSchengen(destinationCountry)
          ? 'Inside Schengen — counts toward Portugal only'
          : 'Outside Schengen — counts toward both'}
      </div>
    {/if}
  </div>

  {#if result}
    <div class="mt-4 space-y-2 rounded-xl border bg-white p-4 text-sm dark:bg-neutral-900">
      <h2 class="font-semibold">Impact</h2>
      <div class="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-2">
        <span class="text-xs text-neutral-500">Portugal</span>
        <span>{result.before.portugal.projectedAfterPlanned.interpolatedUsed}</span>
        <span class="text-neutral-400">→</span>
        <strong>{result.after.portugal.projectedAfterPlanned.interpolatedUsed}</strong>
        <span class="text-xs text-neutral-500">Schengen</span>
        <span>{result.before.schengen.projectedAfterPlanned.interpolatedUsed}</span>
        <span class="text-neutral-400">→</span>
        <strong>{result.after.schengen.projectedAfterPlanned.interpolatedUsed}</strong>
      </div>
      <div
        class="rounded p-3 {overLimit
          ? 'border border-red-200 bg-red-50 text-red-800'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-800'}"
      >
        {overLimit
          ? '⚠️ This trip would exceed your interpolated absence budget.'
          : '✅ Within all limits.'}
      </div>
      <button class="w-full rounded bg-black py-2 text-white" onclick={saveAsPlanned}
        >Save as planned trip</button
      >
    </div>
  {/if}
{/if}
