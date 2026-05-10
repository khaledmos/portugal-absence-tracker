<script lang="ts">
  import { untrack } from 'svelte';
  import { data } from '$lib/stores/data.svelte';
  import type { Card, PermitType } from '$lib/domain/types';
  import { v4 as uuid } from 'uuid';

  let { initial, onClose }: { initial?: Card; onClose: () => void } = $props();

  let label = $state(untrack(() => initial?.label ?? ''));
  let type = $state<PermitType>(untrack(() => initial?.type ?? 'subsequent_3yr'));
  let issuedDate = $state(untrack(() => initial?.issuedDate ?? ''));
  let expiryDate = $state(untrack(() => initial?.expiryDate ?? ''));
  let notes = $state(untrack(() => initial?.notes ?? ''));

  async function save() {
    const card: Card = {
      id: initial?.id ?? uuid(),
      label: label.trim() || 'Card',
      type,
      issuedDate,
      expiryDate,
      notes: notes.trim() || undefined,
      archived: initial?.archived
    };
    await data.upsertCard(card);
    onClose();
  }

  async function remove() {
    if (!initial) return;
    if (!confirm(`Delete ${initial.label}?`)) return;
    await data.deleteCard(initial.id);
    onClose();
  }
</script>

<div class="space-y-3 rounded-xl border bg-white p-4 dark:bg-neutral-900">
  <h3 class="font-semibold">{initial ? 'Edit' : 'New'} card</h3>

  <label class="block text-sm">
    Label
    <input
      class="mt-1 w-full rounded border px-2 py-1"
      bind:value={label}
      placeholder="e.g. 2nd card"
    />
  </label>

  <label class="block text-sm">
    Permit type
    <select class="mt-1 w-full rounded border px-2 py-1" bind:value={type}>
      <option value="initial_2yr">Initial · 2-year</option>
      <option value="subsequent_3yr">Subsequent temporary · 3-year</option>
      <option value="permanent_5yr">Permanent · 5-year</option>
    </select>
  </label>

  <div class="grid grid-cols-2 gap-2">
    <label class="block text-sm">
      Issued
      <input type="date" class="mt-1 w-full rounded border px-2 py-1" bind:value={issuedDate} />
    </label>
    <label class="block text-sm">
      Expiry
      <input type="date" class="mt-1 w-full rounded border px-2 py-1" bind:value={expiryDate} />
    </label>
  </div>

  <label class="block text-sm">
    Notes
    <textarea class="mt-1 w-full rounded border px-2 py-1" rows="2" bind:value={notes}></textarea>
  </label>

  <div class="flex gap-2">
    <button
      class="flex-1 rounded bg-black py-2 text-white disabled:opacity-50"
      onclick={save}
      disabled={!issuedDate || !expiryDate}>Save</button
    >
    <button class="flex-1 rounded bg-neutral-200 py-2" onclick={onClose}>Cancel</button>
    {#if initial}<button class="px-3 py-2 text-red-700" onclick={remove}>Delete</button>{/if}
  </div>
</div>
