<script lang="ts">
  import { data, repos } from '$lib/stores/data.svelte';
  import { exportToJSON, importFromJSON } from '$lib/db/backup';
  import type { DaycountConvention, ScopeView } from '$lib/domain/types';

  let importStatus = $state('');

  async function exportFile() {
    const json = await exportToJSON(repos);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pt-residence-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await data.updateSettings({ lastBackupAt: new Date().toISOString() });
  }

  async function importFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importFromJSON(repos, text);
      await data.refresh();
      importStatus = 'Imported successfully.';
    } catch (err) {
      importStatus = `Import failed: ${(err as Error).message}`;
    }
  }
</script>

<h1 class="mb-4 text-xl font-semibold">Settings</h1>

<section class="mb-4 space-y-3 rounded-xl border bg-white p-4 dark:bg-neutral-900">
  <h2 class="font-semibold">Calculation</h2>

  <label class="block text-sm">
    Day-counting convention
    <select
      class="mt-1 w-full rounded border px-2 py-1"
      value={data.settings.daycountConvention}
      onchange={(e) =>
        data.updateSettings({
          daycountConvention: (e.target as HTMLSelectElement).value as DaycountConvention
        })}
    >
      <option value="standard"
        >Standard — departure absent, return present (3 days for Jan 15→18)</option
      >
      <option value="inclusive_both"
        >Inclusive both — both border days absent (4 days, Schengen 90/180 style)</option
      >
      <option value="exclusive_both"
        >Exclusive both — neither border day absent (2 days, lenient)</option
      >
    </select>
  </label>

  <label class="block text-sm">
    Default scope view
    <select
      class="mt-1 w-full rounded border px-2 py-1"
      value={data.settings.defaultScopeView}
      onchange={(e) =>
        data.updateSettings({
          defaultScopeView: (e.target as HTMLSelectElement).value as ScopeView
        })}
    >
      <option value="both">Both Portugal &amp; Schengen</option>
      <option value="portugal">Portugal only</option>
      <option value="schengen">Schengen only</option>
    </select>
  </label>
</section>

<section class="mb-4 space-y-3 rounded-xl border bg-white p-4 dark:bg-neutral-900">
  <h2 class="font-semibold">Backup</h2>
  <p class="text-xs text-neutral-500">
    Last backup: {data.settings.lastBackupAt
      ? new Date(data.settings.lastBackupAt).toLocaleString()
      : 'never'}
  </p>
  <button class="w-full rounded bg-black py-2 text-white" onclick={exportFile}>Export JSON</button>
  <label class="block text-sm">
    Import JSON
    <input type="file" accept="application/json" class="mt-1 block" onchange={importFile} />
  </label>
  {#if importStatus}<div class="text-xs">{importStatus}</div>{/if}
</section>

<section class="mb-4 space-y-2 rounded-xl border bg-white p-4 text-sm dark:bg-neutral-900">
  <h2 class="font-semibold">About</h2>
  <p>
    This app tracks absence days against
    <strong>Article 85.2 of Lei n.º 23/2007</strong> (Portuguese Aliens Act).
  </p>
  <p>
    Limits are expressed in months by the law. Consecutive limits are computed using exact calendar
    arithmetic (<code>addMonths</code>); interpolated limits use 30.4375 days/month (e.g., 8 months
    ≈ 244 days).
  </p>
  <p class="text-neutral-500">
    <strong>Disclaimer.</strong> This is not legal advice. For decisions affecting your residency, consult
    AIMA or a licensed Portuguese immigration attorney.
  </p>
</section>
