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

  // Mirrors the home/simulator framing: Portugal is the legal allowance
  // (remaining "days left"); Schengen is a practical recorded view
  // (used "days recorded"). Both project through `projectedAfterPlanned`
  // so existing planned trips are baked into "before".
  const ptBeforeLeft = $derived(
    preview
      ? Math.max(
          0,
          preview.before.portugal.interpolated.budgetDays -
            preview.before.portugal.projectedAfterPlanned.interpolatedUsed
        )
      : 0
  );
  const ptAfterLeft = $derived(
    preview
      ? Math.max(
          0,
          preview.after.portugal.interpolated.budgetDays -
            preview.after.portugal.projectedAfterPlanned.interpolatedUsed
        )
      : 0
  );
  const scBeforeUsed = $derived(
    preview ? preview.before.schengen.projectedAfterPlanned.interpolatedUsed : 0
  );
  const scAfterUsed = $derived(
    preview ? preview.after.schengen.projectedAfterPlanned.interpolatedUsed : 0
  );

  let saveError = $state('');

  async function save() {
    if (!primaryDestinationCountry || !portugalExitDate || !portugalReturnDate) return;
    saveError = '';
    // Spread reactive arrays into plain arrays so Dexie's structuredClone can serialize them.
    const trip: Trip = {
      id: initial?.id ?? uuid(),
      status,
      needsReview: false,
      portugalExitDate,
      portugalReturnDate,
      schengenExitDate: destinationIsSchengen ? undefined : schengenExitDate || undefined,
      schengenReturnDate: destinationIsSchengen ? undefined : schengenReturnDate || undefined,
      primaryDestinationCountry,
      otherCountriesVisited:
        otherCountriesVisited.length > 0 ? [...otherCountriesVisited] : undefined,
      schengenExitLocation: destinationIsSchengen ? undefined : schengenExitLocation || undefined,
      schengenReturnLocation: destinationIsSchengen
        ? undefined
        : schengenReturnLocation || undefined,
      purposes: purposes.length > 0 ? [...purposes] : undefined,
      notes: notes || undefined
    };
    try {
      await data.upsertTrip(trip);
      onClose();
    } catch (err) {
      saveError = `Couldn't save: ${(err as Error).message}`;
    }
  }

  async function remove() {
    if (!initial) return;
    if (!confirm('Delete this trip?')) return;
    await data.deleteTrip(initial.id);
    onClose();
  }
</script>

<div class="card space-y-3 sm:space-y-4">
  <h3 class="section-title">{initial ? 'Edit' : 'New'} trip</h3>

  <!-- Status -->
  <div class="tab-toggle">
    <button
      class="tab-toggle-btn {status === 'past' ? 'tab-toggle-btn-active' : ''}"
      onclick={() => (status = 'past')}>Past</button
    >
    <button
      class="tab-toggle-btn {status === 'planned' ? 'tab-toggle-btn-active' : ''}"
      onclick={() => (status = 'planned')}>Planned</button
    >
  </div>

  <!-- Portugal dates (always shown) -->
  <div class="grid grid-cols-2 gap-3">
    <div>
      <label for="tf-pt-exit" class="input-label">Left Portugal</label>
      <input id="tf-pt-exit" type="date" class="input" bind:value={portugalExitDate} />
    </div>
    <div>
      <label for="tf-pt-return" class="input-label">Returned to Portugal</label>
      <input id="tf-pt-return" type="date" class="input" bind:value={portugalReturnDate} />
    </div>
  </div>

  <!-- Destination -->
  <div>
    <span class="input-label">Main destination country</span>
    <CountryPicker bind:value={primaryDestinationCountry} />
  </div>

  <!-- Schengen dates + locations: only for non-Schengen destinations -->
  {#if primaryDestinationCountry && !destinationIsSchengen}
    <div
      class="space-y-2 rounded-xl p-3 sm:space-y-3 sm:p-4"
      style="background: var(--color-surface-soft);"
    >
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="tf-sch-exit" class="input-label">Left Schengen</label>
          <input id="tf-sch-exit" type="date" class="input" bind:value={schengenExitDate} />
        </div>
        <div>
          <label for="tf-sch-return" class="input-label">Re-entered Schengen</label>
          <input id="tf-sch-return" type="date" class="input" bind:value={schengenReturnDate} />
        </div>
      </div>
      <p class="caption-muted">
        Fill these only if you transited through another Schengen country before leaving (or after
        returning). Otherwise leave empty — Schengen absence will use your Portugal dates.
      </p>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <span class="input-label">Exit Schengen from</span>
          <CountryPicker bind:value={schengenExitLocation} schengenOnly />
        </div>
        <div>
          <span class="input-label">Re-entered Schengen through</span>
          <CountryPicker bind:value={schengenReturnLocation} schengenOnly />
        </div>
      </div>
    </div>
  {/if}

  <!-- Other countries visited (optional) -->
  <div>
    <span class="input-label">
      Other countries visited <span class="text-neutral-400">(optional)</span>
    </span>
    <CountriesMultiPicker bind:value={otherCountriesVisited} />
    <p class="caption-muted mt-1.5">For your own travel diary. Doesn't change the calculation.</p>
  </div>

  <!-- Purposes (multi-select) -->
  <div>
    <span class="input-label">Purposes <span class="text-neutral-400">(optional)</span></span>
    <div class="flex flex-wrap gap-1.5">
      {#each purposeOptions as p (p.id)}
        <button
          class="filter-pill {purposes.includes(p.id) ? 'filter-pill-active' : ''}"
          onclick={() => togglePurpose(p.id)}>{p.label}</button
        >
      {/each}
    </div>
    <p class="caption-muted mt-2">
      Some purposes may justify extended absences under Article 85 of Lei n.º 23/2007 — particularly
      <strong>business</strong>, <strong>work</strong>, <strong>family</strong>, and
      <strong>medical</strong> reasons. Tourism and other purposes are tracked for your own records only.
    </p>
  </div>

  <!-- Notes -->
  <div>
    <label for="tf-notes" class="input-label">Notes</label>
    <textarea id="tf-notes" class="input" rows="2" bind:value={notes}></textarea>
  </div>

  <!-- Live impact preview -->
  {#if preview}
    <div class="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">
      <div class="mb-1.5 font-semibold">Impact preview</div>
      <div class="flex items-center justify-between">
        <span>Portugal absence</span>
        <span>
          {ptBeforeLeft}
          <span class="text-emerald-700/60">→</span>
          <strong>{ptAfterLeft}</strong>
          <span class="text-emerald-900/70">days left</span>
        </span>
      </div>
      <div class="mt-0.5 flex items-center justify-between">
        <span>Schengen absence</span>
        <span>
          {scBeforeUsed}
          <span class="text-emerald-700/60">→</span>
          <strong>{scAfterUsed}</strong>
          <span class="text-emerald-900/70">days recorded</span>
        </span>
      </div>
    </div>
  {/if}

  {#if saveError}
    <div class="rounded-xl bg-red-50 p-3 text-xs text-red-800">
      {saveError}
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex gap-2">
    <button class="btn-primary flex-1" onclick={save}>Save</button>
    <button class="btn-outline flex-1" onclick={onClose}>Cancel</button>
    {#if initial}<button class="btn-danger-text" onclick={remove}>Delete</button>{/if}
  </div>
</div>
