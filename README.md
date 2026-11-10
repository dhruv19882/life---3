# LifeOS 3.0

**One Life. One System. Total Clarity.**

LifeOS is a private personal life operating system that runs in the browser and installs on your phone as an app (PWA). After the first load it works fully offline. All data stays on the device in IndexedDB. There is no account, no server, no analytics and no paid or external API.

## Modules

| Area | What it does |
| --- | --- |
| **Home** | Greeting, live clock, notifications, **My Life Score** (Health, Fitness, Career, Education, Finance, Discipline), 11 live cards, today's priorities, daily summary, tomorrow preview. |
| **Food Library** | 127 Indian foods bundled offline (breakfast, meals, fruits, dairy, weight-gain, snacks, eggs & non-veg) plus custom foods, recipes, custom meals, favourites, recents and 14-day history. Every value is editable. |
| **Meal logger** | Tap **+ → Add Food**, pick several foods, set quantity in g / pieces / cups / ml / servings / bowls, see calories, protein, carbs, fat and fibre update live, then save. Optional photo (see below). |
| **Nutrition** | Calorie, protein, carb, fat and water targets (Mifflin-St Jeor, editable overrides), animated rings, calories/protein remaining, meals completed, macro balance, an editable low-budget weight-gain plan with daily cost, weekly and monthly grocery lists, vegetarian swaps and protein-per-₹ ranking. |
| **Fitness** | Default split (Mon Chest+Triceps · Tue Back+Biceps · Wed Legs+Abs · Thu Rest · Fri Chest+Back+Shoulders · Sat Legs+Arms · Sun Rest), 37-exercise library with steps and tempo guide, set logging, rest timer, plate animation, haptics, PRs (est. 1RM), weekly volume, sets per muscle group, history, weight trend from weekly averages against your target weights. Weight increases are suggested only when every set hit the top of the rep range. |
| **Work OS** | Dashboard, tasks by area (reimbursements, vendor reconciliation, bank, payroll, tax, W-9/W-8, 1099, QuickBooks, Excel…), pending approvals, daily journal that rewrites quick notes into professional English (rule-based, offline), timesheets, weekly professional report (copy / .txt). |
| **US CMA** | Part 1 and Part 2 sections and topics (IMA content specification), topic status, study sessions (study, MCQ, Hock, revision, mock, backlog), accuracy, weak topics, weekly target ring, exam countdowns, milestone unlocks, backlog subjects. |
| **Career** | Nine skills with milestones, resources and practice projects; portfolio manager; career timeline to FP&A Analyst. |
| **Finance** | Income, expenses, refunds, transfers; balance; monthly and category budgets; safe-to-spend per day; recurring items (never auto-posted); purchase history with search; 6-month reports; animated digital receipts. |
| **Fees & Payments** | Money to collect and money to pay with installments, auto status (Pending / Partially Paid / Paid / Overdue), outstanding indicator, overpayment blocked, receipts, monthly collection summary. Payments can be added to Finance; unpaid amounts never are. |
| **Dubai Mission** | Target date vs confirmed travel date, countdown, skyline savings visual, deposits/withdrawals, personal costs separate from employment/visa costs, every amount marked "needs research" until you enter and verify it, career-readiness checklist, roadmap. |
| **Goals & Tasks** | Long-term goals with short-term steps and a to-do list (carried over from v1). |
| **Social Media** | Manual minutes per app with warning and maximum limits, daily / weekly / monthly views, streaks, alerts. |
| **Progress & Daily Review** | Life Score detail and 7-day trend, weekly review with real comparisons, achievements, end-of-day review and three rule-based priorities for tomorrow. |
| **Settings** | Profile, work hours, theme (Auto / By time / Dark Premium / Light Fresh), motion (System / Reduced / Full), haptics, JSON backup & restore, 12 CSV exports, offline status, erase. |

The floating **+** button opens: Add Food, Add Expense, Add Income, Collect Payment, Add Weight, Add Water, Log Workout, Study Session, Work Note, Add Task.

