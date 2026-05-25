<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  let { open = $bindable(false) } = $props();

  async function accept() {
    await data.updateSettings({ acceptedDisclaimerAt: new Date().toISOString() });
    open = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
    <div class="card w-full max-w-md space-y-3">
      <h2 class="section-title">Important notice</h2>
      <p class="text-sm">
        This is an unofficial planning tool. Numbers are calculated from the dates you enter and a
        published interpretation of <strong>Article 85 of Lei n.º 23/2007</strong>.
        <strong>It is not legal advice.</strong>
      </p>
      <p class="text-sm">
        For decisions affecting your residency status, consult AIMA or a licensed Portuguese
        immigration attorney.
      </p>
      <button class="btn-primary w-full" onclick={accept}>I understand</button>
    </div>
  </div>
{/if}
