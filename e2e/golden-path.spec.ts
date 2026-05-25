import { test, expect } from '@playwright/test';

test('first run flow: accept disclaimer, add card, add trip, see dashboard', async ({ page }) => {
  await page.goto('/');

  // Disclaimer modal blocks until accepted.
  await expect(page.getByText('Important notice')).toBeVisible();
  await page.getByRole('button', { name: 'I understand' }).click();
  // Wait for the modal to fully dismiss (settings write completes) before
  // navigating — otherwise the next page load can re-mount the modal.
  await expect(page.getByText('Important notice')).not.toBeVisible();

  // No active card → onboarding card visible with "Start tracking" CTA.
  await expect(page.getByRole('link', { name: 'Start tracking' })).toBeVisible();

  // Add a card.
  await page.goto('/cards/');
  await page.getByRole('button', { name: 'Add card' }).click();
  await page.getByLabel('Label').fill('2nd card');
  await page.getByLabel('Permit type').selectOption('subsequent_3yr');
  await page.getByLabel('Issued').fill('2025-08-01');
  await page.getByLabel('Expiry').fill('2028-01-31');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('2nd card')).toBeVisible();

  // Add a UK trip.
  await page.goto('/trips/');
  await page.getByRole('button', { name: 'Add trip' }).click();
  await page.getByLabel('Left Portugal').fill('2025-11-04');
  await page.getByLabel('Returned to Portugal').fill('2025-11-12');
  await page.getByRole('button', { name: 'Pick a country' }).click();
  await page.getByPlaceholder('Search countries…').fill('United Kingdom');
  await page.getByRole('button', { name: /United Kingdom/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('🇬🇧')).toBeVisible();

  // Dashboard hero shows the absence numbers.
  await page.goto('/');
  await expect(page.getByText('Your remaining allowance')).toBeVisible();
  // Portugal scope is the default; trip 2025-11-04 → 2025-11-12 = 8 days absence.
  await expect(
    page.getByText("You've used 8 out of 244 days of your absence allowance")
  ).toBeVisible();
});