## How the numbers are calculated

- **Food:** nutrients = reference value per 100 g × grams ÷ 100, where grams = quantity × unit weight (e.g. 1 roti = 40 g, 1 glass = 250 ml ≈ 250 g). Example: 2 roti + 150 g dal + 150 g rice + 100 g curd = **654 kcal, 23.7 g protein**. Logged meals keep the values they were saved with.
- **Targets:** BMR = 10 × kg + 6.25 × cm − 5 × age + 5 (male). Calories = BMR × activity + 400 (lean bulk). Protein 2 g/kg, fat 25% of calories, carbs the rest, water 35 ml/kg + 500 ml. Example: 25 y / 175 cm / 60 kg / moderate → 2,840 kcal, 120 g protein.
- **Life Score:** each pillar is a weighted average of rules that apply today; rules with no data (rest day, steps not logged, no study target…) are left out, not counted as zero. Tap any pillar to see its rules.
- **Finance balance:** opening + income + refunds − expenses − transfers out + transfers in. Money to collect is shown separately and never included.
- **Fees:** outstanding = amount − sum of payments; overdue when past due with a balance.
- **Dubai:** required = sum of entered personal costs (+ employment costs only if you include them); monthly target = remaining ÷ months to the date.

Food values are approximate references (IFCT 2017 / USDA style); prices are rough North-India estimates. Both are editable.

## Food photos

LifeOS does **not** identify food from photos. No usable food-recognition model can be bundled that runs offline on a phone browser reliably, and cloud APIs are excluded by design. Instead the photo flow is a local matching workflow: attach a photo, LifeOS suggests the foods you most often eat at that meal, you confirm items and portions, and the photo is stored with the meal on the device. A photo is never treated as an exact calorie count.

## What needs internet

Nothing, after the first visit. The only exceptions are links you add yourself to learning resources or portfolio items, which open web pages.

## Your data

- Stored in this browser's IndexedDB (falls back to localStorage if IndexedDB is unavailable). LifeOS asks the browser for persistent storage.
- **Settings → JSON backup** downloads everything (optionally without photos). **Restore** shows a summary, asks for confirmation and first downloads a copy of the current data.
- **Settings → CSV export** covers transactions, meals, weight, water/steps, workout sets, fees & payments, CMA sessions, work journal, work tasks, timesheets, social minutes and tasks.
- Upgrading from LifeOS v1 is automatic: the old `localStorage` data is migrated (meals, water, workouts, money, goals, tasks, social limits) and the original copy is kept under `lifeos.v1.migrated`.
- **Personal details are not in the source code.** Enter them during setup, or restore your private starter file (`lifeos-starter-*.json`, kept outside this repository).

## Run locally

No build step and no dependencies.

```bash
python3 -m http.server 8000      # then open http://localhost:8000
node tests/calc.test.js          # calculation tests
```

The offline engine (service worker) needs `http://localhost` or HTTPS.

## Project structure

```
index.html            App shell, splash, navigation, SVG gradients
manifest.webmanifest  PWA metadata, icons, shortcuts
sw.js                 Offline cache (bump VERSION on every change)
css/styles.css        Design system: dark + light themes, components, motion, reduced motion
js/core.js            Helpers, icons, default state, schema migrations
js/store.js           IndexedDB storage, legacy migration, flush on hide
js/data.js            Targets, exercises, split, CMA syllabus, career & Dubai defaults, work areas
js/foods.js           Food library, units, grocery prices, calculations, default meal plan
js/ui.js              Rings, charts, sheets, toasts, celebrations, receipts, rest timer
js/engine.js          Cross-module maths, Life Score, notifications, priorities, weekly review
js/app.js             Router, bottom bar, sidebar, FAB menu, theme, onboarding, boot
js/views/*.js         One file per module
tests/calc.test.js    Node tests for the calculations
docs/                 Testing report and deployment guide
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to install on Android and [docs/TESTING.md](docs/TESTING.md) for the test report.
