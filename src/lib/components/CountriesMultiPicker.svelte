<script lang="ts">
  import CountryPicker from './CountryPicker.svelte';
  import { countryFlag, countryName } from '$lib/domain/countries';

  let {
    value = $bindable<string[]>([])
  }: {
    value?: string[];
  } = $props();

  let adding = $state(false);
  let draft = $state('');

  function add() {
    const code = draft.trim();
    if (code && !value.includes(code)) {
      value = [...value, code];
    }
    draft = '';
    adding = false;
  }

  function remove(code: string) {
    value = value.filter((c) => c !== code);
  }
</script>

<div class="space-y-2">
  {#if value.length > 0}
    <ul class="flex flex-wrap gap-1.5">
      {#each value as code (code)}
        <li
          class="flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-xs dark:bg-neutral-800"
        >
          <span>{countryFlag(code)} {countryName(code)}</span>
          <button
            type="button"
            class="text-neutral-400 hover:text-red-700"
            aria-label="Remove {countryName(code)}"
            onclick={() => remove(code)}>×</button
          >
        </li>
      {/each}
    </ul>
  {/if}

  {#if adding}
    <div class="space-y-2">
      <CountryPicker bind:value={draft} placeholder="Search countries…" />
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded bg-black py-1.5 text-sm text-white disabled:opacity-50"
          disabled={!draft}
          onclick={add}>Add</button
        >
        <button
          type="button"
          class="flex-1 rounded bg-neutral-200 py-1.5 text-sm dark:bg-neutral-700"
          onclick={() => {
            adding = false;
            draft = '';
          }}>Cancel</button
        >
      </div>
    </div>
  {:else}
    <button
      type="button"
      class="rounded border border-dashed px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      onclick={() => (adding = true)}>+ Add another country</button
    >
  {/if}
</div>
