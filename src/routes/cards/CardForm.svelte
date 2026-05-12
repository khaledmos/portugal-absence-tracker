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

<div class="card space-y-4">
  <h3 class="section-title">{initial ? 'Edit' : 'New'} card</h3>

  <div>
    <label for="cf-label" class="input-label">Label</label>
    <input id="cf-label" class="input" bind:value={label} placeholder="e.g. 2nd card" />
  </div>

  <div>
    <label for="cf-type" class="input-label">Permit type</label>
    <select id="cf-type" class="input" bind:value={type}>
      <option value="initial_2yr">Initial · 2-year</option>
      <option value="subsequent_3yr">Subsequent temporary · 3-year</option>
      <option value="permanent_5yr">Permanent · 5-year</option>
    </select>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div>
      <label for="cf-issued" class="input-label">Issued</label>
      <input id="cf-issued" type="date" class="input" bind:value={issuedDate} />
    </div>
    <div>
      <label for="cf-expiry" class="input-label">Expiry</label>
      <input id="cf-expiry" type="date" class="input" bind:value={expiryDate} />
    </div>
  </div>

  <div>
    <label for="cf-notes" class="input-label">Notes</label>
    <textarea id="cf-notes" class="input" rows="2" bind:value={notes}></textarea>
  </div>

  <div class="flex gap-2">
    <button class="btn-primary flex-1" onclick={save} disabled={!issuedDate || !expiryDate}
      >Save</button
    >
    <button class="btn-outline flex-1" onclick={onClose}>Cancel</button>
    {#if initial}<button class="btn-danger-text" onclick={remove}>Delete</button>{/if}
  </div>
</div>
