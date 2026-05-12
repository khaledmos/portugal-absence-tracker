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

  function permitLabel(type: Card['type']) {
    if (type === 'initial_2yr') return 'Initial · 2 yr';
    if (type === 'subsequent_3yr') return 'Subsequent temporary · 3 yr';
    return 'Permanent · 5 yr';
  }

  function statusLabel(card: Card) {
    if (activeFor(card)) return 'Active';
    if (card.expiryDate < today) return 'Expired';
    return 'Future';
  }
</script>

<header class="mb-5 flex items-center justify-between">
  <h1 class="page-title">My cards</h1>
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
    Add card
  </button>
</header>

{#if creating}<div class="mb-4"><CardForm onClose={() => (creating = false)} /></div>{/if}
{#if editing}
  <div class="mb-4"><CardForm initial={editing} onClose={() => (editing = null)} /></div>
{/if}

<ul class="space-y-3">
  {#each data.cards as card (card.id)}
    {@const compliance = summaryLine(card)}
    {@const isActive = activeFor(card)}
    {@const status = statusLabel(card)}
    <li class={isActive ? 'card-active' : 'card'}>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="text-[17px] font-semibold">{card.label}</div>
          <div class="caption-muted mt-0.5">{permitLabel(card.type)}</div>
        </div>
        <span class="pill {isActive ? 'pill-status-active' : 'pill-status-expired'}">
          {status}
        </span>
      </div>

      <div class="caption-muted mt-3">
        {card.issuedDate} → {card.expiryDate} · {compliance.elapsedDays} / {compliance.validityDays}
        days
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="flex items-center gap-2">
          <span class="metric-icon-circle">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </svg>
          </span>
          <div class="text-sm">
            Portugal: <strong>{compliance.portugal.interpolated.used}</strong> / {compliance
              .portugal.interpolated.budgetDays} d
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="metric-icon-circle">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
            </svg>
          </span>
          <div class="text-sm">
            Schengen: <strong>{compliance.schengen.interpolated.used}</strong> / {compliance
              .schengen.interpolated.budgetDays} d
          </div>
        </div>
      </div>

      <div class="card-divider"></div>

      <button
        class={isActive ? 'btn-outline-active' : 'btn-outline'}
        onclick={() => (editing = card)}
      >
        Edit
      </button>
    </li>
  {/each}
</ul>
