<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  const items = [
    { route: '/', label: 'Home', icon: '🏠' },
    { route: '/trips', label: 'Trips', icon: '✈️' },
    { route: '/cards', label: 'Cards', icon: '🪪' },
    { route: '/simulate', label: 'Simulate', icon: '🧮' },
    { route: '/settings', label: 'Settings', icon: '⚙️' }
  ] as const;
</script>

<nav
  class="fixed inset-x-0 bottom-0 flex justify-around border-t bg-white py-2 text-xs dark:bg-neutral-900"
>
  {#each items as item (item.route)}
    {@const active = page.url.pathname.replace(/\/$/, '') === item.route.replace(/\/$/, '')}
    <a
      href={resolve(item.route)}
      class="flex flex-col items-center px-2 py-1 {active ? 'font-semibold' : 'text-neutral-500'}"
    >
      <span class="text-lg leading-none">{item.icon}</span>
      <span>{item.label}</span>
    </a>
  {/each}
</nav>
