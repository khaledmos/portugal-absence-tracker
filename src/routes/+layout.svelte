<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import { data, autoFlipOverdue, repos, todayISO } from '$lib/stores/data.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import DisclaimerModal from '$lib/components/DisclaimerModal.svelte';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
  let showDisclaimer = $state(false);

  // Privacy-friendly analytics: only loads when PUBLIC_CF_ANALYTICS_TOKEN is set
  // (Cloudflare Web Analytics — no cookies, no PII, no consent banner required).
  const cfAnalyticsToken = env.PUBLIC_CF_ANALYTICS_TOKEN;

  onMount(async () => {
    await data.load();
    await autoFlipOverdue(repos, todayISO());
    await data.refresh();
    if (!data.settings.acceptedDisclaimerAt) showDisclaimer = true;
    if ('storage' in navigator && navigator.storage.persist) {
      await navigator.storage.persist().catch(() => {});
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  {#if cfAnalyticsToken}
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${cfAnalyticsToken}"}`}
    ></script>
  {/if}
</svelte:head>

<div class="min-h-screen pb-16">
  <main class="mx-auto max-w-2xl p-4">
    {@render children()}
  </main>
  <BottomNav />
  <DisclaimerModal bind:open={showDisclaimer} />
</div>
