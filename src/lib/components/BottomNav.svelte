<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';

  type IconKey = 'home' | 'trips' | 'cards' | 'simulate' | 'settings';

  const items: {
    route: '/' | '/trips' | '/cards' | '/simulate' | '/settings';
    label: string;
    icon: IconKey;
  }[] = [
    { route: '/', label: 'Home', icon: 'home' },
    { route: '/trips', label: 'Trips', icon: 'trips' },
    { route: '/cards', label: 'Cards', icon: 'cards' },
    { route: '/simulate', label: 'Simulate', icon: 'simulate' },
    { route: '/settings', label: 'Settings', icon: 'settings' }
  ];
</script>

<!-- Inline line-icons (Lucide-style: 24×24 viewBox, 1.75 stroke, round caps/joins).
     Currentcolor inherits from the link's text color so active/inactive states style themselves. -->
<nav
  class="fixed inset-x-0 bottom-0 flex justify-around border-t bg-white py-2 text-xs dark:bg-neutral-900"
>
  {#each items as item (item.route)}
    {@const active = page.url.pathname.replace(/\/$/, '') === item.route.replace(/\/$/, '')}
    <a
      href={resolve(item.route)}
      class="flex flex-col items-center gap-0.5 px-2 py-1 {active
        ? 'font-medium text-neutral-900 dark:text-neutral-100'
        : 'text-neutral-400'}"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-5 w-5"
        aria-hidden="true"
      >
        {#if item.icon === 'home'}
          <path d="M3 11.5L12 4l9 7.5" />
          <path d="M5 10v10h4v-6h6v6h4V10" />
        {:else if item.icon === 'trips'}
          <path
            d="M3 16l7-2 3 5 1.5-1-1.5-5 5-1.5c1.5-.5 2.5-1 1.8-2.3-.7-1.2-1.8-.6-2.6-.2L11.5 11 8 10c-.7-.2-1.5.1-1.8.7L5 13l1 .6 4-1"
          />
        {:else if item.icon === 'cards'}
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path d="M3 10.5h18" />
        {:else if item.icon === 'simulate'}
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 7h8" />
          <circle cx="8.5" cy="11.5" r="0.6" />
          <circle cx="12" cy="11.5" r="0.6" />
          <circle cx="15.5" cy="11.5" r="0.6" />
          <circle cx="8.5" cy="15.5" r="0.6" />
          <circle cx="12" cy="15.5" r="0.6" />
          <circle cx="15.5" cy="15.5" r="0.6" />
        {:else if item.icon === 'settings'}
          <circle cx="12" cy="12" r="2.5" />
          <path
            d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4"
          />
        {/if}
      </svg>
      <span>{item.label}</span>
    </a>
  {/each}
</nav>
