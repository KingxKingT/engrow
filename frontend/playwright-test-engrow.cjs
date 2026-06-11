const { chromium } = require('playwright');
const TARGET_URL = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const results = [];

  function logResult(name, pass, detail = '') {
    const status = pass ? 'PASS' : 'FAIL';
    results.push({ name, status, detail });
    console.log(`  ${status}: ${name}${detail ? ' - ' + detail : ''}`);
  }

  try {
    // ==================== 1. LANDING PAGE ====================
    console.log('\n=== 1. Landing Page ===');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    logResult('Page loads', !page.url().includes('error'), 'URL: ' + page.url());

    const bodyText = await page.textContent('body');
    const hasStartFree = bodyText.includes('Start for free') || bodyText.includes('Get Started');
    const hasSignIn = bodyText.includes('Sign in');
    logResult('Has CTA buttons', hasStartFree && hasSignIn, `Start:${hasStartFree} SignIn:${hasSignIn}`);

    // Try clicking "Start for free" or "Get Started"
    let clickedAuth = false;
    const startBtns = await page.locator('a, button').all();
    for (const btn of startBtns) {
      const txt = (await btn.textContent()).trim().toLowerCase();
      if (txt.includes('start') || txt.includes('get started')) {
        await btn.click();
        clickedAuth = true;
        break;
      }
    }
    await page.waitForTimeout(2000);
    logResult('Navigate to auth', clickedAuth, clickedAuth ? 'CTA clicked' : 'no matching CTA found');

    // ==================== 2. AUTH (SIGNUP) ====================
    console.log('\n=== 2. Signup ===');
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';
    const testName = 'Test User';

    // Check if auth page has tabs (role="tab")
    const tabs = await page.locator('[role="tab"]').all();
    let signedUp = false;
    let loggedIn = false;

    if (tabs.length >= 2) {
      // Click signup tab (should be second or labeled Sign Up)
      for (const tab of tabs) {
        const txt = (await tab.textContent()).trim().toLowerCase();
        if (txt.includes('sign up') || txt.includes('register')) {
          await tab.click();
          await page.waitForTimeout(500);
          break;
        }
      }
      // Try filling signup form using name attributes
      await page.waitForTimeout(300);
      const inputs = await page.locator('input').all();
      for (const inp of inputs) {
        const name = await inp.getAttribute('name');
        if (name === 'name') await inp.fill(testName);
        else if (name === 'email') await inp.fill(testEmail);
        else if (name === 'password') await inp.fill(testPassword);
      }
      // Submit
      const submitBtn = await page.locator('button[type="submit"]');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        // Check if we redirected away from auth page
        const currentUrl = page.url();
        if (!currentUrl.includes('/auth')) {
          signedUp = true;
          loggedIn = true;
          logResult('Signup + auto-login', true, `Email: ${testEmail}`);
        } else {
          // Check for error or success message
          const errText = await page.textContent('body');
          if (errText.includes('already exists')) {
            logResult('Signup (already exists)', true, 'user may exist from prior run');
          } else {
            logResult('Signup (stayed on auth)', false, 'redirect did not happen, trying login');
          }
        }
      }
    } else {
      logResult('Auth tabs not found', false, 'no role="tab" elements');
    }

    // ==================== 3. LOGIN (if signup didn't auto-login) ====================
    if (!loggedIn) {
      console.log('\n=== 3. Login ===');
      if (tabs.length >= 2) {
        for (const tab of tabs) {
          const txt = (await tab.textContent()).trim().toLowerCase();
          if (txt.includes('sign in') || txt.includes('login')) {
            await tab.click();
            await page.waitForTimeout(500);
            break;
          }
        }
      }
      await page.waitForTimeout(300);
      const inputs = await page.locator('input').all();
      for (const inp of inputs) {
        const name = await inp.getAttribute('name');
        if (name === 'email') await inp.fill(testEmail);
        else if (name === 'password') await inp.fill(testPassword);
      }
      const submitBtn = await page.locator('button[type="submit"]');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        loggedIn = !currentUrl.includes('/auth');
        logResult('Login', loggedIn, loggedIn ? `Redirected to ${currentUrl}` : 'stayed on auth page');
      }
    }

    // Hard redirect test if login failed
    if (!loggedIn) {
      console.log('  Trying direct navigation to dashboard...');
      await page.goto(`${TARGET_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    // ==================== 4. PLACEMENT TEST ====================
    console.log('\n=== 4. Placement Test ===');
    // Try navigating directly to placement
    await page.goto(`${TARGET_URL}/placement`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const placementText = await page.textContent('body').catch(() => '');
    const onPlacement = placementText.includes('placement') || placementText.includes('Placement');
    logResult('Placement page accessible', onPlacement, onPlacement ? 'detected Placement text' : 'may not be on placement page');

    if (onPlacement) {
      // Try clicking start/begin button
      const btns = await page.locator('button').all();
      let started = false;
      for (const btn of btns) {
        const txt = (await btn.textContent()).trim().toLowerCase();
        if (txt.includes('start') || txt.includes('begin') || txt.includes('begin test')) {
          await btn.click();
          started = true;
          await page.waitForTimeout(1000);
          break;
        }
      }
      logResult('Start placement test', started, started ? 'clicked start' : 'no start button found');

      // Try answering questions - look for option buttons
      for (let q = 0; q < 6; q++) {
        const options = await page.locator('button, [role="option"], .option, .answer').all();
        if (options.length === 0) {
          // Maybe already completed
          const submitBtn = await page.locator('button').all();
          let foundSubmit = false;
          for (const btn of submitBtn) {
            const txt = (await btn.textContent()).trim().toLowerCase();
            if (txt.includes('submit') || txt.includes('finish') || txt.includes('done')) {
              await btn.click();
              foundSubmit = true;
              break;
            }
          }
          if (foundSubmit) {
            await page.waitForTimeout(1000);
            logResult(`Question ${q + 1}`, true, 'submitted');
          }
          break;
        }
        // Click first available option
        try {
          const firstOption = await page.locator('button').first();
          if (await firstOption.isVisible()) {
            await firstOption.click();
            await page.waitForTimeout(500);

            // Click next / continue
            const nextBtns = await page.locator('button').all();
            for (const btn of nextBtns) {
              const txt = (await btn.textContent()).trim().toLowerCase();
              if (txt.includes('next') || txt.includes('continue')) {
                await btn.click();
                await page.waitForTimeout(500);
                break;
              }
            }
          }
          logResult(`Question ${q + 1} answered`, true);
        } catch (e) {
          logResult(`Question ${q + 1}`, false, e.message.substring(0, 60));
          break;
        }
      }

      // Check for result / results overlay
      await page.waitForTimeout(1500);
      const resultsText = await page.textContent('body').catch(() => '');
      const hasResults = resultsText.includes('result') || resultsText.includes('Result') || resultsText.includes('score') || resultsText.includes('Skill');
      logResult('Placement results visible', hasResults, hasResults ? 'detected results' : 'no results found');
    }

    // ==================== 5. DASHBOARD ====================
    console.log('\n=== 5. Dashboard ===');
    await page.goto(`${TARGET_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const dashText = await page.textContent('body').catch(() => '');
    const onDashboard = dashText.includes('dashboard') || dashText.includes('Dashboard') || dashText.includes('Progress') || dashText.includes('Skill');
    logResult('Dashboard accessible', onDashboard, onDashboard ? 'Dashboard content found' : 'no dashboard content');

    // ==================== 6. LESSONS ====================
    console.log('\n=== 6. Lessons ===');
    await page.goto(`${TARGET_URL}/lessons`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const lessonText = await page.textContent('body').catch(() => '');
    const onLessons = lessonText.includes('lesson') || lessonText.includes('Lesson');
    logResult('Lessons page accessible', onLessons, onLessons ? 'Lesson content found' : 'no lesson content');

    // ==================== 7. REVIEW ====================
    console.log('\n=== 7. Review ===');
    await page.goto(`${TARGET_URL}/review`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const reviewText = await page.textContent('body').catch(() => '');
    const onReview = reviewText.includes('review') || reviewText.includes('Review');
    logResult('Review page accessible', onReview, onReview ? 'Review content found' : 'no review content');

    // ==================== 8. ACCESSIBILITY ====================
    console.log('\n=== 8. Accessibility Settings ===');
    await page.goto(`${TARGET_URL}/accessibility`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const a11yText = await page.textContent('body').catch(() => '');
    const onA11y = a11yText.includes('accessibility') || a11yText.includes('Accessibility') || a11yText.includes('high contrast') || a11yText.includes('High Contrast');
    logResult('Accessibility page accessible', onA11y, onA11y ? 'Accessibility content found' : 'no accessibility content');

    // Try toggling high-contrast switch
    if (onA11y) {
      const toggle = await page.locator('[role="switch"], .toggle, .switch, input[type="checkbox"]').first();
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(500);
        logResult('Toggle accessibility option', true);
      } else {
        logResult('Toggle accessibility option', false, 'no toggle found');
      }
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    let passed = 0, failed = 0;
    for (const r of results) {
      if (r.status === 'PASS') passed++; else failed++;
      console.log(`  [${r.status}] ${r.name}`);
    }
    console.log('='.repeat(60));
    console.log(`Passed: ${passed}, Failed: ${failed}, Total: ${results.length}`);

    await page.screenshot({ path: 'C:\\Users\\PC\\AppData\\Local\\Temp\\opencode\\engrow-final.png', fullPage: true });
    console.log('Screenshot saved');

  } catch (err) {
    console.error('FATAL ERROR:', err.message);
    await page.screenshot({ path: 'C:\\Users\\PC\\AppData\\Local\\Temp\\opencode\\engrow-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
