<script lang="ts">
  import { data, todayISO } from '$lib/stores/data.svelte';
  import { computeCardCompliance } from '$lib/engine/compliance';
  import CardForm from './CardForm.svelte';
  import type { Card } from '$lib/domain/types';

  let editing = $state<Card | null>(null);
  let creating = $state(false);

  const today = todayISO();

  function activeFor(card: Card) {
    return card.issuedDate <= today && today <= card.expiryDate;
  }

  function summaryLine(card: Card) {
    return computeCardCompliance({
      card,
      trips: data.trips,
      today,
      settings: data.settings
    });
  }
</script>

<header class="mb-4 flex items-center justify-between">
  <h1 class="text-xl font-semibold">My cards</h1>
  <button class="rounded bg-black px-3 py-2 text-white" onclick={() => (creating = true)}
    >+ Add card</button
  >
</header>

{#if creating}
  <CardForm onClose={() => (creating = false)} />
{/if}

{#if editing}
  <CardForm initial={editing} onClose={() => (editing = null)} />
{/if}

<ul class="mt-3 space-y-3">
  {#each data.cards as card (card.id)}
    {@const compliance = summaryLine(card)}
    {@const isActive = activeFor(card)}
    <li
      class="rounded-xl border p-4 {isActive
        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
        : 'opacity-70'}"
    >
      <div class="flex justify-between">
        <div>
          <div class="font-semibold">{card.label}</div>
          <div class="text-xs text-neutral-500">
            {card.type === 'initial_2yr'
              ? 'Initial · 2 yr'
              : card.type === 'subsequent_3yr'
                ? 'Subsequent temporary · 3 yr'
                : 'Permanent · 5 yr'}
          </div>
        </div>
        <span class="text-xs"
          >{isActive ? 'Active' : card.expiryDate < today ? 'Expired' : 'Future'}</span
        >
      </div>
      <div class="mt-2 text-xs text-neutral-500">
        {card.issuedDate} → {card.expiryDate} · {compliance.elapsedDays} / {compliance.validityDays}
        days
      </div>
      <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          Portugal: <strong>{compliance.portugal.interpolated.used}</strong> / {compliance.portugal
            .interpolated.budgetDays} d
        </div>
        <div>
          Schengen: <strong>{compliance.schengen.interpolated.used}</strong> / {compliance.schengen
            .interpolated.budgetDays} d
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button class="rounded border px-2 py-1 text-sm" onclick={() => (editing = card)}
          >Edit</button
        >
      </div>
    </li>
  {/each}
</ul>
