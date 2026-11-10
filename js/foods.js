'use strict';
/* Offline Indian food library.
   Values are approximate reference values PER 100 g of food as eaten (cooked dishes include typical home oil),
   compiled from IFCT 2017 / USDA FoodData Central style references and common Indian recipes.
   Every value can be edited in the app (Food Library → food → Edit values). Fibre may be approximate.
   Prices are rough North-India retail estimates (₹) and are editable in Nutrition → Grocery prices. */
(function () {
  const CATS = [
    { id: 'breakfast', label: 'Breakfast', e: '🥣' },
    { id: 'meals', label: 'Indian meals', e: '🍛' },
    { id: 'fruits', label: 'Fruits', e: '🍎' },
    { id: 'dairy', label: 'Dairy', e: '🥛' },
    { id: 'gain', label: 'Weight gain', e: '💪' },
    { id: 'snacks', label: 'Snacks & drinks', e: '🍿' },
    { id: 'nonveg', label: 'Eggs & non-veg', e: '🍗' },
    { id: 'custom', label: 'My foods', e: '✏️' },
    { id: 'recipes', label: 'Recipes', e: '📒' },
  ];

  // Grocery items: price per kg / litre, or per piece (pcg = grams per piece)
  const GROCERY = {
    atta: { name: 'Wheat atta', unit: 'kg', price: 45 }, rice: { name: 'Rice', unit: 'kg', price: 60 },
    toor: { name: 'Toor dal', unit: 'kg', price: 160 }, moong: { name: 'Moong dal', unit: 'kg', price: 130 },
    masoor: { name: 'Masoor dal', unit: 'kg', price: 110 }, urad: { name: 'Urad dal (whole)', unit: 'kg', price: 140 },
    chanadal: { name: 'Chana dal', unit: 'kg', price: 110 }, rajma: { name: 'Rajma', unit: 'kg', price: 160 },
    chana: { name: 'Kabuli chana', unit: 'kg', price: 140 }, besan: { name: 'Besan', unit: 'kg', price: 110 },
    poha: { name: 'Poha', unit: 'kg', price: 70 }, suji: { name: 'Suji', unit: 'kg', price: 50 },
    daliya: { name: 'Daliya', unit: 'kg', price: 55 }, oats: { name: 'Rolled oats', unit: 'kg', price: 190 },
    soya: { name: 'Soya chunks', unit: 'kg', price: 200 }, soybean: { name: 'Soybean', unit: 'kg', price: 110 },
    milkT: { name: 'Toned milk', unit: 'L', price: 58 }, milkF: { name: 'Full cream milk', unit: 'L', price: 70 },
    milkDT: { name: 'Double toned milk', unit: 'L', price: 52 }, curd: { name: 'Curd', unit: 'kg', price: 100 },
    paneer: { name: 'Paneer', unit: 'kg', price: 420 }, butter: { name: 'Butter', unit: 'kg', price: 560 },
    ghee: { name: 'Ghee', unit: 'kg', price: 650 }, cheese: { name: 'Cheese slices', unit: 'kg', price: 600 },
    greek: { name: 'Greek yogurt', unit: 'kg', price: 350 }, whey: { name: 'Whey protein', unit: 'kg', price: 2500 },
    eggs: { name: 'Eggs', unit: 'pc', price: 7, pcg: 50 }, chicken: { name: 'Chicken', unit: 'kg', price: 240 }, fish: { name: 'Fish', unit: 'kg', price: 300 },
    banana: { name: 'Bananas', unit: 'pc', price: 5, pcg: 118 }, apple: { name: 'Apples', unit: 'kg', price: 160 },
    mango: { name: 'Mangoes', unit: 'kg', price: 100 }, orange: { name: 'Oranges', unit: 'kg', price: 80 },
    papaya: { name: 'Papaya', unit: 'kg', price: 50 }, guava: { name: 'Guava', unit: 'kg', price: 70 }, grapes: { name: 'Grapes', unit: 'kg', price: 100 },
    fruit: { name: 'Other fruit', unit: 'kg', price: 90 },
    peanuts: { name: 'Peanuts', unit: 'kg', price: 150 }, pb: { name: 'Peanut butter', unit: 'kg', price: 350 },
    almonds: { name: 'Almonds', unit: 'kg', price: 900 }, cashews: { name: 'Cashews', unit: 'kg', price: 950 },
    raisins: { name: 'Raisins', unit: 'kg', price: 350 }, dates: { name: 'Dates', unit: 'kg', price: 300 },
    honey: { name: 'Honey', unit: 'kg', price: 400 }, rchana: { name: 'Roasted chana', unit: 'kg', price: 140 },
    makhana: { name: 'Makhana', unit: 'kg', price: 1000 }, sattu: { name: 'Sattu', unit: 'kg', price: 120 },
    veg: { name: 'Vegetables', unit: 'kg', price: 50 }, potato: { name: 'Potatoes', unit: 'kg', price: 30 },
    oil: { name: 'Cooking oil', unit: 'L', price: 160 }, sugar: { name: 'Sugar', unit: 'kg', price: 45 },
    bread: { name: 'Bread', unit: 'kg', price: 115 }, cereal: { name: 'Breakfast cereal', unit: 'kg', price: 300 },
  };

  // [id, name, cats, emoji, kcal, protein, carbs, fat, fibre, units, defaultUnit, defaultQty, grocery]
  // units: "unit:grams,…"  (g is always available; "ml:1" marks liquids, density ≈ 1 g/ml)
  const R = [
    // Breakfast
    ['poha', 'Poha (kanda poha)', 'breakfast', '🥣', 180, 3.5, 28, 6, 1.5, 'plate:150,bowl:150', 'plate', 1, 'poha:.35,oil:.04,peanuts:.03'],
    ['upma', 'Upma', 'breakfast', '🥣', 150, 3.5, 22, 5.5, 1.5, 'plate:150,bowl:150', 'plate', 1, 'suji:.3,oil:.04,veg:.15'],
    ['daliyaVeg', 'Daliya (vegetable)', 'breakfast', '🥣', 95, 3.2, 17, 1.8, 2.5, 'bowl:200', 'bowl', 1, 'daliya:.22,veg:.15,oil:.01'],
    ['daliyaMilk', 'Daliya (milk, sweet)', 'breakfast', '🥣', 115, 4.2, 18, 3, 1.8, 'bowl:200', 'bowl', 1, 'daliya:.15,milkT:.6,sugar:.03'],
    ['oatsMilk', 'Oats with toned milk', 'breakfast', '🥣', 110, 4.8, 15.5, 3.3, 1.5, 'bowl:250', 'bowl', 1, 'oats:.2,milkT:.8'],
    ['oatsWater', 'Oats (cooked in water)', 'breakfast', '🥣', 71, 2.5, 12, 1.5, 1.7, 'bowl:250', 'bowl', 1, 'oats:.2'],
    ['oats', 'Rolled oats (dry)', 'breakfast,gain', '🌾', 379, 13.2, 67.7, 6.5, 10.1, 'cup:80,tbsp:10,serving:40', 'g', 50, 'oats:1'],
    ['alooParatha', 'Aloo paratha', 'breakfast', '🫓', 260, 5.5, 35, 11, 3, 'piece:110', 'piece', 1, 'atta:.4,potato:.4,oil:.06'],
    ['paratha', 'Plain paratha', 'breakfast', '🫓', 300, 7, 42, 12, 4, 'piece:60', 'piece', 1, 'atta:.6,oil:.1'],
    ['paneerParatha', 'Paneer paratha', 'breakfast', '🫓', 280, 9.5, 30, 13.5, 3, 'piece:120', 'piece', 1, 'atta:.4,paneer:.25,oil:.06'],
    ['idli', 'Idli', 'breakfast', '⚪', 135, 4.5, 28, 0.4, 1.2, 'piece:40', 'piece', 3, 'rice:.25,urad:.08'],
    ['dosa', 'Plain dosa', 'breakfast', '🌯', 165, 3.9, 27, 4.5, 1, 'piece:85', 'piece', 1, 'rice:.25,urad:.07,oil:.04'],
    ['masalaDosa', 'Masala dosa', 'breakfast', '🌯', 190, 4, 28, 7, 2, 'piece:180', 'piece', 1, 'rice:.16,urad:.04,potato:.3,oil:.05'],
    ['sambar', 'Sambar', 'breakfast,meals', '🍲', 65, 3, 9, 2, 2, 'bowl:150', 'bowl', 1, 'toor:.08,veg:.3'],
    ['chutney', 'Coconut chutney', 'breakfast', '🥥', 220, 2.5, 8, 20, 4.5, 'tbsp:15,serving:30', 'serving', 1, 'veg:.5'],
    ['besanChilla', 'Besan chilla', 'breakfast', '🥞', 200, 9, 22, 8, 4, 'piece:70', 'piece', 2, 'besan:.4,oil:.05,veg:.2'],
    ['breadWhite', 'White bread', 'breakfast', '🍞', 265, 9, 49, 3.2, 2.7, 'slice:25', 'slice', 2, 'bread:1'],
    ['breadBrown', 'Brown bread', 'breakfast', '🍞', 250, 10, 43, 4, 6, 'slice:27', 'slice', 2, 'bread:1'],
    ['cornflakes', 'Cornflakes', 'breakfast', '🥣', 357, 7.5, 84, 0.4, 3.3, 'bowl:30', 'bowl', 1, 'cereal:1'],
    ['muesli', 'Muesli', 'breakfast', '🥣', 370, 10, 66, 7, 8, 'bowl:50', 'bowl', 1, 'cereal:1'],
    ['sprouts', 'Moong sprouts', 'breakfast,snacks', '🌱', 30, 3, 5.9, 0.2, 1.8, 'bowl:100', 'bowl', 1, 'moong:.4'],
    ['chai', 'Chai (milk + sugar)', 'breakfast,snacks', '☕', 57, 1.7, 8, 1.9, 0, 'cup:150,ml:1', 'cup', 1, 'milkT:.5,sugar:.05'],
    ['coffee', 'Milk coffee', 'breakfast,snacks', '☕', 60, 2.5, 8, 2, 0, 'cup:150,ml:1', 'cup', 1, 'milkT:.7,sugar:.05'],
    // Eggs & non-veg
    ['egg', 'Egg (boiled)', 'breakfast,nonveg', '🥚', 155, 12.6, 1.1, 10.6, 0, 'piece:50', 'piece', 2, 'eggs:1'],
    ['eggWhite', 'Egg white', 'nonveg', '🥚', 52, 10.9, 0.7, 0.2, 0, 'piece:33', 'piece', 3, 'eggs:1.5'],
    ['omelette', 'Omelette (2 eggs)', 'breakfast,nonveg', '🍳', 185, 11, 1.5, 14.5, 0.3, 'piece:120', 'piece', 1, 'eggs:.83,oil:.04,veg:.1'],
    ['eggBhurji', 'Egg bhurji', 'nonveg', '🍳', 175, 11, 3, 13, 0.5, 'plate:130', 'plate', 1, 'eggs:.75,oil:.05,veg:.15'],
    ['eggCurry', 'Egg curry (2 eggs)', 'nonveg', '🍛', 145, 8, 5, 10.5, 1, 'bowl:200', 'bowl', 1, 'eggs:.5,oil:.05,veg:.2'],
    ['chickenCurry', 'Chicken curry', 'nonveg', '🍗', 165, 14, 4, 10.5, 1, 'bowl:150', 'bowl', 1, 'chicken:.55,oil:.05,veg:.15'],
    ['chickenBreast', 'Chicken breast (cooked)', 'nonveg', '🍗', 165, 31, 0, 3.6, 0, 'serving:100', 'g', 100, 'chicken:1.3'],
    ['fishCurry', 'Fish curry', 'nonveg', '🐟', 120, 13, 4, 6, 0.5, 'bowl:150', 'bowl', 1, 'fish:.6,oil:.04'],
    ['chickenBiryani', 'Chicken biryani', 'nonveg', '🍛', 180, 9, 21, 6.5, 1, 'plate:300', 'plate', 1, 'rice:.25,chicken:.25,oil:.04'],
    // Indian meals
    ['roti', 'Roti (phulka)', 'meals', '🫓', 280, 8.5, 51, 4, 7.5, 'piece:40', 'piece', 2, 'atta:.78'],
    ['chapatiGhee', 'Chapati with ghee', 'meals', '🫓', 330, 8.3, 49, 11, 7, 'piece:45', 'piece', 2, 'atta:.7,ghee:.06'],
    ['tandoori', 'Tandoori roti', 'meals', '🫓', 290, 9, 55, 2.5, 5, 'piece:60', 'piece', 1, 'atta:.75'],
    ['missi', 'Missi roti', 'meals', '🫓', 300, 11, 45, 8, 6, 'piece:60', 'piece', 1, 'atta:.4,besan:.3,oil:.04'],
    ['rice', 'Rice (cooked)', 'meals', '🍚', 130, 2.7, 28.2, 0.3, 0.4, 'bowl:150,cup:160', 'g', 150, 'rice:.4'],
    ['brownRice', 'Brown rice (cooked)', 'meals', '🍚', 123, 2.7, 25.6, 1, 1.6, 'bowl:150,cup:160', 'g', 150, 'rice:.4'],
    ['jeeraRice', 'Jeera rice', 'meals', '🍚', 160, 3, 28, 4, 0.6, 'bowl:150', 'bowl', 1, 'rice:.4,oil:.03'],
    ['dal', 'Dal tadka (toor)', 'meals', '🍲', 116, 6.2, 15.5, 3.4, 3, 'bowl:150,cup:200', 'g', 150, 'toor:.27,oil:.025'],
    ['moongDal', 'Moong dal', 'meals', '🍲', 105, 6.5, 14, 2.6, 2.5, 'bowl:150', 'bowl', 1, 'moong:.27,oil:.02'],
    ['masoorDal', 'Masoor dal', 'meals', '🍲', 112, 7, 15, 3, 3.2, 'bowl:150', 'bowl', 1, 'masoor:.27,oil:.02'],
    ['chanaDal', 'Chana dal', 'meals', '🍲', 125, 7, 17, 3.5, 4, 'bowl:150', 'bowl', 1, 'chanadal:.27,oil:.025'],
    ['dalMakhani', 'Dal makhani', 'meals', '🍲', 150, 6, 14, 8, 4, 'bowl:150', 'bowl', 1, 'urad:.2,butter:.03'],
    ['rajma', 'Rajma curry', 'meals', '🫘', 120, 5.5, 15, 4, 4.5, 'bowl:150', 'bowl', 1, 'rajma:.25,oil:.03,veg:.15'],
    ['chole', 'Chole curry', 'meals', '🫘', 150, 6.5, 19, 5.5, 5.5, 'bowl:150', 'bowl', 1, 'chana:.28,oil:.035,veg:.15'],
    ['kadhi', 'Kadhi pakora', 'meals', '🍛', 95, 3.2, 7.5, 5.8, 1, 'bowl:150', 'bowl', 1, 'curd:.45,besan:.06,oil:.03'],
    ['paneer', 'Paneer', 'meals,dairy,gain', '🧀', 265, 18.3, 1.2, 20.8, 0, 'cube:25,serving:50', 'g', 100, 'paneer:1'],
    ['paneerButter', 'Paneer butter masala', 'meals', '🍛', 200, 7, 7, 16, 1.5, 'bowl:150', 'bowl', 1, 'paneer:.3,butter:.03,veg:.2'],
    ['palakPaneer', 'Palak paneer', 'meals', '🥬', 145, 7, 6, 10.5, 2.2, 'bowl:150', 'bowl', 1, 'paneer:.25,veg:.5,oil:.03'],
    ['matarPaneer', 'Matar paneer', 'meals', '🍛', 150, 7, 9, 10, 2.5, 'bowl:150', 'bowl', 1, 'paneer:.25,veg:.3,oil:.03'],
    ['paneerBhurji', 'Paneer bhurji', 'meals', '🧀', 220, 13, 5, 16.5, 1, 'plate:120', 'plate', 1, 'paneer:.55,oil:.04,veg:.2'],
    ['mixVeg', 'Mixed vegetable sabzi', 'meals', '🥗', 85, 2.3, 9, 4.5, 3, 'bowl:150', 'bowl', 1, 'veg:.9,oil:.04'],
    ['alooSabzi', 'Aloo sabzi', 'meals', '🥔', 115, 2, 15, 5.5, 2, 'bowl:150', 'bowl', 1, 'potato:.85,oil:.05'],
    ['alooGobi', 'Aloo gobi', 'meals', '🥦', 90, 2.2, 10.5, 4.7, 2.8, 'bowl:150', 'bowl', 1, 'veg:.5,potato:.4,oil:.04'],
    ['bhindi', 'Bhindi sabzi', 'meals', '🥒', 95, 2.2, 8, 6.2, 3.5, 'bowl:120', 'bowl', 1, 'veg:.9,oil:.06'],
    ['lauki', 'Lauki sabzi', 'meals', '🥒', 55, 1.1, 6, 3, 2, 'bowl:150', 'bowl', 1, 'veg:.95,oil:.03'],
    ['baingan', 'Baingan bharta', 'meals', '🍆', 85, 2, 8, 5.5, 3.5, 'bowl:150', 'bowl', 1, 'veg:.9,oil:.05'],
    ['palak', 'Palak sabzi', 'meals', '🥬', 70, 3, 5, 4.5, 2.5, 'bowl:150', 'bowl', 1, 'veg:.95,oil:.04'],
    ['soybeanCurry', 'Soybean curry', 'meals', '🫘', 150, 11, 9, 8, 5, 'bowl:150', 'bowl', 1, 'soybean:.3,oil:.04,veg:.15'],
    ['soyaDry', 'Soya chunks (dry)', 'meals,gain', '🟤', 345, 52, 33, 0.5, 13, 'cup:50,serving:50', 'g', 50, 'soya:1'],
    ['soyaCurry', 'Soya chunk curry', 'meals', '🍛', 120, 13, 8, 4, 3, 'bowl:150', 'bowl', 1, 'soya:.23,oil:.03,veg:.2'],
    ['khichdi', 'Moong dal khichdi', 'meals', '🍲', 120, 4.5, 20, 2.5, 1.8, 'bowl:200', 'bowl', 1, 'rice:.2,moong:.1,ghee:.01'],
    ['curd', 'Curd (dahi)', 'meals,dairy', '🥛', 61, 3.5, 4.7, 3.3, 0, 'bowl:150,cup:245,tbsp:15', 'g', 100, 'curd:1'],
    ['raita', 'Raita', 'meals,dairy', '🥛', 70, 3, 6, 3.5, 0.5, 'bowl:150', 'bowl', 1, 'curd:.8,veg:.15'],
    ['salad', 'Green salad', 'meals', '🥗', 20, 0.9, 4, 0.2, 1.3, 'plate:100', 'plate', 1, 'veg:1'],
    ['papad', 'Papad (roasted)', 'meals,snacks', '🟡', 371, 25.6, 59.9, 3.3, 10, 'piece:12', 'piece', 1, 'urad:1'],
    ['vegBiryani', 'Veg biryani', 'meals', '🍛', 160, 3.5, 24, 5.5, 1.5, 'plate:300', 'plate', 1, 'rice:.3,veg:.3,oil:.04'],
    ['vegPulao', 'Veg pulao', 'meals', '🍚', 140, 3, 23, 4, 1.2, 'plate:250', 'plate', 1, 'rice:.3,veg:.2,oil:.03'],
    ['rasam', 'Rasam', 'meals', '🍲', 30, 1, 4, 1, 0.6, 'bowl:150', 'bowl', 1, 'toor:.03,veg:.2'],
    ['choleBhature', 'Chole bhature (plate)', 'meals', '🍛', 290, 7.5, 32, 15, 4.5, 'plate:300', 'plate', 1, 'chana:.1,atta:.3,oil:.12'],
    ['pavBhaji', 'Pav bhaji (plate)', 'meals,snacks', '🍛', 160, 4, 22, 6.5, 3, 'plate:350', 'plate', 1, 'bread:.25,veg:.5,butter:.03'],
    ['maggi', 'Instant noodles (cooked)', 'snacks', '🍜', 135, 3, 19, 5.5, 1, 'pack:230', 'pack', 1, 'cereal:.3'],
    // Fruits
    ['banana', 'Banana', 'fruits,gain', '🍌', 89, 1.1, 22.8, 0.3, 2.6, 'piece:118', 'piece', 1, 'banana:1'],
    ['apple', 'Apple', 'fruits', '🍎', 52, 0.3, 13.8, 0.2, 2.4, 'piece:182', 'piece', 1, 'apple:1.1'],
    ['mango', 'Mango', 'fruits', '🥭', 60, 0.8, 15, 0.4, 1.6, 'piece:200,cup:165', 'piece', 1, 'mango:1.4'],
    ['orange', 'Orange', 'fruits', '🍊', 47, 0.9, 11.8, 0.1, 2.4, 'piece:130', 'piece', 1, 'orange:1.3'],
    ['papaya', 'Papaya', 'fruits', '🧡', 43, 0.5, 10.8, 0.3, 1.7, 'cup:145,bowl:200', 'cup', 1, 'papaya:1.4'],
    ['guava', 'Guava', 'fruits', '🍐', 68, 2.6, 14.3, 1, 5.4, 'piece:100', 'piece', 1, 'guava:1.1'],
    ['grapes', 'Grapes', 'fruits', '🍇', 69, 0.7, 18.1, 0.2, 0.9, 'cup:150', 'cup', 1, 'grapes:1.05'],
    ['watermelon', 'Watermelon', 'fruits', '🍉', 30, 0.6, 7.6, 0.2, 0.4, 'cup:150,slice:280', 'cup', 1, 'fruit:1.6'],
    ['pomegranate', 'Pomegranate (seeds)', 'fruits', '🔴', 83, 1.7, 18.7, 1.2, 4, 'cup:175', 'cup', 1, 'fruit:1.8'],
    ['chikoo', 'Chikoo (sapota)', 'fruits', '🟤', 83, 0.4, 20, 1.1, 5.3, 'piece:100', 'piece', 1, 'fruit:1.2'],
    ['pineapple', 'Pineapple', 'fruits', '🍍', 50, 0.5, 13, 0.1, 1.4, 'cup:165', 'cup', 1, 'fruit:1.7'],
    ['pear', 'Pear', 'fruits', '🍐', 57, 0.4, 15, 0.1, 3.1, 'piece:178', 'piece', 1, 'fruit:1.1'],
    ['fruitChaat', 'Fruit chaat', 'fruits,snacks', '🥗', 60, 0.8, 15, 0.3, 2, 'bowl:150', 'bowl', 1, 'fruit:1.2'],
    // Dairy
    ['milkFull', 'Full cream milk', 'dairy,gain', '🥛', 88, 3.2, 4.8, 6, 0, 'glass:250,cup:200,ml:1', 'glass', 1, 'milkF:1'],
    ['milkToned', 'Toned milk', 'dairy', '🥛', 58, 3.1, 4.7, 3, 0, 'glass:250,cup:200,ml:1', 'glass', 1, 'milkT:1'],
    ['milkDT', 'Double toned milk', 'dairy', '🥛', 45, 3.1, 4.7, 1.5, 0, 'glass:250,cup:200,ml:1', 'glass', 1, 'milkDT:1'],
    ['butter', 'Butter', 'dairy', '🧈', 717, 0.9, 0.1, 81, 0, 'tsp:5,tbsp:14', 'tsp', 1, 'butter:1'],
    ['cheese', 'Cheese slice', 'dairy', '🧀', 300, 20, 2, 24, 0, 'slice:20', 'slice', 1, 'cheese:1'],
    ['ghee', 'Ghee', 'dairy,gain', '🫙', 900, 0, 0, 100, 0, 'tsp:5,tbsp:13', 'tsp', 1, 'ghee:1'],
    ['chaas', 'Buttermilk (chaas)', 'dairy', '🥛', 25, 1.5, 2.5, 1, 0, 'glass:250,ml:1', 'glass', 1, 'curd:.35'],
    ['lassi', 'Sweet lassi', 'dairy', '🥛', 90, 3, 13, 3, 0, 'glass:250,ml:1', 'glass', 1, 'curd:.7,sugar:.08'],
    ['greekYogurt', 'Greek yogurt', 'dairy', '🥛', 97, 9, 3.6, 5, 0, 'cup:170', 'g', 100, 'greek:1'],
    ['whey', 'Whey protein (check your label)', 'dairy,gain', '🥤', 400, 78, 8, 6, 0, 'scoop:30', 'scoop', 1, 'whey:1'],
    ['milkshake', 'Banana milkshake', 'dairy,gain', '🥤', 90, 3, 14, 2.6, 0.6, 'glass:300,ml:1', 'glass', 1, 'milkT:.65,banana:.3,sugar:.03'],
    // Weight gain
    ['pb', 'Peanut butter', 'gain', '🥜', 588, 25, 20, 50, 6, 'tbsp:16,tsp:5', 'tbsp', 1, 'pb:1'],
    ['peanuts', 'Peanuts (roasted)', 'gain,snacks', '🥜', 585, 24, 21, 49.7, 8.4, 'handful:30,tbsp:9', 'handful', 1, 'peanuts:1'],
    ['almonds', 'Almonds', 'gain', '🌰', 579, 21.2, 21.6, 49.9, 12.5, 'piece:1.2,handful:28', 'piece', 10, 'almonds:1'],
    ['cashews', 'Cashews', 'gain', '🌰', 553, 18.2, 30.2, 43.9, 3.3, 'piece:1.5,handful:28', 'piece', 10, 'cashews:1'],
    ['raisins', 'Raisins', 'gain', '🍇', 299, 3.1, 79.2, 0.5, 3.7, 'tbsp:10,handful:30', 'tbsp', 2, 'raisins:1'],
    ['dates', 'Dates', 'gain', '🟫', 282, 2.5, 75, 0.4, 8, 'piece:10', 'piece', 3, 'dates:1'],
    ['honey', 'Honey', 'gain', '🍯', 304, 0.3, 82.4, 0, 0.2, 'tsp:7,tbsp:21', 'tsp', 1, 'honey:1'],
    ['rchana', 'Roasted chana', 'gain,snacks', '🟤', 369, 20, 58, 5.2, 16.8, 'handful:30', 'handful', 1, 'rchana:1'],
    ['chikki', 'Peanut chikki', 'gain,snacks', '🍬', 500, 12, 60, 24, 3, 'piece:25', 'piece', 1, 'peanuts:.5,sugar:.5'],
    ['sattu', 'Chana sattu', 'gain', '🥤', 406, 22, 65, 6, 10, 'tbsp:10,serving:40', 'serving', 1, 'sattu:1'],
    ['makhana', 'Makhana (roasted)', 'gain,snacks', '⚪', 350, 9.7, 77, 0.1, 14.5, 'cup:32', 'cup', 1, 'makhana:1'],
    ['gainerShake', 'Desi gainer shake', 'gain', '🥤', 123, 4.6, 17.2, 4.5, 2.1, 'glass:434', 'glass', 1, 'milkT:.58,banana:.27,oats:.115,pb:.037'],
    // Snacks & drinks
    ['samosa', 'Samosa', 'snacks', '🥟', 290, 5, 30, 17, 2.5, 'piece:80', 'piece', 1, 'atta:.3,potato:.4,oil:.15'],
    ['vadaPav', 'Vada pav', 'snacks', '🍔', 200, 5, 28, 8, 2, 'piece:140', 'piece', 1, 'bread:.35,potato:.4,oil:.08'],
    ['pakora', 'Pakora', 'snacks', '🧆', 300, 7, 28, 18, 3, 'piece:20,plate:100', 'plate', 1, 'besan:.35,veg:.4,oil:.15'],
    ['dhokla', 'Dhokla', 'snacks', '🟨', 160, 6, 24, 4.5, 2, 'piece:30', 'piece', 4, 'besan:.35,oil:.03'],
    ['kachori', 'Kachori', 'snacks', '🥟', 400, 7, 40, 24, 3, 'piece:60', 'piece', 1, 'atta:.4,oil:.2'],
    ['biscuitMarie', 'Marie biscuit', 'snacks', '🍪', 440, 7.5, 76, 11, 2, 'piece:7', 'piece', 4, 'cereal:1'],
    ['parleG', 'Glucose biscuit', 'snacks', '🍪', 450, 7, 77, 12, 1.5, 'piece:6.5', 'piece', 4, 'cereal:1'],
    ['bhujia', 'Namkeen / bhujia', 'snacks', '🥨', 550, 14, 40, 37, 5, 'handful:30', 'handful', 1, 'besan:.6,oil:.35'],
    ['chips', 'Potato chips', 'snacks', '🥔', 536, 7, 53, 34, 4.8, 'pack:28', 'pack', 1, 'potato:2.5,oil:.35'],
    ['popcorn', 'Popcorn (plain)', 'snacks', '🍿', 387, 13, 78, 4.5, 15, 'cup:8', 'cup', 3, 'cereal:1'],
    ['sproutsChaat', 'Sprouts chaat', 'snacks', '🥗', 80, 5, 12, 1.5, 3, 'bowl:150', 'bowl', 1, 'moong:.3,veg:.2'],
    ['paniPuri', 'Pani puri', 'snacks', '🫧', 165, 3, 25, 6, 2, 'piece:25', 'piece', 6, 'atta:.3,potato:.3,oil:.06'],
    ['gulabJamun', 'Gulab jamun', 'snacks', '🟤', 330, 5, 50, 13, 0.5, 'piece:40', 'piece', 1, 'sugar:.4,milkF:.3'],
    ['jalebi', 'Jalebi', 'snacks', '🥨', 380, 3, 55, 17, 0.5, 'piece:25', 'piece', 2, 'sugar:.5,oil:.15'],
    ['sugar', 'Sugar', 'snacks', '🧂', 387, 0, 100, 0, 0, 'tsp:4', 'tsp', 1, 'sugar:1'],
    ['coldDrink', 'Cola / soft drink', 'snacks', '🥤', 42, 0, 10.6, 0, 0, 'can:330,glass:250,ml:1', 'glass', 1, ''],
    ['juice', 'Packaged fruit juice', 'snacks', '🧃', 50, 0.3, 12, 0.1, 0.2, 'glass:200,ml:1', 'glass', 1, ''],
    ['coconutWater', 'Coconut water', 'snacks', '🥥', 19, 0.7, 3.7, 0.2, 1.1, 'glass:240,ml:1', 'glass', 1, ''],
  ];

  const parseUnits = (s) => {
    const u = { g: 1 };
    String(s || '').split(',').filter(Boolean).forEach((p) => { const [k, v] = p.split(':'); u[k] = +v; });
    return u;
  };
  const parseGrocery = (s) => String(s || '').split(',').filter(Boolean).map((p) => { const [k, v] = p.split(':'); return [k, +v]; });

  const BUILTIN = {};
  R.forEach((r) => {
    const [id, name, cats, emoji, kcal, p, c, f, fib, units, defUnit, defQty, groc] = r;
    BUILTIN[id] = { id, name, cats: cats.split(','), emoji, kcal, p, c, f, fib, units: parseUnits(units), defUnit, defQty, grocery: parseGrocery(groc), builtin: true };
  });

  const UNIT_LABEL = { g: 'g', ml: 'ml', piece: 'piece', bowl: 'bowl', cup: 'cup', plate: 'plate', slice: 'slice', tbsp: 'tbsp', tsp: 'tsp', glass: 'glass', serving: 'serving', handful: 'handful', scoop: 'scoop', cube: 'cube', pack: 'pack', can: 'can' };
  const unitLabel = (u, q = 1) => {
    const l = UNIT_LABEL[u] || u;
    if (u === 'g' || u === 'ml') return l;
    return q === 1 ? l : l === 'glass' ? 'glasses' : l === 'piece' ? 'pieces' : l === 'handful' ? 'handfuls' : l + 's';
  };

  /* ---------- lookup (built-in + edits + custom foods + recipes) ---------- */
  function recipeToFood(r) {
    const tot = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, grams: 0 };
    for (const it of r.items || []) {
      const fd = foodById(it.foodId, true);
      if (!fd) continue;
      const v = calc(fd, it.qty, it.unit);
      tot.kcal += v.kcal; tot.p += v.p; tot.c += v.c; tot.f += v.f; tot.fib += v.fib; tot.grams += v.grams;
    }
    const servings = Math.max(1, +r.servings || 1);
    const weight = +r.cookedWeight > 0 ? +r.cookedWeight : tot.grams;
    if (weight > 0) {
      const k = 100 / weight;
      return { id: r.id, name: r.name, cats: ['recipes'], emoji: r.emoji || '📒', kcal: tot.kcal * k, p: tot.p * k, c: tot.c * k, f: tot.f * k, fib: tot.fib * k,
        units: { g: 1, serving: weight / servings }, defUnit: 'serving', defQty: 1, grocery: [], recipe: true };
    }
    return { id: r.id, name: r.name, cats: ['recipes'], emoji: r.emoji || '📒', base: 'serving', kcal: tot.kcal / servings, p: tot.p / servings, c: tot.c / servings, f: tot.f / servings, fib: tot.fib / servings,
      units: { serving: 1 }, defUnit: 'serving', defQty: 1, grocery: [], recipe: true };
  }

  function foodById(id, noRecipe) {
    const n = App.state.nutrition;
    if (BUILTIN[id]) {
      const ov = (n.overrides || {})[id];
      return ov ? { ...BUILTIN[id], ...ov, units: { ...BUILTIN[id].units, ...(ov.units || {}) }, edited: true } : BUILTIN[id];
    }
    const c = (n.customFoods || []).find((x) => x.id === id);
    if (c) return { ...c, cats: ['custom', ...(c.cat && c.cat !== 'custom' ? [c.cat] : [])], units: c.units || { g: 1 }, grocery: [], custom: true };
    if (!noRecipe) {
      const r = (n.recipes || []).find((x) => x.id === id);
      if (r) return recipeToFood(r);
    }
    return null;
  }

  function allFoods() {
    const n = App.state.nutrition;
    return [
      ...Object.keys(BUILTIN).map((id) => foodById(id)),
      ...(n.customFoods || []).map((c) => foodById(c.id)),
      ...(n.recipes || []).map((r) => recipeToFood(r)),
    ];
  }

  /** Nutrition for a quantity of a food. Values are per 100 g, or per serving for serving-based custom foods. */
  function calc(food, qty, unit) {
    qty = Math.max(0, +qty || 0);
    if (food.base === 'serving') {
      const k = qty;
      return { grams: 0, kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k, fib: (food.fib || 0) * k };
    }
    const g = (food.units && food.units[unit]) || (unit === 'g' ? 1 : 0);
    const grams = qty * g;
    const k = grams / 100;
    return { grams, kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k, fib: (food.fib || 0) * k };
  }

  function grocPrice(key) {
    const g = GROCERY[key];
    if (!g) return null;
    const ov = (App.state.nutrition.prices || {})[key];
    return ov !== undefined && ov !== '' ? +ov : g.price;
  }

  /** Estimated ingredient cost (₹) for a number of grams of a food, using the grocery mapping. Null if unknown. */
  function costOf(food, grams) {
    if (!food || !food.grocery || !food.grocery.length || !(grams > 0)) return null;
    let c = 0;
    for (const [k, f] of food.grocery) {
      const g = GROCERY[k];
      if (!g) continue;
      const raw = grams * f; // grams (or ml) of grocery item
      c += g.unit === 'pc' ? (raw / g.pcg) * grocPrice(k) : (raw / 1000) * grocPrice(k);
    }
    return c;
  }

  /* ---------- default low-budget weight-gain plan (editable in Nutrition → Meal plan) ---------- */
  App.defaultPlan = () => [
    { id: 'pm1', slot: 'breakfast', time: '09:00', name: 'Breakfast', items: [{ foodId: 'oats', qty: 50, unit: 'g' }, { foodId: 'milkToned', qty: 1, unit: 'glass' }, { foodId: 'banana', qty: 1, unit: 'piece' }, { foodId: 'pb', qty: 1, unit: 'tbsp' }],
      how: 'Cook oats in the milk for 3–4 min. Top with banana and peanut butter.', swap: 'Poha or upma with peanuts works too.' },
    { id: 'pm2', slot: 'snacks', time: '11:30', name: 'Mid-morning', items: [{ foodId: 'egg', qty: 3, unit: 'piece' }, { foodId: 'rchana', qty: 1, unit: 'handful' }],
      how: 'Boil eggs the night before.', swap: 'Vegetarian: 75 g paneer or 30 g extra soya chunks.' },
    { id: 'pm3', slot: 'lunch', time: '13:15', name: 'Lunch (before work)', items: [{ foodId: 'roti', qty: 2, unit: 'piece' }, { foodId: 'dal', qty: 150, unit: 'g' }, { foodId: 'rice', qty: 150, unit: 'g' }, { foodId: 'mixVeg', qty: 1, unit: 'bowl' }, { foodId: 'curd', qty: 150, unit: 'g' }],
      how: 'Normal home thali. Dal and curd carry the protein.', swap: 'Rajma or chole instead of dal.' },
    { id: 'pm4', slot: 'snacks', time: '17:30', name: 'Work snack', items: [{ foodId: 'banana', qty: 2, unit: 'piece' }, { foodId: 'peanuts', qty: 1, unit: 'handful' }],
      how: 'Pack in a box for the office.', swap: 'One peanut chikki instead of peanuts.' },
    { id: 'pm5', slot: 'dinner', time: '20:00', name: 'Dinner break', items: [{ foodId: 'roti', qty: 3, unit: 'piece' }, { foodId: 'soyaCurry', qty: 150, unit: 'g' }, { foodId: 'salad', qty: 1, unit: 'plate' }],
      how: 'Soak soya chunks in hot water 10 min, squeeze, cook in onion-tomato masala.', swap: 'Paneer bhurji or egg curry.' },
    { id: 'pm6', slot: 'snacks', time: '23:30', name: 'After work', items: [{ foodId: 'milkToned', qty: 1, unit: 'glass' }],
      how: 'Warm milk with a pinch of haldi.', swap: '150 g curd if milk does not suit you.' },
  ];

  const SLOTS = [
    { id: 'breakfast', label: 'Breakfast', e: '🌅' },
    { id: 'lunch', label: 'Lunch', e: '☀️' },
    { id: 'snacks', label: 'Snacks', e: '🍌' },
    { id: 'dinner', label: 'Dinner', e: '🌙' },
  ];
  App.slotForNow = () => {
    const h = new Date().getHours();
    return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snacks' : 'dinner';
  };

  const PROTEIN_TIPS = [
    { t: 'Soya chunks', d: '50 g dry ≈ 26 g protein. Cheapest protein per rupee.', ids: ['soyaDry'] },
    { t: 'Eggs', d: '3 eggs ≈ 19 g protein.', ids: ['egg'] },
    { t: 'Paneer', d: '100 g ≈ 18 g protein. Vegetarian alternative to eggs.', ids: ['paneer'] },
    { t: 'Dal + curd at every meal', d: 'A bowl of dal and curd adds ~14 g together.', ids: ['dal', 'curd'] },
    { t: 'Roasted chana & peanuts', d: 'Desk-friendly snacks with 6–7 g protein per handful.', ids: ['rchana', 'peanuts'] },
    { t: 'Milk', d: 'A glass adds ~8 g protein and ~150 kcal.', ids: ['milkToned'] },
  ];

  Object.assign(App, { FOOD_CATS: CATS, GROCERY, BUILTIN_FOODS: BUILTIN, foodById, allFoods, calcFood: calc, costOf, grocPrice, unitLabel, SLOTS, PROTEIN_TIPS, recipeToFood });
})();
