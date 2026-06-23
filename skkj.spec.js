// SKKJ Autopart — E2E regression tests
// Run locally:  npx playwright test
// Run headed:   npx playwright test --headed
//
// ── HOW TO VERIFY A TEST CATCHES A BUG ─────────────────────────────────────
// To confirm T2 (dark mode) works as a regression guard:
//   1. In skkj-version-2.html find line ~7845 (contact info card)
//   2. Change:  background:isDark?"#1E1E1E":"#fff"
//      To:      background:"#fff"        ← reintroduces the bug
//   3. Run:     npx playwright test --grep "T2"
//   4. T2 should FAIL — "Contact card has white background in dark mode"
//   5. Revert the change and run again — T2 should PASS
// ────────────────────────────────────────────────────────────────────────────

const { test, expect } = require('@playwright/test');

// Accept cookies before each test so the banner doesn't block clicks
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skkj_cookie_consent_v2', 'accepted');
  });
});

// ── T1: Homepage renders without JS errors ───────────────────────────────────
test('T1: homepage renders and React app mounts', async ({ page }) => {
  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  await page.goto('/');
  await page.waitForSelector('.skkj-v2', { timeout: 20000 });

  // App root should be visible
  await expect(page.locator('.skkj-v2')).toBeVisible();

  // Navigation should show Thai labels by default
  await expect(page.locator('.nav-page-btn').first()).toBeVisible();

  // No uncaught JS exceptions (ignore known CDN/environment warnings)
  const critical = jsErrors.filter(msg =>
    !msg.includes('Babel') &&
    !msg.includes('supabase') &&
    !msg.includes('net::ERR') &&
    !msg.includes('favicon')
  );
  expect(critical, `Unexpected JS errors: ${critical.join('\n')}`).toHaveLength(0);
});

// ── T2: Contact page cards are readable in dark mode ────────────────────────
// Regression for: "info cards render as blank white boxes in dark mode"
test('T2: contact page cards readable in dark mode', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.skkj-v2', { timeout: 20000 });

  // Navigate to contact page
  await page.locator('.nav-page-btn', { hasText: 'ติดต่อ' }).click();
  await page.locator('text=087-102-2666').waitFor({ timeout: 8000 });

  // Enable dark mode
  await page.locator('button[title="โหมดมืด"]').click();
  await page.locator('.skkj-v2[data-dark="1"]').waitFor({ timeout: 3000 });

  // Phone number text should be in the DOM and visible
  const phoneEl = page.locator('text=087-102-2666').first();
  await expect(phoneEl).toBeVisible();

  // Card background must be dark (not white) — this is the regression check.
  // Bug state: background stays #fff → white text on white = invisible.
  const cardBgBrightness = await page.evaluate(() => {
    // Find the contact card that wraps the phone number
    const allDivs = Array.from(document.querySelectorAll('.skkj-v2 div'));
    const phoneDiv = allDivs.find(d =>
      d.children.length === 0 && d.textContent.trim() === '087-102-2666'
    );
    if (!phoneDiv) return -1;

    // Walk up to the nearest element that has an explicit background set
    let el = phoneDiv.parentElement;
    while (el && !el.classList.contains('skkj-v2')) {
      const style = el.getAttribute('style') || '';
      if (style.includes('background')) {
        const bg = window.getComputedStyle(el).backgroundColor;
        const nums = bg.match(/\d+/g);
        if (nums && nums.length >= 3) {
          return (parseInt(nums[0]) + parseInt(nums[1]) + parseInt(nums[2])) / 3;
        }
      }
      el = el.parentElement;
    }
    return -1;
  });

  expect(cardBgBrightness, 'Could not find contact card element').toBeGreaterThan(-1);
  expect(
    cardBgBrightness,
    `Contact card has white/light background in dark mode (brightness ${cardBgBrightness}/255 — should be < 80)`
  ).toBeLessThan(80);
});

// ── T3: Product search filters results ──────────────────────────────────────
test('T3: catalog search filters products by keyword', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.skkj-v2', { timeout: 20000 });

  // Go to catalog
  await page.locator('.nav-page-btn', { hasText: 'สินค้า' }).click();

  // Search input should be visible
  const searchInput = page.locator('input[placeholder*="ค้นหา"]');
  await expect(searchInput).toBeVisible({ timeout: 8000 });

  // Search for a known brand
  await searchInput.fill('Toyota');
  await page.waitForTimeout(600); // debounce

  // Toyota products should appear (default data has Toyota Camry, Altis, etc.)
  await expect(page.locator('text=แคมรี่').first()).toBeVisible({ timeout: 5000 });

  // Search for something that doesn't exist
  await searchInput.fill('xyznotaproduct999');
  await page.waitForTimeout(600);

  // No-results message should appear
  await expect(page.locator('text=แคมรี่').first()).not.toBeVisible();
});

// ── T4: Checkout form opens with all required fields ────────────────────────
test('T4: checkout form has name, phone and address fields', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.skkj-v2', { timeout: 20000 });

  // Go to catalog and search for an in-stock item
  await page.locator('.nav-page-btn', { hasText: 'สินค้า' }).click();
  const searchInput = page.locator('input[placeholder*="ค้นหา"]');
  await expect(searchInput).toBeVisible({ timeout: 8000 });
  await searchInput.fill('Toyota');
  await page.waitForTimeout(600);

  // Click the first "สั่งซื้อเลย" button that is not disabled
  const orderBtns = page.locator('button:not([disabled])', { hasText: 'สั่งซื้อเลย' });
  await expect(orderBtns.first()).toBeVisible({ timeout: 5000 });
  await orderBtns.first().click();

  // Order form modal should open
  await expect(page.locator('input[name="customer"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('input[name="phone"]')).toBeVisible();
  await expect(page.locator('textarea[name="address"]')).toBeVisible();
});

// ── T5: Language toggle switches all nav labels ──────────────────────────────
test('T5: language toggle switches nav text between Thai and English', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.skkj-v2', { timeout: 20000 });

  // Default is Thai
  await expect(page.locator('.nav-page-btn', { hasText: 'สินค้า' }).first()).toBeVisible();
  await expect(page.locator('.nav-page-btn', { hasText: 'ติดต่อ' }).first()).toBeVisible();

  // Switch to English
  await page.locator('.lang-switch button', { hasText: 'EN' }).click();
  await expect(page.locator('.nav-page-btn', { hasText: 'Catalog' }).first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.nav-page-btn', { hasText: 'Contact' }).first()).toBeVisible();

  // Switch back to Thai
  await page.locator('.lang-switch button', { hasText: 'TH' }).click();
  await expect(page.locator('.nav-page-btn', { hasText: 'สินค้า' }).first()).toBeVisible({ timeout: 3000 });
});

// ── T6: Cookie consent gate appears and can be accepted ─────────────────────
// This test does NOT use the beforeEach localStorage bypass — it needs a fresh state.
test('T6: cookie consent banner appears on first visit and dismisses on accept', async ({ browser }) => {
  // Fresh context with empty localStorage (no cookies pre-accepted)
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/');
  await page.waitForSelector('.skkj-v2', { timeout: 20000 });

  // Cookie banner should be visible
  const acceptBtn = page.locator('button', { hasText: /ยอมรับ|Accept/i }).last();
  await expect(acceptBtn).toBeVisible({ timeout: 8000 });

  // Click accept — banner should disappear
  await acceptBtn.click();
  await expect(acceptBtn).not.toBeVisible({ timeout: 3000 });

  await context.close();
});
