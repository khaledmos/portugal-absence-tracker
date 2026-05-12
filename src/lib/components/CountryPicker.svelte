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
    class="input flex w-full items-center justify-between text-left"
    onclick={() => (open = !open)}
  >
    <span class={current ? '' : 'text-neutral-400'}>
      {current ? `${current.flag} ${current.name}` : 'Pick a country'}
    </span>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4 text-neutral-400"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </button>
  {#if open}
    <div
      class="absolute inset-x-0 z-10 mt-1.5 max-h-64 overflow-auto rounded-xl bg-white shadow-lg"
      style="box-shadow: var(--shadow-card-elev);"
    >
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:value={query}
        {placeholder}
        class="w-full border-b border-neutral-200 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
        autofocus
      />
      <ul>
        {#each filtered as c (c.code)}
          <li>
            <button
              type="button"
              class="flex w-full justify-between px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
              onclick={() => pick(c.code)}
            >
              <span>{c.flag} {c.name}</span>
              <span class="text-xs text-neutral-400">
                {c.isSchengen ? 'Schengen' : 'Outside Schengen'}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
