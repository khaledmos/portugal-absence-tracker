<script lang="ts">
  import { resolve } from '$app/paths';

  // Inline "How to install" steps — kept collapsed by default to keep the
  // card minimal. Expanding it shows the iPhone/Android steps in place
  // (no navigation away from the empty home view).
  let showInstall = $state(false);
</script>

<div class="card space-y-3">
  <h2 class="section-title">Before you start</h2>

  <p class="text-sm leading-relaxed">This app stores your data on this device and browser.</p>

  <p class="text-sm leading-relaxed">
    For best results, open it in <strong>Safari on iPhone</strong> or
    <strong>Chrome on Android</strong>, then add it to your home screen before entering important
    data.
  </p>

  <p class="text-sm leading-relaxed">
    Your data does not sync automatically between phones, browsers, or computers. Use
    <strong>Export JSON</strong> to back up or move your data.
  </p>

  {#if showInstall}
    <div
      class="space-y-2 rounded-xl p-3 text-sm leading-relaxed"
      style="background: var(--color-surface-soft);"
    >
      <div>
        <strong>iPhone</strong> — Open in Safari, tap <strong>Share</strong>, then
        <strong>Add to Home Screen</strong>.
      </div>
      <div>
        <strong>Android</strong> — Open in Chrome, tap the three-dot menu, then
        <strong>Install app</strong> or <strong>Add to Home screen</strong>.
      </div>
    </div>
  {/if}

  <div class="flex flex-col gap-2 pt-1 sm:flex-row">
    <a href={resolve('/cards')} class="btn-primary flex-1 text-center">Start tracking</a>
    <button class="btn-outline flex-1" onclick={() => (showInstall = !showInstall)}>
      {showInstall ? 'Hide install steps' : 'How to install'}
    </button>
  </div>
</div>
