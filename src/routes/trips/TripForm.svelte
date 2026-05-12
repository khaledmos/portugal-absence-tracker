<script lang="ts">
  import { untrack } from 'svelte';
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import { isSchengen } from '$lib/domain/countries';
  import CountryPicker from '$lib/components/CountryPicker.svelte';
  import CountriesMultiPicker from '$lib/components/CountriesMultiPicker.svelte';
  import type { Trip, TripStatus, TripPurpose } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  let { initial, onClose }: { initial?: Trip; onClose: () => void } = $props();

  // Snapshot prop values once; the parent recreates this form when switching edits.
  let status = $state<TripStatus>(untrack(() => initial?.status ?? 'past'));
  let portugalExitDate = $state(untrack(() => initial?.portugalExitDate ?? ''));
  let portugalReturnDate = $state(untrack(() => initial?.portugalReturnDate ?? ''));
  let schengenExitDate = $state(untrack(() => initial?.schengenExitDate ?? ''));
  let schengenReturnDate = $state(untrack(() => initial?.schengenReturnDate ?? ''));
  let primaryDestinationCountry = $state(untrack(() => initial?.primaryDestinationCountry ?? ''));
  let otherCountriesVisited = $state<string[]>(untrack(() => initial?.otherCountriesVisited ?? []));
  let schengenExitLocation = $state(untrack(() => initial?.schengenExitLocation ?? ''));
  let schengenReturnLocation = $state(untrack(() => initial?.schengenReturnLocation ?? ''));
  let purposes = $state<TripPurpose[]>(untrack(() => initial?.purposes ?? []));
  let notes = $state(untrack(() => initial?.notes ?? ''));

  const destinationIsSchengen = $derived(
    primaryDestinationCountry ? isSchengen(primaryDestinationCountry) : false
  );

  const purposeOptions: { id: TripPurpose; label: string }[] = [
    { id: 'business', label: 'Business' },
    { id: 'work', label: 'Work' },
    { id: 'tourism', label: 'Tourism' },
    { id: 'family', label: 'Family' },
    { id: 'medical', label: 'Medical' },
    { id: 'other', label: 'Other' }
  ];

  function togglePurpose(p: TripPurpose) {
    purposes = purposes.includes(p) ? purposes.filter((x) => x !== p) : [...purposes, p];
  }

  const today = todayISO();
  const activeCard = $derived(
    data.cards.find((c) => c.issuedDate <= today && today <= c.expiryDate) ?? null
  );

  const draft: Trip = $derived({
    id: initial?.id ?? '__draft__',
    status,
    portugalExitDate,
    portugalReturnDate,
    schengenExitDate: destinationIsSchengen ? undefined : schengenExitDate || undefined,
    schengenReturnDate: destinationIsSchengen ? undefined : schengenReturnDate || undefined,
    primaryDestinationCountry,
    otherCountriesVisited: otherCountriesVisited.length > 0 ? otherCountriesVisited : undefined,
    schengenExitLocation: destinationIsSchengen ? undefined : schengenExitLocation || undefined,
    schengenReturnLocation: destinationIsSchengen ? undefined : schengenReturnLocation || undefined,
    purposes: purposes.length > 0 ? purposes : undefined,
    notes: notes || undefined
  });

  const preview = $derived.by(() => {
    if (!activeCard || !portugalExitDate || !portugalReturnDate || !primaryDestinationCountry) {
      return null;
    }
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
    if (!primaryDestinationCountry || !portugalExitDate || !portugalReturnDate) return;
    const trip: Trip = {
      id: initial?.id ?? uuid(),
      status,
      needsReview: false,
      portugalExitDate,
      portugalReturnDate,
      schengenExitDate: destinationIsSchengen ? undefined : schengenExitDate || undefined,
      schengenReturnDate: destinationIsSchengen ? undefined : schengenReturnDate || undefined,
      primaryDestinationCountry,
      otherCountriesVisited: otherCountriesVisited.length > 0 ? otherCountriesVisited : undefined,
      schengenExitLocation: destinationIsSchengen ? undefined : schengenExitLocation || undefined,
      schengenReturnLocation: destinationIsSchengen
        ? undefined
        : schengenReturnLocation || undefined,
      purposes: purposes.length > 0 ? purposes : undefined,
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

  <!-- Status -->
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

  <!-- Portugal dates (always shown) -->
  <div class="grid grid-cols-2 gap-2">
    <label class="block text-sm"
      >Left Portugal
      <input
        type="date"
        class="mt-1 w-full rounded border px-2 py-1"
        bind:value={portugalExitDate}
      />
    </label>
    <label class="block text-sm"
      >Returned to Portugal
      <input
        type="date"
        class="mt-1 w-full rounded border px-2 py-1"
        bind:value={portugalReturnDate}
      />
    </label>
  </div>

  <!-- Destination -->
  <div class="text-sm">
    <div class="mb-1">Main destination country</div>
    <CountryPicker bind:value={primaryDestinationCountry} />
  </div>

  <!-- Schengen dates + locations: only for non-Schengen destinations -->
  {#if primaryDestinationCountry && !destinationIsSchengen}
    <div class="space-y-2 rounded border border-dashed p-3">
      <div class="grid grid-cols-2 gap-2">
        <label class="block text-sm"
          >Left Schengen
          <input
            type="date"
            class="mt-1 w-full rounded border px-2 py-1"
            bind:value={schengenExitDate}
          />
        </label>
        <label class="block text-sm"
          >Re-entered Schengen
          <input
            type="date"
            class="mt-1 w-full rounded border px-2 py-1"
            bind:value={schengenReturnDate}
          />
        </label>
      </div>
      <p class="text-xs text-neutral-500">
        Fill these only if you transited through another Schengen country before leaving (or after
        returning). Otherwise leave empty — Schengen absence will use your Portugal dates.
      </p>
      <div class="grid grid-cols-2 gap-2">
        <div class="block text-sm">
          <div class="mb-1">Exit Schengen from</div>
          <CountryPicker bind:value={schengenExitLocation} schengenOnly />
        </div>
        <div class="block text-sm">
          <div class="mb-1">Re-entered Schengen through</div>
          <CountryPicker bind:value={schengenReturnLocation} schengenOnly />
        </div>
      </div>
    </div>
  {/if}

  <!-- Other countries visited (optional) -->
  <div class="text-sm">
    <div class="mb-1">Other countries visited <span class="text-neutral-400">(optional)</span></div>
    <CountriesMultiPicker bind:value={otherCountriesVisited} />
    <p class="mt-1 text-xs text-neutral-500">
      For your own travel diary. Doesn't change the calculation.
    </p>
  </div>

  <!-- Purposes (multi-select) -->
  <div class="text-sm">
    <div class="mb-1">Purposes <span class="text-neutral-400">(optional)</span></div>
    <div class="flex flex-wrap gap-1">
      {#each purposeOptions as p (p.id)}
        <button
          class="rounded-full border px-2 py-1 text-xs {purposes.includes(p.id)
            ? 'bg-black text-white'
            : ''}"
          onclick={() => togglePurpose(p.id)}>{p.label}</button
        >
      {/each}
    </div>
    <p class="mt-1 text-xs text-neutral-500">
      Some purposes may justify extended absences under Article 85 of Lei n.º 23/2007 — particularly
      <strong>business</strong>, <strong>work</strong>, <strong>family</strong>, and
      <strong>medical</strong> reasons. Tourism and other purposes are tracked for your own records only.
    </p>
  </div>

  <!-- Notes -->
  <label class="block text-sm"
    >Notes
    <textarea class="mt-1 w-full rounded border px-2 py-1" rows="2" bind:value={notes}></textarea>
  </label>

  <!-- Live impact preview -->
  {#if preview}
    <div class="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      <div class="mb-1 font-semibold">Impact preview</div>
      Portugal: {preview.before.portugal.interpolated.used} →
      <strong>{preview.after.portugal.interpolated.used}</strong>
      / {preview.after.portugal.interpolated.budgetDays} d<br />
      Schengen: {preview.before.schengen.interpolated.used} →
      <strong>{preview.after.schengen.interpolated.used}</strong>
      / {preview.after.schengen.interpolated.budgetDays} d
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex gap-2">
    <button class="flex-1 rounded bg-black py-2 text-white" onclick={save}>Save</button>
    <button class="flex-1 rounded bg-neutral-200 py-2" onclick={onClose}>Cancel</button>
    {#if initial}<button class="px-3 py-2 text-red-700" onclick={remove}>Delete</button>{/if}
  </div>
</div>
