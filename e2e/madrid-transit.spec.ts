import { test, expect } from '@playwright/test';

test('Madrid-transit trip produces distinct Portugal and Schengen absence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I understand' }).click();
  // Wait for the disclaimer modal to fully dismiss before navigating.
  await expect(page.getByText('Before you start')).not.toBeVisible();

  // Card
  await page.goto('/cards/');
  await page.getByRole('button', { name: 'Add card' }).click();
  await page.getByLabel('Label').fill('2nd card');
  await page.getByLabel('Permit type').selectOption('subsequent_3yr');
  await page.getByLabel('Issued').fill('2025-08-01');
  await page.getByLabel('Expiry').fill('2028-01-31');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('2nd card')).toBeVisible();

  // Add the Madrid-transit trip:
  //   Left Portugal Mon 2026-05-04, transited via Madrid one day,
  //   Schengen exit Tue 2026-05-05 → Istanbul → back via Madrid → returned to Portugal Sun 2026-05-17
  await page.goto('/trips/');
  await page.getByRole('button', { name: 'Add trip' }).click();
  await page.getByLabel('Left Portugal').fill('2026-05-04');
  await page.getByLabel('Returned to Portugal').fill('2026-05-17');

  await page.getByRole('button', { name: 'Pick a country' }).click();
  await page.getByPlaceholder('Search countries…').fill('Türkiye');
  await page.getByRole('button', { name: /Türkiye/ }).click();

  // Schengen-date pair is now visible — override the exit date to the day after Portugal exit.
  await page.getByLabel('Left Schengen', { exact: true }).fill('2026-05-05');
  await page.getByLabel('Re-entered Schengen', { exact: true }).fill('2026-05-17');

  await page.getByRole('button', { name: 'Save' }).click();

  // Confirm the trip landed in the list before navigating to dashboard.
  await expect(page.getByText('🇹🇷')).toBeVisible();

  // Dashboard: Portugal absence = 13 days, Schengen absence = 12 days.
  await page.goto('/');
  // Active card header confirms data loaded.
  await expect(page.getByText('2nd card', { exact: true })).toBeVisible();

  await expect(page.getByText('Outside Portugal', { exact: true })).toBeVisible();
  await expect(page.getByText('Outside Schengen', { exact: true })).toBeVisible();

  // Portugal absence = 13 d, Schengen absence = 12 d.
  // The AbsenceTile card contains both "Outside Portugal" + "days used"; the
  // Timeline legend only has "Trips outside Portugal" without "days used".
  const portugalTile = page
    .locator('.card')
    .filter({ hasText: 'Outside Portugal' })
    .filter({ hasText: 'days used' });
  await expect(portugalTile).toContainText('13');

  const schengenTile = page
    .locator('.card')
    .filter({ hasText: 'Outside Schengen' })
    .filter({ hasText: 'days used' });
  await expect(schengenTile).toContainText('12');
});
