<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  let { open = $bindable(false) } = $props();

  async function accept() {
    await data.updateSettings({ acceptedDisclaimerAt: new Date().toISOString() });
    open = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="max-w-md space-y-3 rounded-xl bg-white p-6 dark:bg-neutral-900">
      <h2 class="text-lg font-semibold">Before you start</h2>
      <p class="text-sm">
        This is an unofficial planning tool. Numbers are calculated from the dates you enter and a
        published interpretation of <strong>Article 85 of Lei n.º 23/2007</strong>.
        <strong>It is not legal advice.</strong>
      </p>
      <p class="text-sm">
        For decisions affecting your residency status, consult AIMA or a licensed Portuguese
        immigration attorney.
      </p>
      <p class="text-sm">
        Your data is stored only on this device. On iOS Safari you should
        <strong>Add to Home Screen</strong> to prevent the browser from clearing it after ~7 days of inactivity.
      </p>
      <button class="w-full rounded-lg bg-black py-2 text-white" onclick={accept}
        >I understand</button
      >
    </div>
  </div>
{/if}
