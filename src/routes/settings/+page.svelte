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
    a.download = `portugal-absence-tracker-${new Date().toISOString().slice(0, 10)}.json`;
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

<header class="mb-5">
  <h1 class="page-title">Settings</h1>
</header>

<section class="card mb-4 space-y-4">
  <h2 class="section-title">Calculation</h2>

  <div>
    <label for="dcv" class="input-label">Day-counting convention</label>
    <select
      id="dcv"
      class="input"
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
  </div>

  <div>
    <label for="dsv" class="input-label">Default counting view</label>
    <select
      id="dsv"
      class="input"
      value={data.settings.defaultScopeView === 'schengen' ? 'schengen' : 'portugal'}
      onchange={(e) =>
        data.updateSettings({
          defaultScopeView: (e.target as HTMLSelectElement).value as ScopeView
        })}
    >
      <option value="portugal">Portugal absence (legal baseline — default)</option>
      <option value="schengen">Schengen exit (practical estimate)</option>
    </select>
    <p class="caption-muted mt-1.5">
      Portuguese residence rules are based on absence from Portugal. Schengen exit view is an
      optional practical view based on when you leave or re-enter the Schengen Area.
    </p>
  </div>
</section>

<section class="card mb-4 space-y-4">
  <h2 class="section-title">Install &amp; backup</h2>

  <!-- Install guidance -->
  <div class="space-y-2">
    <h3 class="text-sm font-semibold">Install this app</h3>
    <p class="text-sm leading-relaxed">
      <strong>iPhone:</strong> Open the app in Safari, tap <strong>Share</strong>, then
      <strong>Add to Home Screen</strong>.
    </p>
    <p class="text-sm leading-relaxed">
      <strong>Android:</strong> Open the app in Chrome, tap the three-dot menu, then
      <strong>Install app</strong> or <strong>Add to Home screen</strong>.
    </p>
  </div>

  <div class="card-divider"></div>

  <!-- Backup explanation -->
  <div class="space-y-2">
    <h3 class="text-sm font-semibold">Back up your data</h3>
    <p class="text-sm leading-relaxed">
      Your data is stored only on this device and browser. It does not sync automatically between
      devices.
    </p>
    <p class="text-sm leading-relaxed">
      Use <strong>Export JSON</strong> to save a backup file. Use <strong>Import JSON</strong> to restore
      your data or move it to another device.
    </p>
    <p class="caption-muted">Tip: Back up your data after adding or editing important trips.</p>
  </div>

  <!-- Backup actions -->
  <div class="space-y-3">
    <p class="caption-muted">
      Last backup: {data.settings.lastBackupAt
        ? new Date(data.settings.lastBackupAt).toLocaleString()
        : 'never'}
    </p>
    <button class="btn-primary w-full" onclick={exportFile}>Export JSON</button>
    <div>
      <label for="import-file" class="input-label">Import JSON</label>
      <input
        id="import-file"
        type="file"
        accept="application/json"
        class="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
        onchange={importFile}
      />
    </div>
    {#if importStatus}<div class="caption">{importStatus}</div>{/if}
  </div>
</section>

<section class="card mb-4 space-y-3">
  <h2 class="section-title">How to use the app</h2>
  <ol class="space-y-3 text-sm leading-relaxed">
    <li>
      <strong>1. Add your active residence card.</strong><br />
      Enter the start and end dates of your current card.
    </li>
    <li>
      <strong>2. Add your trips.</strong><br />
      Use the dates you left and returned to Portugal.
    </li>
    <li>
      <strong
        >3. For trips outside Schengen, add Schengen exit details if they differ from your Portugal
        dates.</strong
      ><br />
      For example, if you flew Lisbon → Madrid → Istanbul, your Portugal exit date and Schengen exit date
      may be different.
    </li>
    <li>
      <strong>4. Check your Home tab.</strong><br />
      The Home tab shows your remaining days, current absence count, planned-trip projection, longest
      single absence, and how your absences fall across the card period.
    </li>
    <li>
      <strong>5. Back up regularly.</strong><br />
      Export JSON after important changes.
    </li>
  </ol>
</section>

<section class="card mb-4 space-y-3 text-sm">
  <h2 class="section-title">About this app</h2>
  <p>
    This app helps Portuguese residence permit holders track time spent outside Portugal and the
    Schengen Area against <strong>Article 85 of Lei n.º 23/2007</strong>.
  </p>
  <p>
    It is not legal advice. For decisions affecting your residency, consult AIMA or a licensed
    Portuguese immigration attorney.
  </p>
  <p class="caption-muted">
    Limits are expressed in months by the law. Consecutive limits are computed using exact calendar
    arithmetic; interpolated limits use 30.4375 days/month (e.g., 8 months ≈ 244 days).
  </p>
  <p class="caption">
    Built with care in Lisbon by Khaled Mostafa.<br />
    Feedback: <a class="underline" href="mailto:khaled@dedwen.co">khaled@dedwen.co</a>
  </p>
</section>

<section class="card mb-4 space-y-3 text-sm">
  <h2 class="section-title">Privacy notice</h2>
  <p>
    Your residence card details, trip dates, destinations, purposes, and notes are stored locally on
    this device and are not sent to the app creator.
  </p>
  <p>
    Basic privacy-friendly analytics may be used to understand general app usage, such as visits.
    Analytics do not include your travel or residence data.
  </p>
  <p class="caption">
    Your local app data stays on this device until you delete it, clear browser storage, or
    uninstall the app.
  </p>
</section>
