import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'public', 'qa_screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Results output container
const results = {
  consoleLogs: [],
  pageErrors: [],
  networkErrors: [],
  failedSupabaseQueries: [],
  flowLogs: [],
};

async function runQA() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log(`Launching Puppeteer using Chrome from: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Listen to console events
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    results.consoleLogs.push({ type, text });
    console.log(`[Browser Console ${type}] ${text}`);
    if (text.includes('supabase') && (text.toLowerCase().includes('error') || text.toLowerCase().includes('fail'))) {
      results.failedSupabaseQueries.push(text);
    }
  });

  // Listen to runtime page errors/exceptions
  page.on('pageerror', err => {
    results.pageErrors.push({ message: err.message, stack: err.stack });
    console.error(`[Browser PageError] ${err.message}`);
  });

  // Listen to request failures
  page.on('requestfailed', request => {
    const url = request.url();
    const failureText = request.failure()?.errorText || 'unknown';
    results.networkErrors.push({ url, error: failureText });
    console.error(`[Browser Network Failed] ${url} - ${failureText}`);
  });

  // Listen to responses for HTTP errors
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400) {
      results.networkErrors.push({ url, status, statusText: response.statusText() });
      console.error(`[Browser Network Status ${status}] ${url}`);
      if (url.includes('supabase') || url.includes('supabase.co')) {
        results.failedSupabaseQueries.push(`Query to ${url} failed with status ${status}`);
      }
    }
  });

  const screenshot = async (name) => {
    const filePath = path.join(screenshotsDir, name);
    await page.screenshot({ path: filePath });
    console.log(`Screenshot saved: ${filePath}`);
  };

  try {
    results.flowLogs.push('Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000)); // wait for transitions
    await screenshot('1_splash.png');

    // Click Onboarding "Get started"
    results.flowLogs.push('Starting Onboarding flow...');
    const getStartedHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.toLowerCase().includes('get started')) || null;
    });

    if (getStartedHandle.asElement()) {
      await getStartedHandle.asElement().click();
      console.log('Clicked "Get started" button');
    } else {
      console.log('Could not find Get Started, trying to goto login');
      await page.goto('http://localhost:5173/login');
    }
    
    await new Promise(r => setTimeout(r, 1500));
    await screenshot('2_onboarding.png');

    // Dismiss Install Banner if present
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('✕'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // On OnboardingScreen, click "Continue" 4 times, then "Start My Journey"
    results.flowLogs.push('Stepping through onboarding slides...');
    for (let i = 0; i < 4; i++) {
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Continue'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      console.log(`Clicked Continue on slide ${i}: ${clicked}`);
      await new Promise(r => setTimeout(r, 1000));
    }

    // Click "Start My Journey 🚀"
    results.flowLogs.push('Clicking final onboarding launch button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Start My Journey'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await screenshot('3_login_screen.png');

    // Login page: Click Guest login button
    results.flowLogs.push('Attempting Guest Login...');
    const loggedIn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const guest = buttons.find(b => b.textContent.toLowerCase().includes('guest') || b.textContent.includes('Guest'));
      if (guest) {
        guest.click();
        return true;
      }
      return false;
    });

    if (!loggedIn) {
      throw new Error('Guest login button not found');
    }

    // Welcome animation takes 5.4 seconds, wait 7 seconds
    results.flowLogs.push('Waiting for welcome animation...');
    await new Promise(r => setTimeout(r, 7000));
    await screenshot('4_goal_setup_screen.png');

    // On GoalSetupScreen, click "Skip for now"
    results.flowLogs.push('Completing/Skipping Goal Setup...');
    const goalStatus = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skip = buttons.find(b => b.textContent.toLowerCase().includes('skip for now'));
      if (skip) {
        skip.click();
        return 'skipped';
      }
      // Or select first goal
      const divs = Array.from(document.querySelectorAll('div'));
      const goal = divs.find(d => d.textContent.includes('Build Discipline') || d.textContent.includes('Discipline'));
      if (goal) {
        goal.click();
        return 'selected_goal';
      }
      return 'none';
    });

    console.log(`Goal setup step status: ${goalStatus}`);
    await new Promise(r => setTimeout(r, 1000));

    if (goalStatus === 'selected_goal') {
      // Click "Add All 5 Habits ✓"
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addAll = buttons.find(b => b.textContent.includes('Add All 5 Habits') || b.textContent.includes('Add All'));
        if (addAll) addAll.click();
      });
      await new Promise(r => setTimeout(r, 2000));
    }

    // Wait for the app dashboard (Zenith page) to mount
    results.flowLogs.push('Mounting Zenith Dashboard...');
    await new Promise(r => setTimeout(r, 4000));
    await screenshot('5_zenith_page.png');

    let currentUrl = await page.url();
    results.flowLogs.push(`Current URL is ${currentUrl}`);

    // --- TEST ZENITH HABITS ---
    results.flowLogs.push('Testing Zenith - Add Habit...');
    const addHabitClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addHabit = buttons.find(b => b.textContent.includes('+ Add Habit'));
      if (addHabit) {
        addHabit.click();
        return true;
      }
      return false;
    });

    if (addHabitClicked) {
      await new Promise(r => setTimeout(r, 1000));
      await screenshot('6_add_habit_modal.png');

      await page.type('input[placeholder="e.g., Read 10 pages"]', 'QA E2E Habit');
      
      const saveHabitClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const saveBtn = buttons.find(b => b.textContent.includes('Add Habit ✓') || b.textContent.includes('Save'));
        if (saveBtn) {
          saveBtn.click();
          return true;
        }
        return false;
      });
      console.log(`Save habit click action: ${saveHabitClicked}`);
      await new Promise(r => setTimeout(r, 2000));
      await screenshot('7_zenith_with_new_habit.png');
    } else {
      results.flowLogs.push('WARNING: + Add Habit button not found');
    }

    results.flowLogs.push('Testing Zenith - Complete Habit...');
    const toggleHabitClicked = await page.evaluate(() => {
      // Find element that contains "QA E2E Habit" and click it
      const elements = Array.from(document.querySelectorAll('div, span, button'));
      const item = elements.find(el => el.textContent.includes('QA E2E Habit'));
      if (item) {
        item.click();
        return true;
      }
      return false;
    });

    if (toggleHabitClicked) {
      console.log('Clicked habit checkbox/toggle');
      await new Promise(r => setTimeout(r, 2000));
      await screenshot('8_habit_completed.png');
    } else {
      console.log('WARNING: Could not toggle habit');
    }

    // --- TEST NAVIGATION TO GROWTH ---
    results.flowLogs.push('Navigating to Growth Pillar...');
    await page.goto('http://localhost:5173/growth');
    await new Promise(r => setTimeout(r, 2000));
    await screenshot('9_growth_page.png');

    // We must first create a Project
    results.flowLogs.push('Testing Growth - Switch to Projects Tab...');
    const projectsTabClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const prj = buttons.find(b => b.textContent.includes('Projects'));
      if (prj) {
        prj.click();
        return true;
      }
      return false;
    });

    if (projectsTabClicked) {
      await new Promise(r => setTimeout(r, 1000));
      await screenshot('10_growth_projects_tab.png');

      results.flowLogs.push('Testing Growth - Create Project...');
      const createPrjClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Create Project') || b.textContent.includes('New'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (createPrjClicked) {
        await new Promise(r => setTimeout(r, 1000));
        await screenshot('11_new_project_modal.png');

        await page.type('input[placeholder="Project name..."]', 'QA E2E Project');
        await page.type('input[placeholder="Icon (emoji)"]', '🚀');

        const savePrjClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const saveBtn = buttons.find(b => b.textContent.includes('Create Project'));
          if (saveBtn) {
            saveBtn.click();
            return true;
          }
          return false;
        });
        console.log(`Save project click: ${savePrjClicked}`);
        await new Promise(r => setTimeout(r, 2000));
        await screenshot('12_growth_project_added.png');
      }
    }

    // Switch back to Today tab and add a task
    results.flowLogs.push('Testing Growth - Adding Task to Project...');
    const todayTabClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const todayBtn = buttons.find(b => b.textContent.includes('Today'));
      if (todayBtn) {
        todayBtn.click();
        return true;
      }
      return false;
    });

    if (todayTabClicked) {
      await new Promise(r => setTimeout(r, 1000));
      // Click Quick Add Task FAB (bottom left)
      const openTaskModalClicked = await page.evaluate(() => {
        // Find FAB at bottom left
        const buttons = Array.from(document.querySelectorAll('button'));
        // Find button that contains Lucide plus icon or position fixed left 20px
        const btn = buttons.find(b => b.style.left === '20px' || b.outerHTML.includes('lucide-plus'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (openTaskModalClicked) {
        await new Promise(r => setTimeout(r, 1000));
        await screenshot('13_new_task_modal.png');

        await page.type('input[placeholder="Task name..."]', 'QA E2E Task');
        
        // Select the project
        await page.evaluate(() => {
          const select = document.querySelector('select');
          if (select && select.options.length > 1) {
            select.selectedIndex = 1; // pick first custom project
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        const saveTaskClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent.includes('Add Task'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });

        console.log(`Save task click: ${saveTaskClicked}`);
        await new Promise(r => setTimeout(r, 2000));
        await screenshot('14_growth_task_added.png');
      }
    }

    // --- TEST NAVIGATION TO HEALTH ---
    results.flowLogs.push('Navigating to Health Pillar...');
    await page.goto('http://localhost:5173/health');
    await new Promise(r => setTimeout(r, 2000));
    await screenshot('15_health_page.png');

    results.flowLogs.push('Testing Health - Logging Water...');
    const logWaterClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const logWater = buttons.find(b => b.textContent.includes('+250ml') || b.textContent.includes('250ml'));
      if (logWater) {
        logWater.click();
        return true;
      }
      return false;
    });

    if (logWaterClicked) {
      console.log('Logged 250ml water');
      await new Promise(r => setTimeout(r, 1500));
      await screenshot('16_health_water_logged.png');
    }

    // --- TEST NAVIGATION TO WEALTH ---
    results.flowLogs.push('Navigating to Wealth Pillar...');
    await page.goto('http://localhost:5173/wealth');
    await new Promise(r => setTimeout(r, 2000));
    await screenshot('17_wealth_page.png');

    results.flowLogs.push('Testing Wealth - Logging Expense...');
    const expenseAmountInput = await page.$('input[placeholder="Amount"]');
    if (expenseAmountInput) {
      await page.type('input[placeholder="Amount"]', '120');
      await page.type('input[placeholder="Note / Description"]', 'E2E QA Expense');
      const addExpenseClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Add Expense'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      if (addExpenseClicked) {
        console.log('Logged expense');
        await new Promise(r => setTimeout(r, 1500));
        await screenshot('18_wealth_expense_added.png');
      }
    }

    // --- TEST NAVIGATION TO DEX AI ---
    results.flowLogs.push('Navigating to Dex AI...');
    await page.goto('http://localhost:5173/dex');
    await new Promise(r => setTimeout(r, 2000));
    await screenshot('19_dex_page.png');

    results.flowLogs.push('Testing Dex - Sending Chat message...');
    const dexChatInput = await page.$('input[placeholder*="Speak"]');
    if (dexChatInput) {
      await page.type('input[placeholder*="Speak"]', 'Hello Dex, analyze my current state.');
      const sendBtnClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('↑'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      if (sendBtnClicked) {
        console.log('Sent message to Dex');
        await new Promise(r => setTimeout(r, 6000));
        await screenshot('20_dex_ai_response.png');
      }
    }

    results.flowLogs.push('Testing Dex - Generating OS Summary...');
    const summaryTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('OS Summary')) || null;
    });
    if (summaryTabBtn.asElement()) {
      await summaryTabBtn.asElement().click();
      await new Promise(r => setTimeout(r, 1000));
      const generateAnalysisBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.includes('Generate Analysis')) || null;
      });
      if (generateAnalysisBtn.asElement()) {
        await generateAnalysisBtn.asElement().click();
        console.log('Generating OS Summary');
        await new Promise(r => setTimeout(r, 5000));
        await screenshot('21_dex_summary_tab.png');
      }
    }

    results.flowLogs.push('Testing Dex - Quiz...');
    const quizTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Brain Teasers') || b.textContent.includes('Teasers')) || null;
    });
    if (quizTabBtn.asElement()) {
      await quizTabBtn.asElement().click();
      await new Promise(r => setTimeout(r, 1000));
      await screenshot('22_dex_quiz_start.png');
    }

    // --- TEST NAVIGATION TO PROFILE ---
    results.flowLogs.push('Navigating to Profile...');
    await page.goto('http://localhost:5173/profile');
    await new Promise(r => setTimeout(r, 2000));
    await screenshot('23_profile_page.png');

    // --- TEST NAVIGATION TO STATS ---
    results.flowLogs.push('Navigating to Stats...');
    await page.goto('http://localhost:5173/stats');
    await new Promise(r => setTimeout(r, 2000));
    await screenshot('24_stats_page.png');

    results.flowLogs.push('Refreshing page to verify session persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    const finalUrl = await page.url();
    results.flowLogs.push(`Post-refresh URL is ${finalUrl}`);
    await screenshot('25_post_refresh.png');

  } catch (error) {
    console.error('QA Automation Script Failed with error:', error);
    results.flowLogs.push(`CRITICAL ERROR during flow: ${error.message}`);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, 'qa_results.json'), JSON.stringify(results, null, 2));
    console.log('Puppeteer QA Run Finished.');
  }
}

runQA();
