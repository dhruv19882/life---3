'use strict';
/* Reference data and calculators: profile, nutrition targets, exercise library, workout split,
   CMA syllabus, career roadmap, Dubai plan defaults, work areas. */
(function () {
  /* ---------- profile ---------- */
  // Personal details are NOT stored in the source code (the code may be hosted publicly).
  // They are entered during setup or restored from a private starter/backup file.
  App.profileDefaults = () => ({
    name: '', gender: 'male', age: '', height: '', weight: '',
    targets: [], education: '', qualification: '', careerGoal: 'Finance Analyst / FP&A Analyst', field: 'Accounts & Finance',
    location: '', currency: 'INR', tz: 'Asia/Kolkata',
    activity: 1.55, mode: 'bulk', workStart: '14:00', workEnd: '23:00', workDays: [1, 2, 3, 4, 5],
    avatar: '',
  });

  /* ---------- nutrition targets ---------- */
  const ACTIVITY = [
    { id: 1.2, label: 'Sedentary', note: 'Desk work, no training' },
    { id: 1.375, label: 'Light', note: 'Gym 2–3 days' },
    { id: 1.55, label: 'Moderate', note: 'Gym 4–5 days + desk job' },
    { id: 1.725, label: 'Very active', note: 'Gym 6 days or physical job' },
  ];
  const GOAL_MODES = {
    bulk: { label: 'Lean bulk', surplus: 400, protein: 2.0 },
    maintain: { label: 'Maintain', surplus: 0, protein: 1.8 },
    cut: { label: 'Fat loss', surplus: -400, protein: 2.2 },
  };

  /** Daily targets. Mifflin-St Jeor BMR × activity, plus goal surplus. Any target can be overridden in settings. */
  function targets(p, o) {
    if (!p) return null;
    o = o || (App.state && App.state.nutrition && App.state.nutrition.targets) || {};
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.gender === 'female' ? -161 : 5);
    const tdee = bmr * (+p.activity || 1.55);
    const mode = GOAL_MODES[p.mode] || GOAL_MODES.bulk;
    const autoKcal = Math.round((tdee + mode.surplus) / 10) * 10;
    const kcal = +o.kcal > 0 ? Math.round(+o.kcal) : autoKcal;
    const protein = +o.protein > 0 ? Math.round(+o.protein) : Math.round(p.weight * mode.protein);
    const fat = +o.fat > 0 ? Math.round(+o.fat) : Math.round((kcal * 0.25) / 9);
    const carbs = +o.carbs > 0 ? Math.round(+o.carbs) : Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const waterMl = +o.waterMl > 0 ? Math.round(+o.waterMl) : Math.round((p.weight * 35 + 500) / 50) * 50;
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), autoKcal, kcal, protein, fat, carbs, waterMl, water: waterMl / 1000, mode, overridden: Object.keys(o).filter((k) => +o[k] > 0) };
  }

  /* Totals of the original app's fixed diet plan (used only to migrate old check-offs). */
  const LEGACY_PLAN = {
    m1: { name: 'Breakfast', slot: 'breakfast', kcal: 534, p: 19.8, c: 74.8, f: 19.4 },
    m2: { name: 'Mid-morning', slot: 'snacks', kcal: 344, p: 24.9, c: 18.8, f: 17.7 },
    m3: { name: 'Lunch', slot: 'lunch', kcal: 775, p: 27.8, c: 130, f: 16.4 },
    m4: { name: 'Pre-workout', slot: 'snacks', kcal: 380, p: 10.1, c: 59, f: 15.3 },
    m5: { name: 'Post-workout dinner', slot: 'dinner', kcal: 542, p: 37.5, c: 85.5, f: 6.2 },
    m6: { name: 'Before bed', slot: 'snacks', kcal: 145, p: 7.8, c: 11.8, f: 7.5 },
    b1: { name: 'Mass gainer shake', slot: 'snacks', kcal: 534, p: 19.8, c: 74.8, f: 19.4 },
    b2: { name: 'Extra rice + dal', slot: 'lunch', kcal: 385, p: 13.3, c: 69, f: 5.9 },
    b3: { name: 'Peanut snack', slot: 'snacks', kcal: 275, p: 8.8, c: 32, f: 14.9 },
  };

  /* ---------- exercise library ---------- */
  // group = primary muscle group used for weekly set statistics
  const EX = {
    bench: { name: 'Barbell Bench Press', group: 'chest', muscle: 'Chest, front delts, triceps', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Lie flat, eyes under the bar, feet planted.', 'Grip slightly wider than shoulders, squeeze shoulder blades together.', 'Lower the bar to mid-chest in 2–3 seconds, elbows ~45° from body.', 'Press up and slightly back until arms are straight.'],
      tip: 'Keep your hips on the bench and wrists stacked over elbows.', mistake: 'Bouncing the bar off the chest.' },
    incDb: { name: 'Incline Dumbbell Press', group: 'chest', muscle: 'Upper chest, front delts', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Set bench to 30°.', 'Start with dumbbells at chest level, palms forward.', 'Press up until arms are straight, dumbbells close but not touching.', 'Lower slowly until you feel a stretch in the chest.'],
      tip: 'A 30° incline hits the upper chest best; higher turns it into a shoulder press.', mistake: 'Flaring elbows to 90°.' },
    dbBench: { name: 'Flat Dumbbell Press', group: 'chest', muscle: 'Chest, triceps', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Lie flat with dumbbells at chest level.', 'Press up and slightly together.', 'Lower slowly for a deep chest stretch.', 'Keep shoulder blades pinched.'],
      tip: 'Dumbbells fix left-right strength imbalances.', mistake: 'Going too deep with shoulders rolling forward.' },
    fly: { name: 'Pec Deck / Cable Fly', group: 'chest', muscle: 'Chest', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Sit or stand with a slight bend in the elbows.', 'Bring hands together in a hugging motion.', 'Squeeze the chest for 1 second.', 'Open slowly to a comfortable stretch.'],
      tip: 'Elbow angle stays fixed throughout.', mistake: 'Turning it into a press.' },
    pushup: { name: 'Push-up', group: 'chest', muscle: 'Chest, triceps, core', kind: 'upper', bodyweight: true, tempo: [2, 0, 1],
      steps: ['Hands slightly wider than shoulders, body straight.', 'Lower chest to just above the floor.', 'Push the floor away to straight arms.', 'Keep glutes and abs tight.'],
      tip: 'Elevate hands on a bench if full push-ups are too hard.', mistake: 'Hips sagging.' },
    dips: { name: 'Bench or Parallel Dips', group: 'triceps', muscle: 'Triceps, chest', kind: 'upper', bodyweight: true, tempo: [2, 0, 1],
      steps: ['Hands on bars (or bench behind you).', 'Lower until elbows reach 90°.', 'Push back up to straight arms.', 'Lean slightly forward for more chest.'],
      tip: 'Use bench dips or the assisted machine if bar dips are too hard.', mistake: 'Going too deep and straining the shoulders.' },
    pushdown: { name: 'Cable Triceps Pushdown', group: 'triceps', muscle: 'Triceps', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Rope or bar attachment at the top of the cable.', 'Elbows pinned to your sides.', 'Push down until arms are straight, squeeze triceps.', 'Let it come back up to 90° slowly.'],
      tip: 'Only your forearms move.', mistake: 'Elbows drifting forward.' },
    ohTri: { name: 'Overhead Dumbbell Triceps Extension', group: 'triceps', muscle: 'Triceps (long head)', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Hold one dumbbell with both hands overhead.', 'Lower it behind your head by bending elbows.', 'Feel a deep stretch, then extend back up.', 'Keep elbows pointing forward.'],
      tip: 'Sit down for more stability.', mistake: 'Elbows flaring wide.' },
    skull: { name: 'EZ-bar Skull Crusher', group: 'triceps', muscle: 'Triceps', kind: 'upper', tempo: [3, 0, 1],
      steps: ['Lie flat, EZ bar over your chest with arms straight.', 'Bend only at the elbows to lower the bar toward your forehead.', 'Stop just above the head.', 'Extend back to straight arms.'],
      tip: 'Let the bar drift slightly behind the head for a bigger stretch.', mistake: 'Moving the upper arms.' },
    pulldown: { name: 'Lat Pulldown', group: 'back', muscle: 'Lats (back width), biceps', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Grip bar slightly wider than shoulders.', 'Lean back slightly, chest up.', 'Pull the bar to your upper chest, driving elbows down.', 'Let it rise slowly until arms are straight.'],
      tip: 'Think "elbows to back pockets".', mistake: 'Pulling behind the neck or swinging.' },
    bbRow: { name: 'Barbell Row', group: 'back', muscle: 'Mid back, lats, rear delts', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Hinge forward to ~45°, back flat, knees soft.', 'Grip just outside the knees.', 'Pull the bar to your lower ribs.', 'Lower with control, keep the back angle fixed.'],
      tip: 'Brace your core hard before each rep.', mistake: 'Rounding the lower back.' },
    cableRow: { name: 'Seated Cable Row', group: 'back', muscle: 'Mid back, lats', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Sit tall, feet on platform, slight knee bend.', 'Pull handle to your belly button.', 'Squeeze shoulder blades together for 1 second.', 'Reach forward slowly for a stretch.'],
      tip: 'Keep your chest up, do not rock back.', mistake: 'Using your lower back to pull.' },
    dbRow: { name: 'One-arm Dumbbell Row', group: 'back', muscle: 'Lats, mid back', kind: 'upper', tempo: [2, 1, 1],
      steps: ['One knee and hand on the bench, back flat.', 'Pull dumbbell to your hip.', 'Squeeze the back at the top.', 'Lower to a full stretch.'],
      tip: 'Pull with the elbow, not the hand.', mistake: 'Twisting the torso.' },
    pullup: { name: 'Pull-up / Assisted Pull-up', group: 'back', muscle: 'Lats, biceps', kind: 'upper', bodyweight: true, tempo: [3, 0, 1],
      steps: ['Hang with an overhand grip, shoulder-width.', 'Pull your chest toward the bar.', 'Chin clears the bar.', 'Lower to a full hang slowly.'],
      tip: 'Use the assisted machine or a band if you cannot do 5 reps yet. Log assistance as negative kg if you like.', mistake: 'Half reps and kicking.' },
    facePull: { name: 'Face Pull', group: 'shoulders', muscle: 'Rear delts, upper back (posture)', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Rope at upper chest height.', 'Pull towards your face, hands ending beside ears.', 'Rotate so knuckles face the ceiling.', 'Return slowly.'],
      tip: 'Light weight, slow reps. Good for shoulder health.', mistake: 'Going too heavy.' },
    deadlift: { name: 'Conventional Deadlift', group: 'back', muscle: 'Full posterior chain', kind: 'lower', tempo: [2, 0, 1],
      steps: ['Bar over mid-foot, feet hip-width.', 'Hinge down, grip just outside legs, shins touching bar.', 'Chest up, back flat, pull the slack out of the bar.', 'Push the floor away, stand tall, then lower the same path.'],
      tip: 'Start light and master the hinge.', mistake: 'Rounding the back or jerking the bar.' },
    ohpDb: { name: 'Seated Dumbbell Shoulder Press', group: 'shoulders', muscle: 'Shoulders, triceps', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Sit on a bench set upright, back supported.', 'Dumbbells at ear height, palms forward.', 'Press overhead until arms are nearly straight.', 'Lower under control to ear level.'],
      tip: 'Brace your core so your lower back does not arch.', mistake: 'Cutting the range short.' },
    ohp: { name: 'Standing Overhead Press', group: 'shoulders', muscle: 'Shoulders, triceps, core', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Bar on front of shoulders, grip just outside shoulders.', 'Squeeze glutes and brace.', 'Press straight up, moving your head back then through.', 'Lock out overhead, bar over mid-foot.'],
      tip: 'Tight glutes keep you upright.', mistake: 'Arching the lower back.' },
    lateral: { name: 'Dumbbell Lateral Raise', group: 'shoulders', muscle: 'Side delts (shoulder width)', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Stand tall, light dumbbells at your sides.', 'Slight bend in elbows, lean forward a little.', 'Raise arms out to the side to shoulder height.', 'Lower in 2–3 seconds.'],
      tip: 'Lead with your elbows.', mistake: 'Swinging heavy weights with the body.' },
    rearFly: { name: 'Rear Delt Fly', group: 'shoulders', muscle: 'Rear delts', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Bend forward with light dumbbells, or use the reverse pec deck.', 'Raise arms out to the sides.', 'Squeeze at shoulder height.', 'Lower slowly.'],
      tip: 'Rear delts make shoulders look round from the side.', mistake: 'Shrugging the traps.' },
    shrug: { name: 'Dumbbell Shrug', group: 'shoulders', muscle: 'Traps', kind: 'upper', tempo: [1, 1, 1],
      steps: ['Hold heavy dumbbells at your sides.', 'Lift shoulders straight up to your ears.', 'Hold 1 second.', 'Lower slowly.'],
      tip: 'Straight up and down, no rolling.', mistake: 'Bending the elbows.' },
    bbCurl: { name: 'Barbell Curl', group: 'biceps', muscle: 'Biceps', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Stand tall, shoulder-width grip, palms up.', 'Curl the bar up keeping elbows at your sides.', 'Squeeze at the top.', 'Lower in 2–3 seconds.'],
      tip: 'An EZ bar is easier on the wrists.', mistake: 'Swinging the hips.' },
    hammer: { name: 'Hammer Curl', group: 'biceps', muscle: 'Biceps, forearms', kind: 'upper', tempo: [2, 1, 1],
      steps: ['Dumbbells at sides, palms facing each other.', 'Curl up without rotating the wrist.', 'Pause at shoulder height.', 'Lower slowly.'],
      tip: 'Builds thicker-looking arms.', mistake: 'Moving the elbows forward.' },
    incCurl: { name: 'Incline Dumbbell Curl', group: 'biceps', muscle: 'Biceps (long head)', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Sit back on a 45° bench, arms hanging.', 'Curl up without moving the upper arm.', 'Squeeze at the top.', 'Lower to a full stretch.'],
      tip: 'Lighter than normal curls, focus on the stretch.', mistake: 'Shoulders rolling forward.' },
    preacher: { name: 'Preacher Curl', group: 'biceps', muscle: 'Biceps (short head)', kind: 'upper', tempo: [3, 1, 1],
      steps: ['Armpits snug on the pad, arms extended.', 'Curl the bar or dumbbell up.', 'Squeeze at the top.', 'Lower all the way under control.'],
      tip: 'Do not let the weight drop at the bottom.', mistake: 'Lifting the elbows off the pad.' },
    squat: { name: 'Barbell Back Squat', group: 'legs', muscle: 'Quads, glutes, core', kind: 'lower', tempo: [3, 1, 1],
      steps: ['Bar on upper back, feet shoulder-width, toes slightly out.', 'Breathe in and brace your core.', 'Sit down between your heels until thighs are at least parallel.', 'Drive up through the whole foot, knees tracking over toes.'],
      tip: 'Start with the empty bar and film your form from the side.', mistake: 'Knees caving inward.' },
    squatL: { name: 'Barbell Back Squat (lighter)', group: 'legs', muscle: 'Quads, glutes', kind: 'lower', tempo: [3, 1, 1],
      steps: ['Same setup as the heavy squat day.', 'Use about 80% of your Wednesday weight.', 'Focus on depth and a slow 3-second lowering.', 'Drive up strongly.'],
      tip: 'The second squat day builds skill and size.', mistake: 'Rushing reps.' },
    rdl: { name: 'Romanian Deadlift', group: 'legs', muscle: 'Hamstrings, glutes, lower back', kind: 'lower', tempo: [3, 1, 1],
      steps: ['Hold bar at hip height, knees slightly bent.', 'Push hips back, bar sliding down your thighs.', 'Stop when you feel a strong hamstring stretch (around mid-shin).', 'Squeeze glutes to stand up.'],
      tip: 'Back stays flat the entire time.', mistake: 'Turning it into a squat.' },
    legPress: { name: 'Leg Press', group: 'legs', muscle: 'Quads, glutes', kind: 'lower', tempo: [3, 0, 1],
      steps: ['Feet shoulder-width in the middle of the platform.', 'Lower until knees reach ~90°.', 'Press back up without locking the knees.', 'Keep your lower back flat on the pad.'],
      tip: 'Control the bottom, do not let the hips lift.', mistake: 'Locking knees at the top.' },
    legCurl: { name: 'Lying Leg Curl', group: 'legs', muscle: 'Hamstrings', kind: 'lower', tempo: [2, 1, 1],
      steps: ['Lie face down, pad just above heels.', 'Curl heels toward your glutes.', 'Squeeze for 1 second.', 'Lower slowly.'],
      tip: 'Keep hips pressed into the bench.', mistake: 'Lifting hips to cheat.' },
    legExt: { name: 'Leg Extension', group: 'legs', muscle: 'Quads', kind: 'lower', tempo: [2, 1, 1],
      steps: ['Pad on lower shins, back against the seat.', 'Straighten legs fully.', 'Squeeze quads for 1 second.', 'Lower slowly.'],
      tip: 'Point toes up for a stronger squeeze.', mistake: 'Swinging the weight.' },
    bss: { name: 'Bulgarian Split Squat', group: 'legs', muscle: 'Quads, glutes (each leg)', kind: 'lower', tempo: [3, 0, 1],
      steps: ['Back foot on a bench, front foot two steps ahead.', 'Lower straight down until back knee nearly touches the floor.', 'Drive up through the front heel.', 'Finish all reps, then switch legs.'],
      tip: 'Start with bodyweight, add dumbbells when stable.', mistake: 'Front knee caving in.' },
    calf: { name: 'Standing Calf Raise', group: 'legs', muscle: 'Calves', kind: 'lower', tempo: [2, 1, 1],
      steps: ['Balls of feet on a step or platform.', 'Lower heels for a full stretch.', 'Rise as high as possible.', 'Pause 1 second at top and bottom.'],
      tip: 'Full range beats heavy weight for calves.', mistake: 'Bouncing quickly.' },
    seatedCalf: { name: 'Seated Calf Raise', group: 'legs', muscle: 'Calves (soleus)', kind: 'lower', tempo: [2, 1, 1],
      steps: ['Pad on lower thighs, balls of feet on platform.', 'Lower heels for a stretch.', 'Rise up high.', 'Pause and repeat.'],
      tip: 'High reps, slow tempo.', mistake: 'Short bouncy reps.' },
    plank: { name: 'Plank', group: 'abs', muscle: 'Core', kind: 'core', timed: true, tempo: [0, 0, 0],
      steps: ['Forearms on the floor, elbows under shoulders.', 'Body in a straight line from head to heels.', 'Squeeze glutes and brace abs.', 'Breathe normally and hold.'],
      tip: 'The reps column is seconds held.', mistake: 'Hips sagging or piking up.' },
    hkr: { name: 'Hanging Knee Raise', group: 'abs', muscle: 'Abs', kind: 'core', bodyweight: true, tempo: [2, 0, 1],
      steps: ['Hang from a bar, shoulders engaged.', 'Raise knees toward your chest.', 'Curl your pelvis up at the top.', 'Lower slowly without swinging.'],
      tip: "Use the captain's chair if grip gives out.", mistake: 'Swinging for momentum.' },
    cableCrunch: { name: 'Cable Crunch', group: 'abs', muscle: 'Abs', kind: 'core', tempo: [2, 1, 1],
      steps: ['Kneel facing the cable, rope behind your head.', 'Crunch down by curling your ribs toward your hips.', 'Hold the squeeze for 1 second.', 'Return slowly.'],
      tip: 'Hips stay still; only the spine curls.', mistake: 'Pulling with the arms.' },
  };
  const GROUPS = { chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', legs: 'Legs', abs: 'Abs' };

  const ex = (id, sets, reps, rest) => ({ id, sets, reps, rest });

  /* Default split (editable in Fitness → Split). Legacy push/pull/legs days stay so old workout history still displays. */
  const DAYS = {
    chestTri: { name: 'Chest + Triceps', short: 'Chest', focus: 'Chest · Triceps', color: 'lime',
      list: [ex('bench', 4, '6-8', 120), ex('incDb', 3, '8-10', 90), ex('fly', 3, '12-15', 60), ex('dips', 3, '6-12', 90), ex('pushdown', 3, '10-12', 60), ex('ohTri', 3, '10-12', 60)] },
    backBi: { name: 'Back + Biceps', short: 'Back', focus: 'Back · Rear delts · Biceps', color: 'sky',
      list: [ex('pulldown', 4, '8-10', 90), ex('bbRow', 4, '6-8', 120), ex('cableRow', 3, '10-12', 90), ex('facePull', 3, '12-15', 60), ex('bbCurl', 3, '8-10', 60), ex('hammer', 3, '10-12', 60)] },
    legsAbs: { name: 'Legs + Abs', short: 'Legs', focus: 'Quads · Hamstrings · Calves · Abs', color: 'mint',
      list: [ex('squat', 4, '6-8', 150), ex('rdl', 3, '8-10', 120), ex('legPress', 3, '10-12', 90), ex('legCurl', 3, '10-12', 60), ex('calf', 4, '12-15', 60), ex('hkr', 3, '10-15', 60), ex('plank', 3, '30-45', 45)] },
    upper: { name: 'Chest + Back + Shoulders', short: 'Upper', focus: 'Chest · Back · Shoulders', color: 'lime',
      list: [ex('dbBench', 3, '8-10', 90), ex('pullup', 3, '5-10', 120), ex('ohpDb', 3, '8-10', 90), ex('dbRow', 3, '8-10', 90), ex('lateral', 4, '12-15', 60), ex('rearFly', 3, '12-15', 60)] },
    legsArms: { name: 'Legs + Arms', short: 'Legs', focus: 'Quads · Glutes · Biceps · Triceps', color: 'sky',
      list: [ex('squatL', 3, '8-10', 120), ex('bss', 3, '8-10', 90), ex('legExt', 3, '12-15', 60), ex('seatedCalf', 4, '15-20', 45), ex('incCurl', 3, '10-12', 60), ex('skull', 3, '10-12', 60), ex('preacher', 2, '10-12', 60)] },
    rest: { name: 'Rest & Recover', short: 'Rest', focus: 'Walk · Stretch · Sleep', color: 'mint', list: [] },
    // legacy (v1) days, kept for history
    pushA: { legacy: true, name: 'Push A', short: 'Push', focus: 'Chest · Shoulders · Triceps', color: 'lime', list: [ex('bench', 4, '6-8', 120), ex('incDb', 3, '8-10', 90), ex('ohpDb', 3, '8-10', 90), ex('lateral', 3, '12-15', 60), ex('pushdown', 3, '10-12', 60), ex('ohTri', 2, '10-12', 60)] },
    pullA: { legacy: true, name: 'Pull A', short: 'Pull', focus: 'Back · Biceps', color: 'sky', list: [ex('pulldown', 4, '8-10', 90), ex('bbRow', 4, '6-8', 120), ex('cableRow', 3, '10-12', 90), ex('facePull', 3, '12-15', 60), ex('bbCurl', 3, '8-10', 60), ex('hammer', 3, '10-12', 60)] },
    legsA: { legacy: true, name: 'Legs A', short: 'Legs', focus: 'Legs · Core', color: 'mint', list: [ex('squat', 4, '6-8', 150), ex('rdl', 3, '8-10', 120), ex('legPress', 3, '10-12', 90), ex('legCurl', 3, '10-12', 60), ex('calf', 4, '12-15', 60), ex('plank', 3, '30-45', 45)] },
    pushB: { legacy: true, name: 'Push B', short: 'Push', focus: 'Shoulders · Chest · Triceps', color: 'lime', list: [ex('ohp', 4, '6-8', 120), ex('dbBench', 3, '8-10', 90), ex('fly', 3, '12-15', 60), ex('lateral', 4, '12-15', 60), ex('dips', 3, '6-12', 90), ex('pushdown', 3, '12-15', 60)] },
    pullB: { legacy: true, name: 'Pull B', short: 'Pull', focus: 'Back · Traps · Biceps', color: 'sky', list: [ex('deadlift', 3, '5', 180), ex('pullup', 3, '5-10', 120), ex('dbRow', 3, '8-10', 90), ex('rearFly', 3, '12-15', 60), ex('incCurl', 3, '10-12', 60), ex('shrug', 3, '12-15', 60)] },
    legsB: { legacy: true, name: 'Legs B', short: 'Legs', focus: 'Quads · Glutes · Abs', color: 'mint', list: [ex('squatL', 3, '8-10', 120), ex('bss', 3, '8-10', 90), ex('legExt', 3, '12-15', 60), ex('legCurl', 3, '12-15', 60), ex('seatedCalf', 4, '15-20', 45), ex('hkr', 3, '10-15', 60)] },
  };
  // index = JS getDay() (0 = Sunday)
  const DEFAULT_SPLIT = ['rest', 'chestTri', 'backBi', 'legsAbs', 'rest', 'upper', 'legsArms'];

  App.split = () => (App.state.gym.split && App.state.gym.split.length === 7 ? App.state.gym.split : DEFAULT_SPLIT);
  App.exDef = (id) => EX[id] || (App.state.gym.customEx || {})[id] || { name: id, group: 'abs', muscle: '', kind: 'upper', steps: [], tip: '', mistake: '' };
  App.dayDef = (key) => {
    const base = DAYS[key] || DAYS.rest;
    const ov = (App.state.gym.days || {})[key];
    return ov && Array.isArray(ov.list) ? { ...base, list: ov.list } : base;
  };

  const WARMUP = ['5 min brisk walk or cycle', '10 arm circles each way', '10 bodyweight squats', '1–2 light warm-up sets of your first exercise'];
  const REST_DAY = [
    { t: '30–40 min walk', d: 'Keeps you active without hurting recovery.' },
    { t: '10 min full-body stretch', d: 'Hips, hamstrings, chest and shoulders.' },
    { t: 'Eat your full calories', d: 'Muscle grows on rest days. Do not skip meals.' },
    { t: 'Sleep 7–9 hours', d: 'Most recovery happens during sleep.' },
    { t: 'Meal-prep for the week', d: 'Boil eggs, soak chana, portion peanuts.' },
  ];
  const COACH_TIPS = [
    'Aim to gain 0.25–0.5 kg per week. Faster than that is mostly fat.',
    'Add reps first, then weight. LifeOS only suggests more weight after every set hits the top of the rep range.',
    'Drink water through the day; more on hot Haryana afternoons.',
    'Sleep 7–9 hours. Training breaks muscle down, sleep rebuilds it.',
    'Hit your protein most days. It matters more than any supplement.',
    'Weigh yourself in the morning 3–4 times a week; LifeOS uses weekly averages so daily swings do not mislead you.',
    'Missed a day? Do not double up. Continue with the next session.',
    'Eat a carb + protein meal 1–2 hours before training if you train after work.',
  ];

  /* ---------- US CMA (IMA content specification; content unchanged for 2026) ---------- */
  const CMA = {
    p1: { name: 'Part 1', title: 'Financial Planning, Performance & Analytics', sections: [
      { id: 'p1a', code: 'A', name: 'External Financial Reporting Decisions', weight: 15, topics: ['Financial statements', 'Asset recognition & valuation', 'Liabilities valuation', 'Equity transactions', 'Revenue recognition', 'Income measurement', 'Major US GAAP vs IFRS differences'] },
      { id: 'p1b', code: 'B', name: 'Planning, Budgeting & Forecasting', weight: 20, topics: ['Strategic planning', 'Budgeting concepts', 'Forecasting techniques', 'Budget methodologies', 'Annual profit plan & schedules', 'Top-level planning & analysis'] },
      { id: 'p1c', code: 'C', name: 'Performance Management', weight: 20, topics: ['Cost & variance measures', 'Responsibility centres & reporting segments', 'Performance measures'] },
      { id: 'p1d', code: 'D', name: 'Cost Management', weight: 15, topics: ['Measurement concepts', 'Costing systems', 'Overhead costs', 'Supply chain management', 'Business process improvement'] },
      { id: 'p1e', code: 'E', name: 'Internal Controls', weight: 15, topics: ['Governance, risk & compliance', 'Systems controls & security measures'] },
      { id: 'p1f', code: 'F', name: 'Technology & Analytics', weight: 15, topics: ['Information systems', 'Data governance', 'Technology-enabled finance transformation', 'Data analytics'] },
    ] },
    p2: { name: 'Part 2', title: 'Strategic Financial Management', sections: [
      { id: 'p2a', code: 'A', name: 'Financial Statement Analysis', weight: 20, topics: ['Basic financial statement analysis', 'Financial ratios', 'Profitability analysis', 'Special issues'] },
      { id: 'p2b', code: 'B', name: 'Corporate Finance', weight: 20, topics: ['Risk & return', 'Long-term financial management', 'Raising capital', 'Working capital management', 'Corporate restructuring', 'International financial management'] },
      { id: 'p2c', code: 'C', name: 'Decision Analysis', weight: 25, topics: ['Cost/volume/profit analysis', 'Marginal analysis', 'Pricing'] },
      { id: 'p2d', code: 'D', name: 'Risk Management', weight: 10, topics: ['Enterprise risk'] },
      { id: 'p2e', code: 'E', name: 'Investment Decisions', weight: 10, topics: ['Capital budgeting process', 'Capital investment analysis methods'] },
      { id: 'p2f', code: 'F', name: 'Professional Ethics', weight: 15, topics: ['Business ethics', 'Ethics for the management accountant', 'Ethics for the organisation'] },
    ] },
  };
  App.cmaBacklogDefaults = () => [];
  const STUDY_TYPES = [
    { value: 'study', label: 'Study' }, { value: 'mcq', label: 'MCQ practice' }, { value: 'hock', label: 'Hock session' },
    { value: 'revision', label: 'Revision' }, { value: 'mock', label: 'Mock test' }, { value: 'backlog', label: 'Backlog subject' },
  ];

  /* ---------- career ---------- */
  const skill = (id, name, milestones, resources, projects) => ({
    id, name, milestones: milestones.map((t, i) => ({ id: id + i, title: t, done: false })),
    resources: resources.map((t) => ({ id: App.uid(), title: t, url: '' })), projects: projects.map((t) => ({ id: App.uid(), title: t, done: false })),
  });
  App.careerDefaults = () => ({
    skills: [
      skill('excel', 'Advanced Excel', ['XLOOKUP, INDEX-MATCH, SUMIFS', 'Pivot tables & pivot charts', 'Power Query: clean and combine files', 'Dynamic arrays (FILTER, UNIQUE, LET)', 'Build an interactive dashboard'], ['Microsoft Support: Excel functions', 'ExcelJet formula guides', 'Leila Gharani (YouTube)'], ['Vendor reconciliation template', 'Monthly expense dashboard']),
      skill('sql', 'SQL', ['SELECT, WHERE, ORDER BY', 'GROUP BY & aggregates', 'JOINs', 'Window functions', 'CTEs & subqueries'], ['SQLBolt', 'Mode SQL tutorial', 'LeetCode SQL 50'], ['Analyse a sample GL dataset', 'AP ageing query']),
      skill('pbi', 'Power BI', ['Import & model data', 'DAX basics (CALCULATE, measures)', 'Time intelligence', 'Publish a report'], ['Microsoft Learn: Power BI', 'Guy in a Cube (YouTube)'], ['P&L dashboard', 'Budget vs actual report']),
      skill('python', 'Python', ['Syntax, lists, dicts, loops', 'pandas: read, clean, group', 'openpyxl: automate Excel', 'Charts with matplotlib'], ['Kaggle Learn: Python & pandas', 'Automate the Boring Stuff'], ['Bank statement categoriser', '1099 vendor check script']),
      skill('model', 'Financial Modeling', ['3-statement model', 'Revenue & cost drivers', 'DCF valuation', 'Scenario & sensitivity analysis'], ['CFI free courses', 'Wall Street Prep (blog)'], ['3-statement model of a listed company']),
      skill('analysis', 'Financial Analysis', ['Ratio analysis', 'Variance analysis', 'Cash-flow analysis', 'Write an analysis memo'], ['Annual reports of NSE companies', 'CMA Part 2 Section A'], ['Peer comparison of two companies']),
      skill('cma', 'US CMA', ['Part 1 preparation', 'Part 1 passed', 'Part 2 preparation', 'Part 2 passed', 'Experience requirement met'], ['IMA CMA handbook', 'Hock / Gleim review'], []),
      skill('fpa', 'FP&A', ['Budgeting process', 'Rolling forecasts', 'Driver-based planning', 'Management reporting pack'], ['FP&A Trends articles', 'AFP FP&A guide'], ['Rolling 12-month forecast model']),
      skill('auto', 'Financial Automation', ['Excel macros / VBA basics', 'Power Query refresh workflows', 'Python + Excel automation', 'QuickBooks reports export & automation'], ['Microsoft Learn: Power Automate'], ['Automate monthly reimbursement report']),
    ],
    portfolio: [],
    timeline: [
      { id: 't1', title: 'Accounts & Finance professional', note: 'Current role', date: '', done: true },
      { id: 't2', title: 'Pass CMA Part 1', note: '', date: '', done: false },
      { id: 't3', title: 'Pass CMA Part 2', note: '', date: '', done: false },
      { id: 't4', title: 'Portfolio of 5 finance projects', note: 'Excel, Power BI, SQL, Python', date: '', done: false },
      { id: 't5', title: 'Finance Analyst role', note: '', date: '', done: false },
      { id: 't6', title: 'FP&A Analyst', note: 'Target role', date: '', done: false },
    ],
  });

  /* ---------- Dubai Mission ---------- */
  // Amounts start empty on purpose: every figure must be researched and confirmed by you.
  App.dubaiDefaults = () => ({
    targetDate: '', confirmedDate: '', travelConfirmed: false, startSavings: 0, deposits: [], includeEmployment: false, notes: '',
    costs: [
      { id: 'doc', group: 'personal', label: 'Passport & documentation', amount: null, verified: false, note: 'Passport renewal, attestation of degree certificates' },
      { id: 'flight', group: 'personal', label: 'Flight tickets', amount: null, verified: false, note: 'One-way DEL → DXB' },
      { id: 'tempstay', group: 'personal', label: 'Temporary accommodation', amount: null, verified: false, note: 'First 2–4 weeks' },
      { id: 'deposit', group: 'personal', label: 'Accommodation deposit', amount: null, verified: false, note: 'Rent advance + security deposit' },
      { id: 'food', group: 'personal', label: 'Food (first 2–3 months)', amount: null, verified: false, note: '' },
      { id: 'transport', group: 'personal', label: 'Local transportation', amount: null, verified: false, note: 'Metro / Nol card, taxis' },
      { id: 'medical', group: 'personal', label: 'Medical insurance', amount: null, verified: false, note: 'Check if the employer provides it' },
      { id: 'emergency', group: 'personal', label: 'Emergency fund', amount: null, verified: false, note: '' },
      { id: 'other', group: 'personal', label: 'Other relocation costs', amount: null, verified: false, note: 'SIM, furniture, misc.' },
      { id: 'visa', group: 'employment', label: 'Visa & employment-related expenses', amount: null, verified: false, note: 'Often employer-paid. Verify with the employer and official UAE sources.' },
      { id: 'medtest', group: 'employment', label: 'Visa medical test & Emirates ID', amount: null, verified: false, note: 'Verify current official fees' },
    ],
    checklist: [
      'Complete US CMA', 'Improve financial analysis skills', 'Build professional portfolio', 'Prepare international CV', 'Improve interview skills',
      'Research Dubai finance jobs', 'Research salary expectations', 'Research employers', 'Apply for suitable positions',
      'Secure a legitimate employment opportunity', 'Verify visa and relocation requirements',
    ].map((t, i) => ({ id: 'c' + i, title: t, done: false, doneAt: '', note: '' })),
  });

  /* ---------- Work OS ---------- */
  const WORK_AREAS = [
    { id: 'general', label: 'General', e: '🗂️' },
    { id: 'reimb', label: 'Reimbursements', e: '🧾' },
    { id: 'vendor', label: 'Vendor reconciliation', e: '🤝' },
    { id: 'bank', label: 'Bank statements', e: '🏦' },
    { id: 'payroll', label: 'Payroll', e: '💵' },
    { id: 'tax', label: 'Taxation', e: '📑' },
    { id: 'w9', label: 'W-9 / W-8', e: '📄' },
    { id: 'f1099', label: '1099 verification', e: '✅' },
    { id: 'qb', label: 'QuickBooks', e: '📗' },
    { id: 'excel', label: 'Excel automation', e: '📊' },
    { id: 'project', label: 'Project accounting', e: '🏗️' },
    { id: 'timesheet', label: 'Timesheets', e: '⏱️' },
  ];

  Object.assign(App, {
    ACTIVITY, GOAL_MODES, targets, LEGACY_PLAN, EX, GROUPS, DAYS, DEFAULT_SPLIT, WARMUP, REST_DAY, COACH_TIPS,
    CMA, STUDY_TYPES, WORK_AREAS,
  });
})();
