<script lang="ts">
  import { COUNTRIES } from '$lib/domain/countries';

  let {
    value = $bindable(''),
    placeholder = 'Search countries…',
    schengenOnly = false
  }: { value?: string; placeholder?: string; schengenOnly?: boolean } = $props();

  let query = $state('');
  let open = $state(false);

  const pool = $derived(schengenOnly ? COUNTRIES.filter((c) => c.isSchengen) : COUNTRIES);

  const filtered = $derived(
    query.trim() === ''
      ? pool.slice(0, 12)
      : pool
          .filter(
            (c) =>
              c.name.toLowerCase().includes(query.toLowerCase()) ||
              c.code.toLowerCase().startsWith(query.toLowerCase())
          )
          .slice(0, 20)
  );

  const current = $derived(pool.find((c) => c.code === value));

  function pick(code: string) {
    value = code;
    query = '';
    open = false;
  }
</script>

<div class="relative">
  <button
    type="button"
    class="w-full rounded-lg border bg-white px-3 py-2 text-left dark:bg-neutral-800"
    onclick={() => (open = !open)}
  >
    {current ? `${current.flag} ${current.name}` : 'Pick a country'}
  </button>
  {#if open}
    <div
      class="absolute inset-x-0 z-10 mt-1 max-h-64 overflow-auto rounded-lg border bg-white shadow-lg dark:bg-neutral-900"
    >
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:value={query}
        {placeholder}
        class="w-full border-b bg-transparent px-3 py-2"
        autofocus
      />
      <ul>
        {#each filtered as c (c.code)}
          <li>
            <button
              type="button"
              class="flex w-full justify-between px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onclick={() => pick(c.code)}
            >
              <span>{c.flag} {c.name}</span>
              <span class="text-xs text-neutral-500">
                {c.isSchengen ? 'Schengen' : 'Outside Schengen'}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
