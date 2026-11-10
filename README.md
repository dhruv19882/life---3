# LifeOS

An all-in-one personal tracker that installs on your phone like a normal app (it is a Progressive Web App) and works offline.

| Tab | What it does |
| --- | --- |
| **Home** | Dashboard for today: calories, protein, water and steps, social media warnings, today's workout, monthly money and today's tasks and goals. |
| **Goals** | Long-term goals with short-term steps (progress is calculated automatically), plus a to-do list with due dates, priorities and links to goals. |
| **Social** | Manual screen-time log per app. You set a **low limit** (yellow warning) and a **high limit** (red alert) for each app. Includes a 7-day chart and an under-limit streak. |
| **Money** | INR (₹) budget tracker: income and expenses by category, a monthly budget, optional category limits, warnings at 80% and 100%, and "safe to spend per day". |
| **Gym** | Coach with a 6-day Push/Pull/Legs plan: step-by-step instructions for every exercise, set logging (kg × reps), an automatic rest timer and weight-increase suggestions. Also an Indian low-budget bulk diet sized to your calorie target, meal check-off, a shopping list, a weight trend check, and water/steps/weight tracking. |

## Calorie maths

- BMR uses the Mifflin-St Jeor formula, multiplied by your activity level to get maintenance calories. A lean bulk adds 400 kcal.
- Protein target is 2 g per kg of body weight. Fat is 25% of calories, and carbs make up the rest.
- Example: male, 20 years, 170 cm, 50 kg, gym 4–6 days → about **2,670 kcal** and **100 g protein**. The default meal plan is about 2,720 kcal and 128 g protein for about ₹148 a day.
- Food values and prices are approximate.

## Install on your phone

The app must be served over **HTTPS** before a phone can install it. Any free static host works:

- **GitHub Pages:** push this folder to a repo, then go to Settings → Pages → Deploy from branch.
- **Netlify Drop:** drag this folder onto https://app.netlify.com/drop.

Then open the link on your phone:

- **Android (Chrome):** tap ⋮ → **Install app** (or **Add to Home screen**).
- **iPhone (Safari):** tap Share → **Add to Home Screen**.

## Your data

Everything is stored on the device, in the browser's `localStorage`. There are no accounts and no servers. Use **Profile → Export** to save a backup file, and **Import** to restore it on another phone.

## Project structure

```
index.html            App shell, tab bar, SVG gradients
manifest.webmanifest  Install metadata
sw.js                 Offline cache (service worker)
css/styles.css        Design system and animations
js/core.js            State, storage, dates, formatting, icons
js/data.js            Calorie maths, diet plan, exercise library, weekly split
js/ui.js              Rings, charts, sheets, toasts, confetti, rest timer
js/app.js             Router, events, onboarding, settings, backup
js/views/*.js         Home, Goals, Social, Money, Gym screens
```

There is no build step and there are no dependencies. To run it locally, use `python3 -m http.server` in this folder and open http://localhost:8000.

When you change any file, bump `CACHE` in `sw.js` (for example `lifeos-v2`) so installed phones download the update.
