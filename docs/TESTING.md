# LifeOS 3.0 testing report

Date: 10 November 2026 · Build: `lifeos-v3.0.0` · Data schema: v3

## 1. Calculation tests (`node tests/calc.test.js`)

35 tests, **35 passed, 0 failed**. They load the real app modules in Node.

| Area | What is checked |
| --- | --- |
| Nutrition | 2 roti + 150 g dal + 150 g rice + 100 g curd = 654 kcal, 23.65 g protein, 480 g; glass and ml units; unknown unit returns 0 (no guessing); serving-based custom foods; edited reference values; recipes per serving; day totals and meals completed; default plan foods exist |
| Targets | Mifflin-St Jeor for 22 y / 170 cm / 49 kg / moderate / lean bulk = BMR 1,448, TDEE 2,244, 2,640 kcal, 98 g protein, 73 g fat, water 2,200 ml; overrides replace only the overridden value |
| Fees | ₹10,000 − ₹4,000 = ₹6,000 outstanding (Partially Paid); overdue after due date with day count; installments summing to the total = Paid, never negative; pending; totals per kind |
| Finance | Income, expense, refund and transfer handling; balance formula; safe-to-spend per day; money to collect excluded from balance; ten ₹0.10 expenses = ₹1.00 exactly; recurring item due only once per month |
| Dubai | Required / saved / remaining / monthly target; employment costs excluded unless included; 7 unknown costs flagged; target date ≠ confirmed |
| Life Score | Rest day not counted as zero; weighted mean of applicable rules; overall excludes empty pillars |
| Work | "worked on vendor recon and reviewed W9 forms" → "Worked on vendor reconciliation. Reviewed W-9 forms."; terms and tense normalised without adding facts; overnight timesheet; 2 PM–11 PM = 9 h |
| Body & gym | Weekly weight averages and rate per week; Epley 1RM and PRs (unfinished sets ignored); default split |
| Migration | v1 localStorage data → v3: water glasses → ml, old diet check-offs and extra foods → meal entries, social limits, transactions, budgets, workouts, goals and tasks preserved; migration is idempotent |

## 2. Browser tests (headless Chromium, 390 × 844 mobile viewport and 1280 × 860 desktop)

Driven through the real UI with Playwright.

| Check | Result |
| --- | --- |
| Fresh install → onboarding → home | Pass |
| FAB → Add Food → search → select roti, dal, rice, curd → review → save | Pass: review showed 2 / 150 / 150 / 100, totals 654 kcal · 23.7 g; dashboard updated to 654 kcal |
| Water tile +250 ml | Pass |
| Expense ₹250 with a **double tap** on Save | Pass: one transaction only, receipt shown |
| Income ₹30,000 | Pass: balance ₹29,750 |
| Fee ₹10,000 with ₹4,000 initial → status Partially Paid, outstanding ₹6,000 | Pass |
| Payment ₹7,000 (more than outstanding) | Pass: blocked |
| Payment ₹6,000 → Paid, both installments added to Finance as income | Pass |
| Workout set 40 kg × 8 → saved, plate animation, rest timer | Pass |
| Work note → generated summary | Pass |
| CMA MCQ session 29/40 → 72.5% accuracy, 90 min this week | Pass |
| Dubai deposit ₹5,000 recorded as a transfer (balance reduced, not counted as spending) | Pass |
| All 16 routes and every sub-tab render | Pass |
| Data after page reload | Pass: meals, transactions, fees, journal all present |
| Restore private starter file from onboarding | Pass: profile, backlog subjects, 2,640 kcal target |
| JavaScript errors / console errors during all of the above | **None** |

### Offline (airplane mode)

1. Fresh load → service worker installed and controlling the page, **30 files cached**.
2. Browser set fully offline (`context.setOffline(true)`) and requests blocked.
3. Reloaded: app opened from cache.
4. Logged a meal and an expense, visited all 14 module routes: all worked.
5. Reloaded again while still offline: both new entries were still there.

### Bugs found and fixed during testing

- Hidden overlay and rest timer still captured taps because CSS `display` overrode the `hidden` attribute → global `[hidden] { display: none !important }`.
- The FAB covered the "Work" tab label → FAB is now centred on its slot in the bar.
- Picker showed a toast for every food added → removed (selection counter on the card instead).
- Small text selector shrank the "Net" value on the balance card → fixed.
- Desktop dashboard tiles were cramped → 3 columns beside the Life Score.
- Theme labels overflowed on small screens → shortened.

## 3. Not tested here

- **A physical Android phone.** The sandbox has no device. Please run the install + airplane-mode steps in `DEPLOYMENT.md` on your phone.
- **Emoji rendering.** The test browser has no emoji font, so food illustrations showed as boxes in screenshots. Android Chrome includes Noto Color Emoji; a few newer emoji (e.g. 🫓 flatbread, 🫘 beans) need Android 11 or later.
- **Haptics** (`navigator.vibrate`) only work on real Android hardware.
- Screen-reader walkthrough and Safari/iOS were not tested.

## Known limitations (by design)

- Food photos are not recognised automatically (no reliable offline model); you confirm foods and portions.
- Social media minutes, steps and screen time are entered manually; a web app cannot read other apps' usage.
- Notifications are in-app only; there is no push server.
- The work summary is rule-based rewriting, not AI.
