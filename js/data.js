'use strict';
/* Static data and calculators: nutrition targets, Indian low-budget bulk diet, workout program. */
(function () {
  /* ---------- Nutrition targets ---------- */
  const ACTIVITY = [
    { id: 1.375, label: 'Light', note: 'Gym 2–3 days, desk job/student' },
    { id: 1.55, label: 'Moderate', note: 'Gym 4–6 days' },
    { id: 1.725, label: 'Very active', note: 'Gym 6 days + physical job/sport' },
  ];

  const GOAL_MODES = {
    bulk: { label: 'Lean bulk', surplus: 400, protein: 2.0 },
    maintain: { label: 'Maintain', surplus: 0, protein: 1.8 },
    cut: { label: 'Fat loss', surplus: -400, protein: 2.2 },
  };

  function targets(p) {
    if (!p) return null;
    // Mifflin-St Jeor BMR
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.gender === 'female' ? -161 : 5);
    const tdee = bmr * p.activity;
    const mode = GOAL_MODES[p.mode] || GOAL_MODES.bulk;
    const kcal = Math.round((tdee + mode.surplus) / 10) * 10;
    const protein = Math.round(p.weight * mode.protein);
    const fat = Math.round((kcal * 0.25) / 9);
    const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
    const water = Math.round(p.weight * 0.045 * 10) / 10 + 0.5; // litres, extra for training
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, water, mode };
  }

  /* ---------- Indian low-budget foods (approx. values per serving) ---------- */
  // kcal, p (protein g), c (carbs g), f (fat g), cost (₹, approx. city retail prices)
  const F = {
    milk: { name: 'Toned milk', qty: '250 ml', kcal: 145, p: 7.8, c: 11.8, f: 7.5, cost: 14 },
    oats: { name: 'Rolled oats', qty: '50 g', kcal: 190, p: 6.7, c: 33, f: 3.5, cost: 9 },
    banana: { name: 'Banana', qty: '1 medium', kcal: 105, p: 1.3, c: 27, f: 0.4, cost: 6 },
    banana2: { name: 'Bananas', qty: '2 medium', kcal: 210, p: 2.6, c: 54, f: 0.8, cost: 12 },
    pb: { name: 'Peanut butter', qty: '1 tbsp (16 g)', kcal: 94, p: 4, c: 3, f: 8, cost: 6 },
    eggs3: { name: 'Boiled eggs', qty: '3 whole', kcal: 234, p: 18.9, c: 1.8, f: 15.9, cost: 21 },
    chana: { name: 'Roasted chana', qty: '30 g', kcal: 110, p: 6, c: 17, f: 1.8, cost: 4 },
    rice: { name: 'Cooked rice', qty: '1 cup (160 g)', kcal: 205, p: 4.3, c: 45, f: 0.4, cost: 3 },
    dal: { name: 'Dal (toor/moong) with tadka', qty: '1 bowl (40 g raw)', kcal: 180, p: 9, c: 24, f: 5.5, cost: 8 },
    roti2: { name: 'Roti', qty: '2 medium', kcal: 200, p: 7, c: 42, f: 1, cost: 3 },
    roti3: { name: 'Roti', qty: '3 medium', kcal: 300, p: 10.5, c: 63, f: 1.5, cost: 5 },
    sabzi: { name: 'Seasonal sabzi', qty: '1 bowl', kcal: 100, p: 2.5, c: 12, f: 5, cost: 12 },
    curd: { name: 'Curd (dahi)', qty: '150 g', kcal: 90, p: 5, c: 7, f: 4.5, cost: 10 },
    peanuts: { name: 'Roasted peanuts', qty: '30 g', kcal: 170, p: 7.5, c: 5, f: 14.5, cost: 5 },
    soya: { name: 'Soya chunk curry', qty: '50 g dry + 1 tsp oil', kcal: 212, p: 26, c: 16.5, f: 4.7, cost: 11 },
    salad: { name: 'Salad (onion, tomato, cucumber)', qty: '1 plate', kcal: 30, p: 1, c: 6, f: 0, cost: 5 },
  };

  const sum = (items) =>
    items.reduce(
      (a, k) => {
        const x = F[k];
        a.kcal += x.kcal; a.p += x.p; a.c += x.c; a.f += x.f; a.cost += x.cost;
        return a;
      },
      { kcal: 0, p: 0, c: 0, f: 0, cost: 0 }
    );

  const BASE_MEALS = [
    { id: 'm1', time: '7:30 AM', name: 'Breakfast', emoji: '🥣', items: ['oats', 'milk', 'banana', 'pb'],
      how: 'Cook oats in the milk for 3–4 min. Top with sliced banana and peanut butter.',
      swap: 'No oats? Use 2 plates of poha/upma with peanuts.' },
    { id: 'm2', time: '11:00 AM', name: 'Mid-morning', emoji: '🥚', items: ['eggs3', 'chana'],
      how: 'Boil eggs the night before. Carry roasted chana in a small box.',
      swap: 'Vegetarian: 75 g paneer bhurji or 50 g extra soya chunks.' },
    { id: 'm3', time: '1:30 PM', name: 'Lunch', emoji: '🍛', items: ['rice', 'dal', 'roti2', 'sabzi', 'curd'],
      how: 'Normal home thali. Do not skip the dal and curd, they carry the protein.',
      swap: 'Rajma or chole instead of dal works the same.' },
    { id: 'm4', time: '5:00 PM', name: 'Pre-workout', emoji: '🍌', items: ['banana2', 'peanuts'],
      how: 'Eat 45–60 min before the gym for steady energy.',
      swap: 'Peanut chikki (1 bar) instead of peanuts.' },
    { id: 'm5', time: '8:30 PM', name: 'Post-workout dinner', emoji: '🍲', items: ['roti3', 'soya', 'salad'],
      how: 'Soak soya chunks in hot water 10 min, squeeze, then cook like a sabzi with onion-tomato masala.',
      swap: 'Non-veg: 150 g chicken curry instead of soya.' },
    { id: 'm6', time: '10:30 PM', name: 'Before bed', emoji: '🥛', items: ['milk'],
      how: 'Warm milk with a pinch of haldi. Slow protein while you sleep.',
      swap: '150 g curd if milk does not suit you.' },
  ];

  const BOOSTERS = [
    { id: 'b1', time: 'Any time', name: 'Desi mass gainer shake', emoji: '🥤', booster: true,
      items: ['milk', 'banana', 'oats', 'pb'],
      how: 'Blend 250 ml milk + 1 banana + 50 g oats + 1 tbsp peanut butter. Cheaper than any gainer powder.',
      swap: 'Add 1 tsp honey or 2 dates for extra calories.' },
    { id: 'b2', time: 'With lunch/dinner', name: 'Extra rice + dal', emoji: '🍚', booster: true, items: ['rice', 'dal'],
      how: 'One more serving of rice and dal at lunch or dinner.', swap: 'Or 2 extra rotis.' },
    { id: 'b3', time: 'Evening', name: 'Peanut snack', emoji: '🥜', booster: true, items: ['peanuts', 'banana'],
      how: 'Handful of peanuts with a banana.', swap: 'Or 1 peanut chikki bar.' },
  ];

  const mealTotals = (m) => sum(m.items);

  /** Build a plan close to the calorie target by adding boosters or trimming meals. */
  function dietPlan(t) {
    let meals = BASE_MEALS.map((m) => ({ ...m, ...mealTotals(m) }));
    const total = () => meals.reduce((a, m) => a + m.kcal, 0);
    if (t) {
      let i = 0;
      while (t.kcal - total() > 150 && i < BOOSTERS.length) {
        const b = BOOSTERS[i++];
        meals.push({ ...b, ...mealTotals(b) });
      }
      // Trim order if plan is too large for the target
      const trim = ['m6', 'm4', 'm2'];
      let j = 0;
      while (total() - t.kcal > 200 && j < trim.length) {
        meals = meals.filter((m) => m.id !== trim[j++]);
      }
    }
    const tot = meals.reduce(
      (a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f, cost: a.cost + m.cost }),
      { kcal: 0, p: 0, c: 0, f: 0, cost: 0 }
    );
    return { meals, total: tot };
  }

  const SHOPPING = [
    ['Toned milk', '15–20 L', 840],
    ['Rolled oats', '1.5 kg', 270],
    ['Bananas', '~150 pcs', 900],
    ['Eggs', '90 pcs (or paneer)', 630],
    ['Soya chunks', '1.5 kg', 300],
    ['Peanuts + peanut butter', '1 kg + 500 g', 450],
    ['Roasted chana', '1 kg', 140],
    ['Dal + rice + atta', '1.2 kg + 2 kg + 5 kg', 650],
    ['Curd + sabzi + salad', 'daily', 800],
  ];

  /* ---------- Exercise library ---------- */
  const EX = {
    bench: { name: 'Barbell Bench Press', muscle: 'Chest, front delts, triceps', kind: 'upper',
      steps: ['Lie flat, eyes under the bar, feet planted.', 'Grip slightly wider than shoulders, squeeze shoulder blades together.', 'Lower the bar to mid-chest in 2–3 seconds, elbows ~45° from body.', 'Press up and slightly back until arms are straight.'],
      tip: 'Keep your butt on the bench and wrists stacked over elbows.', mistake: 'Bouncing the bar off the chest.' },
    incDb: { name: 'Incline Dumbbell Press', muscle: 'Upper chest, front delts', kind: 'upper',
      steps: ['Set bench to 30°.', 'Start with dumbbells at chest level, palms forward.', 'Press up until arms are straight, dumbbells close but not touching.', 'Lower slowly until you feel a stretch in the chest.'],
      tip: 'A 30° incline hits the upper chest best; higher turns it into a shoulder press.', mistake: 'Flaring elbows to 90°.' },
    ohpDb: { name: 'Seated Dumbbell Shoulder Press', muscle: 'Shoulders, triceps', kind: 'upper',
      steps: ['Sit on a bench set upright, back supported.', 'Dumbbells at ear height, palms forward.', 'Press overhead until arms are nearly straight.', 'Lower under control to ear level.'],
      tip: 'Brace your core so your lower back does not arch.', mistake: 'Cutting the range short.' },
    lateral: { name: 'Dumbbell Lateral Raise', muscle: 'Side delts (shoulder width)', kind: 'upper',
      steps: ['Stand tall, light dumbbells at your sides.', 'Slight bend in elbows, lean forward a little.', 'Raise arms out to the side to shoulder height.', 'Lower in 2–3 seconds.'],
      tip: 'Lead with your elbows, imagine pouring water from a jug at the top.', mistake: 'Swinging heavy weights with the body.' },
    pushdown: { name: 'Cable Triceps Pushdown', muscle: 'Triceps', kind: 'upper',
      steps: ['Rope or bar attachment at the top of the cable.', 'Elbows pinned to your sides.', 'Push down until arms are straight, squeeze triceps.', 'Let it come back up to 90° slowly.'],
      tip: 'Only your forearms move.', mistake: 'Elbows drifting forward.' },
    ohTri: { name: 'Overhead Dumbbell Triceps Extension', muscle: 'Triceps (long head)', kind: 'upper',
      steps: ['Hold one dumbbell with both hands overhead.', 'Lower it behind your head by bending elbows.', 'Feel a deep stretch, then extend back up.', 'Keep elbows pointing forward.'],
      tip: 'Sit down for more stability.', mistake: 'Elbows flaring wide.' },
    pulldown: { name: 'Lat Pulldown', muscle: 'Lats (back width), biceps', kind: 'upper',
      steps: ['Grip bar slightly wider than shoulders.', 'Lean back slightly, chest up.', 'Pull the bar to your upper chest, driving elbows down.', 'Let it rise slowly until arms are straight.'],
      tip: 'Think "elbows to back pockets".', mistake: 'Pulling behind the neck or swinging.' },
    bbRow: { name: 'Barbell Row', muscle: 'Mid back, lats, rear delts', kind: 'upper',
      steps: ['Hinge forward to ~45°, back flat, knees soft.', 'Grip just outside the knees.', 'Pull the bar to your lower ribs.', 'Lower with control, keep the back angle fixed.'],
      tip: 'Brace your core like someone will punch your stomach.', mistake: 'Rounding the lower back.' },
    cableRow: { name: 'Seated Cable Row', muscle: 'Mid back, lats', kind: 'upper',
      steps: ['Sit tall, feet on platform, slight knee bend.', 'Pull handle to your belly button.', 'Squeeze shoulder blades together for 1 second.', 'Reach forward slowly for a stretch.'],
      tip: 'Keep your chest up, do not rock back.', mistake: 'Using your lower back to pull.' },
    facePull: { name: 'Face Pull', muscle: 'Rear delts, upper back (posture)', kind: 'upper',
      steps: ['Rope at upper chest height.', 'Pull towards your face, hands ending beside ears.', 'Rotate so knuckles face the ceiling.', 'Return slowly.'],
      tip: 'Light weight, slow reps. Great for shoulder health.', mistake: 'Going too heavy.' },
    bbCurl: { name: 'Barbell Curl', muscle: 'Biceps', kind: 'upper',
      steps: ['Stand tall, shoulder-width grip, palms up.', 'Curl the bar up keeping elbows at your sides.', 'Squeeze at the top.', 'Lower in 2–3 seconds.'],
      tip: 'An EZ bar is easier on the wrists.', mistake: 'Swinging the hips.' },
    hammer: { name: 'Hammer Curl', muscle: 'Biceps, forearms', kind: 'upper',
      steps: ['Dumbbells at sides, palms facing each other.', 'Curl up without rotating the wrist.', 'Pause at shoulder height.', 'Lower slowly.'],
      tip: 'Builds thicker-looking arms.', mistake: 'Moving the elbows forward.' },
    squat: { name: 'Barbell Back Squat', muscle: 'Quads, glutes, core', kind: 'lower',
      steps: ['Bar on upper back, feet shoulder-width, toes slightly out.', 'Breathe in and brace your core.', 'Sit down between your heels until thighs are at least parallel.', 'Drive up through the whole foot, knees tracking over toes.'],
      tip: 'Start with the empty bar and film your form from the side.', mistake: 'Knees caving inward.' },
    rdl: { name: 'Romanian Deadlift', muscle: 'Hamstrings, glutes, lower back', kind: 'lower',
      steps: ['Hold bar at hip height, knees slightly bent.', 'Push hips back, bar sliding down your thighs.', 'Stop when you feel a strong hamstring stretch (around mid-shin).', 'Squeeze glutes to stand up.'],
      tip: 'Back stays flat the entire time.', mistake: 'Turning it into a squat.' },
    legPress: { name: 'Leg Press', muscle: 'Quads, glutes', kind: 'lower',
      steps: ['Feet shoulder-width in the middle of the platform.', 'Lower until knees reach ~90°.', 'Press back up without locking the knees.', 'Keep your lower back flat on the pad.'],
      tip: 'Control the bottom, do not let the hips lift.', mistake: 'Locking knees at the top.' },
    legCurl: { name: 'Lying Leg Curl', muscle: 'Hamstrings', kind: 'lower',
      steps: ['Lie face down, pad just above heels.', 'Curl heels toward your glutes.', 'Squeeze for 1 second.', 'Lower slowly.'],
      tip: 'Keep hips pressed into the bench.', mistake: 'Lifting hips to cheat.' },
    calf: { name: 'Standing Calf Raise', muscle: 'Calves', kind: 'lower',
      steps: ['Balls of feet on a step or platform.', 'Lower heels for a full stretch.', 'Rise as high as possible.', 'Pause 1 second at top and bottom.'],
      tip: 'Full range beats heavy weight for calves.', mistake: 'Bouncing quickly.' },
    plank: { name: 'Plank', muscle: 'Core', kind: 'core', timed: true,
      steps: ['Forearms on the floor, elbows under shoulders.', 'Body in a straight line from head to heels.', 'Squeeze glutes and brace abs.', 'Breathe normally and hold.'],
      tip: 'Reps column = seconds held.', mistake: 'Hips sagging or piking up.' },
    ohp: { name: 'Standing Overhead Press', muscle: 'Shoulders, triceps, core', kind: 'upper',
      steps: ['Bar on front of shoulders, grip just outside shoulders.', 'Squeeze glutes and brace.', 'Press straight up, moving your head back then through.', 'Lock out overhead, bar over mid-foot.'],
      tip: 'Do not lean back; tight glutes keep you upright.', mistake: 'Arching the lower back.' },
    dbBench: { name: 'Flat Dumbbell Press', muscle: 'Chest, triceps', kind: 'upper',
      steps: ['Lie flat with dumbbells at chest level.', 'Press up and slightly together.', 'Lower slowly for a deep chest stretch.', 'Keep shoulder blades pinched.'],
      tip: 'Dumbbells fix left-right strength imbalances.', mistake: 'Going too deep with shoulders rolling forward.' },
    fly: { name: 'Pec Deck / Cable Fly', muscle: 'Chest', kind: 'upper',
      steps: ['Sit or stand with a slight bend in the elbows.', 'Bring hands together in a hugging motion.', 'Squeeze the chest for 1 second.', 'Open slowly to a comfortable stretch.'],
      tip: 'Elbow angle stays fixed throughout.', mistake: 'Turning it into a press.' },
    dips: { name: 'Bench or Parallel Dips', muscle: 'Triceps, chest', kind: 'upper',
      steps: ['Hands on bars (or bench behind you).', 'Lower until elbows reach 90°.', 'Push back up to straight arms.', 'Lean slightly forward for more chest.'],
      tip: 'Use bench dips or the assisted machine if bar dips are too hard.', mistake: 'Going too deep and hurting the shoulders.' },
    deadlift: { name: 'Conventional Deadlift', muscle: 'Full posterior chain', kind: 'lower',
      steps: ['Bar over mid-foot, feet hip-width.', 'Hinge down, grip just outside legs, shins touching bar.', 'Chest up, back flat, pull the slack out of the bar.', 'Push the floor away, stand tall, then lower the same path.'],
      tip: 'Start light and master the hinge. Quality over ego.', mistake: 'Rounding the back or jerking the bar.' },
    pullup: { name: 'Pull-up / Assisted Pull-up', muscle: 'Lats, biceps', kind: 'upper',
      steps: ['Hang with an overhand grip, shoulder-width.', 'Pull your chest toward the bar.', 'Chin clears the bar.', 'Lower to a full hang slowly.'],
      tip: 'Use the assisted machine or a band if you cannot do 5 reps yet.', mistake: 'Half reps and kicking.' },
    dbRow: { name: 'One-arm Dumbbell Row', muscle: 'Lats, mid back', kind: 'upper',
      steps: ['One knee and hand on the bench, back flat.', 'Pull dumbbell to your hip.', 'Squeeze the back at the top.', 'Lower to a full stretch.'],
      tip: 'Pull with the elbow, not the hand.', mistake: 'Twisting the torso.' },
    rearFly: { name: 'Rear Delt Fly', muscle: 'Rear delts', kind: 'upper',
      steps: ['Bend forward with light dumbbells, or use the reverse pec deck.', 'Raise arms out to the sides.', 'Squeeze at shoulder height.', 'Lower slowly.'],
      tip: 'Rear delts make shoulders look round from the side.', mistake: 'Shrugging the traps.' },
    incCurl: { name: 'Incline Dumbbell Curl', muscle: 'Biceps (long head)', kind: 'upper',
      steps: ['Sit back on a 45° bench, arms hanging.', 'Curl up without moving the upper arm.', 'Squeeze at the top.', 'Lower to a full stretch.'],
      tip: 'Lighter than normal curls, focus on the stretch.', mistake: 'Shoulders rolling forward.' },
    shrug: { name: 'Dumbbell Shrug', muscle: 'Traps', kind: 'upper',
      steps: ['Hold heavy dumbbells at your sides.', 'Lift shoulders straight up to your ears.', 'Hold 1 second.', 'Lower slowly.'],
      tip: 'Straight up and down, no rolling.', mistake: 'Bending the elbows.' },
    squatL: { name: 'Barbell Back Squat (lighter)', muscle: 'Quads, glutes', kind: 'lower',
      steps: ['Same setup as heavy squat day.', 'Use ~80% of your Monday weight.', 'Focus on depth and a slow 3-second lowering.', 'Drive up strongly.'],
      tip: 'Second squat day builds skill and size.', mistake: 'Rushing reps.' },
    bss: { name: 'Bulgarian Split Squat', muscle: 'Quads, glutes (each leg)', kind: 'lower',
      steps: ['Back foot on a bench, front foot 2 steps ahead.', 'Lower straight down until back knee nearly touches the floor.', 'Drive up through the front heel.', 'Finish all reps, then switch legs.'],
      tip: 'Start with bodyweight, add dumbbells when stable.', mistake: 'Front knee caving in.' },
    legExt: { name: 'Leg Extension', muscle: 'Quads', kind: 'lower',
      steps: ['Pad on lower shins, back against the seat.', 'Straighten legs fully.', 'Squeeze quads for 1 second.', 'Lower slowly.'],
      tip: 'Point toes up for a stronger squeeze.', mistake: 'Swinging the weight.' },
    seatedCalf: { name: 'Seated Calf Raise', muscle: 'Calves (soleus)', kind: 'lower',
      steps: ['Pad on lower thighs, balls of feet on platform.', 'Lower heels for a stretch.', 'Rise up high.', 'Pause and repeat.'],
      tip: 'High reps, slow tempo.', mistake: 'Short bouncy reps.' },
    hkr: { name: 'Hanging Knee Raise', muscle: 'Abs', kind: 'core',
      steps: ['Hang from a bar, shoulders engaged.', 'Raise knees toward your chest.', 'Curl your pelvis up at the top.', 'Lower slowly without swinging.'],
      tip: 'Use the captain\'s chair if grip gives out.', mistake: 'Swinging for momentum.' },
  };

  const ex = (id, sets, reps, rest) => ({ id, sets, reps, rest });

  const DAYS = {
    pushA: { name: 'Push A', focus: 'Chest · Shoulders · Triceps', color: 'g-warm',
      list: [ex('bench', 4, '6-8', 120), ex('incDb', 3, '8-10', 90), ex('ohpDb', 3, '8-10', 90), ex('lateral', 3, '12-15', 60), ex('pushdown', 3, '10-12', 60), ex('ohTri', 2, '10-12', 60)] },
    pullA: { name: 'Pull A', focus: 'Back · Rear delts · Biceps', color: 'g-blue',
      list: [ex('pulldown', 4, '8-10', 90), ex('bbRow', 4, '6-8', 120), ex('cableRow', 3, '10-12', 90), ex('facePull', 3, '12-15', 60), ex('bbCurl', 3, '8-10', 60), ex('hammer', 3, '10-12', 60)] },
    legsA: { name: 'Legs A', focus: 'Quads · Hamstrings · Calves · Core', color: 'g-green',
      list: [ex('squat', 4, '6-8', 150), ex('rdl', 3, '8-10', 120), ex('legPress', 3, '10-12', 90), ex('legCurl', 3, '10-12', 60), ex('calf', 4, '12-15', 60), ex('plank', 3, '30-45', 45)] },
    pushB: { name: 'Push B', focus: 'Shoulders · Chest · Triceps', color: 'g-warm',
      list: [ex('ohp', 4, '6-8', 120), ex('dbBench', 3, '8-10', 90), ex('fly', 3, '12-15', 60), ex('lateral', 4, '12-15', 60), ex('dips', 3, '6-12', 90), ex('pushdown', 3, '12-15', 60)] },
    pullB: { name: 'Pull B', focus: 'Back thickness · Traps · Biceps', color: 'g-blue',
      list: [ex('deadlift', 3, '5', 180), ex('pullup', 3, '5-10', 120), ex('dbRow', 3, '8-10', 90), ex('rearFly', 3, '12-15', 60), ex('incCurl', 3, '10-12', 60), ex('shrug', 3, '12-15', 60)] },
    legsB: { name: 'Legs B', focus: 'Quads · Glutes · Calves · Abs', color: 'g-green',
      list: [ex('squatL', 3, '8-10', 120), ex('bss', 3, '8-10', 90), ex('legExt', 3, '12-15', 60), ex('legCurl', 3, '12-15', 60), ex('seatedCalf', 4, '15-20', 45), ex('hkr', 3, '10-15', 60)] },
    rest: { name: 'Rest & Recover', focus: 'Walk · Stretch · Sleep', color: 'g-accent', list: [] },
  };

  // index = JS getDay() (0 = Sunday)
  const WEEK = ['rest', 'pushA', 'pullA', 'legsA', 'pushB', 'pullB', 'legsB'];

  const WARMUP = ['5 min brisk walk or cycle', '10 arm circles each way', '10 bodyweight squats', '1–2 light warm-up sets of your first exercise'];

  const REST_DAY = [
    { t: '30–40 min walk', d: 'Keeps you active without hurting recovery.' },
    { t: '10 min full-body stretch', d: 'Hips, hamstrings, chest and shoulders.' },
    { t: 'Eat your full calories', d: 'Muscle grows on rest days. Do not skip meals.' },
    { t: 'Sleep 8 hours', d: 'Most growth hormone is released in deep sleep.' },
    { t: 'Meal-prep for the week', d: 'Boil eggs, soak chana, portion peanuts.' },
  ];

  const COACH_TIPS = [
    'Aim to gain 0.25–0.5 kg per week. Faster than that is mostly fat.',
    'Add weight or reps every week. Small jumps (1–2.5 kg) add up fast.',
    'Drink at least 3 litres of water; more on hot days.',
    'Sleep 7–9 hours. Training breaks muscle, sleep rebuilds it.',
    'Hit your protein every day. It matters more than any supplement.',
    'Creatine monohydrate (3–5 g/day) is the best-researched cheap supplement. Ask a doctor if unsure.',
    'Take progress photos every 2 weeks in the same light.',
    'Missed a day? Do not double up. Just continue the next session.',
  ];

  Object.assign(App, {
    ACTIVITY, GOAL_MODES, targets, FOODS: F, dietPlan, SHOPPING,
    EX, DAYS, WEEK, WARMUP, REST_DAY, COACH_TIPS,
  });
})();
