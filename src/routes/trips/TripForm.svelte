<script lang="ts">
  import { untrack } from 'svelte';
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import { isSchengen } from '$lib/domain/countries';
  import CountryPicker from '$lib/components/CountryPicker.svelte';
  import type { Trip, TripStatus, TripPurpose } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  let { initial, onClose }: { initial?: Trip; onClose: () => void } = $props();

  let status = $state<TripStatus>(untrack(() => initial?.status ?? 'past'));
  let departureDate = $state(untrack(() => initial?.departureDate ?? ''));
  let returnDate = $state(untrack(() => initial?.returnDate ?? ''));
  let destinationCountry = $state(untrack(() => initial?.destinationCountry ?? ''));
  let destinationCity = $state(untrack(() => initial?.destinationCity ?? ''));
  let departureAirport = $state(untrack(() => initial?.departureAirport ?? ''));
  let arrivalAirport = $state(untrack(() => initial?.arrivalAirport ?? ''));
  let purpose = $state<TripPurpose | undefined>(untrack(() => initial?.purpose));
  let notes = $state(untrack(() => initial?.notes ?? ''));

  const purposes: TripPurpose[] = ['personal', 'business', 'work', 'cultural', 'social', 'medical'];

  const draft: Trip = $derived({
    id: initial?.id ?? '__draft__',
    departureDate,
    returnDate,
    destinationCountry,
    destinationCity: destinationCity || undefined,
    departureAirport: departureAirport || undefined,
    arrivalAirport: arrivalAirport || undefined,
    status,
    purpose,
    notes: notes || undefined
  });

  const today = todayISO();
  const activeCard = $derived(
    data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate) ?? null
  );

  const preview = $derived.by(() => {
    if (!activeCard || !departureDate || !returnDate || !destinationCountry) return null;
    const before = computeCardCompliance({
      card: activeCard,
      trips: data.trips,
      today,
      settings: data.settings
    });
    const trips = initial
      ? data.trips.map((t) => (t.id === initial.id ? draft : t))
      : [...data.trips, draft];
    const after = computeCardCompliance({
      card: activeCard,
      trips,
      today,
      settings: data.settings
    });
    return { before, after };
  });

  async function save() {
    if (!destinationCountry || !departureDate || !returnDate) return;
    const trip: Trip = {
      id: initial?.id ?? uuid(),
      departureDate,
      returnDate,
      destinationCountry,
      destinationCity: destinationCity || undefined,
      departureAirport: departureAirport || undefined,
      arrivalAirport: arrivalAirport || undefined,
      status,
      needsReview: false,
      purpose,
      notes: notes || undefined
    };
    await data.upsertTrip(trip);
    onClose();
  }

  async function remove() {
    if (!initial) return;
    if (!confirm('Delete this trip?')) return;
    await data.deleteTrip(initial.id);
    onClose();
  }
</script>

<div class="space-y-3 rounded-xl border bg-white p-4 dark:bg-neutral-900">
  <h3 class="font-semibold">{initial ? 'Edit' : 'New'} trip</h3>

  <div class="flex gap-2">
    <button
      class="flex-1 rounded border py-1 {status === 'past' ? 'bg-black text-white' : ''}"
      onclick={() => (status = 'past')}>Past</button
    >
    <button
      class="flex-1 rounded border py-1 {status === 'planned' ? 'bg-black text-white' : ''}"
      onclick={() => (status = 'planned')}>Planned</button
    >
  </div>

  <div class="grid grid-cols-2 gap-2">
    <label class="block text-sm"
      >Departure
      <input type="date" class="mt-1 w-full rounded border px-2 py-1" bind:value={departureDate} />
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

  <label class="block text-sm"
    >City
    <input class="mt-1 w-full rounded border px-2 py-1" bind:value={destinationCity} />
  </label>

  <div class="grid grid-cols-2 gap-2">
    <label class="block text-sm"
      >From airport
      <input
        class="mt-1 w-full rounded border px-2 py-1"
        bind:value={departureAirport}
        placeholder="LIS"
      />
    </label>
    <label class="block text-sm"
      >To airport
      <input
        class="mt-1 w-full rounded border px-2 py-1"
        bind:value={arrivalAirport}
        placeholder="LHR"
      />
    </label>
  </div>

  <div class="text-sm">
    Purpose
    <div class="mt-1 flex flex-wrap gap-1">
      {#each purposes as p (p)}
        <button
          class="rounded-full border px-2 py-1 text-xs {purpose === p ? 'bg-black text-white' : ''}"
          onclick={() => (purpose = purpose === p ? undefined : p)}>{p}</button
        >
      {/each}
    </div>
  </div>

  <label class="block text-sm"
    >Notes
    <textarea class="mt-1 w-full rounded border px-2 py-1" rows="2" bind:value={notes}></textarea>
  </label>

  {#if preview}
    <div class="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      <div class="mb-1 font-semibold">Impact preview</div>
      Portugal: {preview.before.portugal.interpolated.used} →
      <strong>{preview.after.portugal.interpolated.used}</strong>
      / {preview.after.portugal.interpolated.budgetDays} d<br />
      Schengen: {preview.before.schengen.interpolated.used} →
      <strong>{preview.after.schengen.interpolated.used}</strong>
      / {preview.after.schengen.interpolated.budgetDays} d<br />
      {#if !isSchengen(destinationCountry)}<span>Outside Schengen</span>{:else}<span
          >Inside Schengen</span
        >{/if}
    </div>
  {/if}

  <div class="flex gap-2">
    <button class="flex-1 rounded bg-black py-2 text-white" onclick={save}>Save</button>
    <button class="flex-1 rounded bg-neutral-200 py-2" onclick={onClose}>Cancel</button>
    {#if initial}<button class="px-3 py-2 text-red-700" onclick={remove}>Delete</button>{/if}
  </div>
</div>
