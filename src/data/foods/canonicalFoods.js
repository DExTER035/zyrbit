/**
 * DexOS / Zyrbit — Canonical Food Knowledge Catalog (Food Knowledge V2)
 *
 * Migrated from the 110-food curated seed in indianFoods.js.
 * Every record preserves original IDs, nutrition values, servings, and categories.
 * Adds explicit preparation states, provenance, and confidence metadata.
 */

export const CANONICAL_FOODS = [
  {
    "id": "poha",
    "name": "Poha",
    "category": "breakfast",
    "emoji": "🍚",
    "per100g": {
      "cal": 130,
      "protein": 2.6,
      "carbs": 28,
      "fat": 1.3,
      "fiber": 1.2
    },
    "defaultServingG": 150,
    "servingLabel": "1 plate (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "upma",
    "name": "Upma",
    "category": "breakfast",
    "emoji": "🍲",
    "per100g": {
      "cal": 130,
      "protein": 3,
      "carbs": 22,
      "fat": 4,
      "fiber": 1.8
    },
    "defaultServingG": 150,
    "servingLabel": "1 plate (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "idli",
    "name": "Idli",
    "category": "breakfast",
    "emoji": "🫓",
    "per100g": {
      "cal": 58,
      "protein": 2,
      "carbs": 12,
      "fat": 0.4,
      "fiber": 0.5
    },
    "defaultServingG": 200,
    "servingLabel": "4 pieces (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "dosa",
    "name": "Dosa (plain)",
    "category": "breakfast",
    "emoji": "🫓",
    "per100g": {
      "cal": 107,
      "protein": 2.7,
      "carbs": 20,
      "fat": 2,
      "fiber": 0.9
    },
    "defaultServingG": 100,
    "servingLabel": "1 dosa (100g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "masala_dosa",
    "name": "Masala Dosa",
    "category": "breakfast",
    "emoji": "🥞",
    "per100g": {
      "cal": 133,
      "protein": 3.5,
      "carbs": 22,
      "fat": 3.5,
      "fiber": 1.2
    },
    "defaultServingG": 150,
    "servingLabel": "1 masala dosa (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "rava_idli",
    "name": "Rava Idli",
    "category": "breakfast",
    "emoji": "🫓",
    "per100g": {
      "cal": 160,
      "protein": 4.5,
      "carbs": 28,
      "fat": 3.5,
      "fiber": 0.8
    },
    "defaultServingG": 180,
    "servingLabel": "3 pieces (180g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "medu_vada",
    "name": "Medu Vada",
    "category": "breakfast",
    "emoji": "🍩",
    "per100g": {
      "cal": 322,
      "protein": 7,
      "carbs": 30,
      "fat": 19,
      "fiber": 1.5
    },
    "defaultServingG": 100,
    "servingLabel": "2 vadas (100g)",
    "preparationState": "fried",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "paratha",
    "name": "Paratha (plain)",
    "category": "breakfast",
    "emoji": "🫓",
    "per100g": {
      "cal": 300,
      "protein": 6.5,
      "carbs": 40,
      "fat": 12,
      "fiber": 2
    },
    "defaultServingG": 100,
    "servingLabel": "1 paratha (100g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "aloo_paratha",
    "name": "Aloo Paratha",
    "category": "breakfast",
    "emoji": "🥔",
    "per100g": {
      "cal": 260,
      "protein": 5.5,
      "carbs": 38,
      "fat": 9,
      "fiber": 2.5
    },
    "defaultServingG": 120,
    "servingLabel": "1 aloo paratha (120g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "oats_plain",
    "name": "Oats (cooked)",
    "category": "breakfast",
    "emoji": "🥣",
    "per100g": {
      "cal": 71,
      "protein": 2.5,
      "carbs": 12,
      "fat": 1.5,
      "fiber": 1.7
    },
    "defaultServingG": 250,
    "servingLabel": "1 bowl (250g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "oats_masala",
    "name": "Masala Oats",
    "category": "breakfast",
    "emoji": "🥣",
    "per100g": {
      "cal": 100,
      "protein": 3.5,
      "carbs": 17,
      "fat": 2,
      "fiber": 2
    },
    "defaultServingG": 200,
    "servingLabel": "1 bowl (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "daliya",
    "name": "Daliya (broken wheat)",
    "category": "breakfast",
    "emoji": "🥣",
    "per100g": {
      "cal": 108,
      "protein": 3.5,
      "carbs": 21,
      "fat": 0.8,
      "fiber": 2.8
    },
    "defaultServingG": 200,
    "servingLabel": "1 bowl (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "muesli",
    "name": "Muesli",
    "category": "breakfast",
    "emoji": "🥣",
    "per100g": {
      "cal": 367,
      "protein": 9.5,
      "carbs": 66,
      "fat": 6,
      "fiber": 6.5
    },
    "defaultServingG": 60,
    "servingLabel": "1 serving (60g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "cornflakes",
    "name": "Cornflakes + Milk",
    "category": "breakfast",
    "emoji": "🥣",
    "per100g": {
      "cal": 153,
      "protein": 4.5,
      "carbs": 30,
      "fat": 1.8,
      "fiber": 0.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 bowl (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "moong_dal_chilla",
    "name": "Moong Dal Chilla",
    "category": "breakfast",
    "emoji": "🥞",
    "per100g": {
      "cal": 180,
      "protein": 11,
      "carbs": 26,
      "fat": 3.5,
      "fiber": 3
    },
    "defaultServingG": 150,
    "servingLabel": "2 chillas (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "besan_chilla",
    "name": "Besan Chilla",
    "category": "breakfast",
    "emoji": "🥞",
    "per100g": {
      "cal": 180,
      "protein": 9,
      "carbs": 25,
      "fat": 4.5,
      "fiber": 3.5
    },
    "defaultServingG": 150,
    "servingLabel": "2 chillas (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "bread_toast",
    "name": "Bread Toast (2 slices)",
    "category": "breakfast",
    "emoji": "🍞",
    "per100g": {
      "cal": 270,
      "protein": 8.5,
      "carbs": 50,
      "fat": 3.5,
      "fiber": 2.5
    },
    "defaultServingG": 70,
    "servingLabel": "2 slices (70g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "peanut_butter_toast",
    "name": "Peanut Butter Toast",
    "category": "breakfast",
    "emoji": "🥜",
    "per100g": {
      "cal": 320,
      "protein": 11,
      "carbs": 36,
      "fat": 15,
      "fiber": 3
    },
    "defaultServingG": 100,
    "servingLabel": "2 slices with PB (100g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "sprouts",
    "name": "Mixed Sprouts",
    "category": "breakfast",
    "emoji": "🌱",
    "per100g": {
      "cal": 53,
      "protein": 4.5,
      "carbs": 8,
      "fat": 0.5,
      "fiber": 2.5
    },
    "defaultServingG": 100,
    "servingLabel": "1 bowl (100g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "banana_shake",
    "name": "Banana Shake (milk)",
    "category": "breakfast",
    "emoji": "🥤",
    "per100g": {
      "cal": 80,
      "protein": 2.5,
      "carbs": 15,
      "fat": 1.5,
      "fiber": 0.6
    },
    "defaultServingG": 300,
    "servingLabel": "1 glass (300ml)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chai",
    "name": "Chai (with milk + sugar)",
    "category": "breakfast",
    "emoji": "🍵",
    "per100g": {
      "cal": 38,
      "protein": 1.5,
      "carbs": 5.5,
      "fat": 1,
      "fiber": 0
    },
    "defaultServingG": 150,
    "servingLabel": "1 cup (150ml)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "black_coffee",
    "name": "Black Coffee",
    "category": "breakfast",
    "emoji": "☕",
    "per100g": {
      "cal": 2,
      "protein": 0.3,
      "carbs": 0,
      "fat": 0,
      "fiber": 0
    },
    "defaultServingG": 240,
    "servingLabel": "1 cup (240ml)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "egg_boiled",
    "name": "Boiled Egg",
    "category": "breakfast",
    "emoji": "🥚",
    "per100g": {
      "cal": 155,
      "protein": 13,
      "carbs": 1.1,
      "fat": 11,
      "fiber": 0
    },
    "defaultServingG": 100,
    "servingLabel": "2 eggs (100g)",
    "preparationState": "boiled",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "egg_scrambled",
    "name": "Scrambled Eggs",
    "category": "breakfast",
    "emoji": "🍳",
    "per100g": {
      "cal": 168,
      "protein": 11,
      "carbs": 2.2,
      "fat": 13,
      "fiber": 0
    },
    "defaultServingG": 150,
    "servingLabel": "2-egg scramble (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "curd_plain",
    "name": "Curd / Dahi (plain)",
    "category": "breakfast",
    "emoji": "🥛",
    "per100g": {
      "cal": 61,
      "protein": 3.5,
      "carbs": 4.7,
      "fat": 3.2,
      "fiber": 0
    },
    "defaultServingG": 150,
    "servingLabel": "1 bowl (150g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "rice_cooked",
    "name": "Rice (cooked)",
    "category": "lunch",
    "emoji": "🍚",
    "per100g": {
      "cal": 130,
      "protein": 2.7,
      "carbs": 28,
      "fat": 0.3,
      "fiber": 0.4
    },
    "defaultServingG": 200,
    "servingLabel": "1 plate (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "roti",
    "name": "Roti / Chapati",
    "category": "lunch",
    "emoji": "🫓",
    "per100g": {
      "cal": 297,
      "protein": 9,
      "carbs": 56,
      "fat": 4,
      "fiber": 3.5
    },
    "defaultServingG": 90,
    "servingLabel": "3 rotis (90g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "dal_tadka",
    "name": "Dal Tadka",
    "category": "lunch",
    "emoji": "🍲",
    "per100g": {
      "cal": 85,
      "protein": 5.5,
      "carbs": 10,
      "fat": 2.5,
      "fiber": 3
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "dal_makhani",
    "name": "Dal Makhani",
    "category": "lunch",
    "emoji": "🍲",
    "per100g": {
      "cal": 135,
      "protein": 7,
      "carbs": 15,
      "fat": 5.5,
      "fiber": 4
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "rajma",
    "name": "Rajma Chawal",
    "category": "lunch",
    "emoji": "🫘",
    "per100g": {
      "cal": 115,
      "protein": 6.5,
      "carbs": 18,
      "fat": 2,
      "fiber": 5
    },
    "defaultServingG": 250,
    "servingLabel": "1 plate (250g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chole",
    "name": "Chole",
    "category": "lunch",
    "emoji": "🫘",
    "per100g": {
      "cal": 120,
      "protein": 6.5,
      "carbs": 17,
      "fat": 3,
      "fiber": 5.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "paneer_butter_masala",
    "name": "Paneer Butter Masala",
    "category": "lunch",
    "emoji": "🧀",
    "per100g": {
      "cal": 180,
      "protein": 9,
      "carbs": 8,
      "fat": 13,
      "fiber": 1.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "palak_paneer",
    "name": "Palak Paneer",
    "category": "lunch",
    "emoji": "🥬",
    "per100g": {
      "cal": 150,
      "protein": 8,
      "carbs": 6.5,
      "fat": 10,
      "fiber": 2.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chicken_curry",
    "name": "Chicken Curry",
    "category": "lunch",
    "emoji": "🍗",
    "per100g": {
      "cal": 165,
      "protein": 18,
      "carbs": 5,
      "fat": 8,
      "fiber": 1
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "egg_curry",
    "name": "Egg Curry",
    "category": "lunch",
    "emoji": "🥚",
    "per100g": {
      "cal": 130,
      "protein": 10,
      "carbs": 4.5,
      "fat": 8.5,
      "fiber": 1
    },
    "defaultServingG": 200,
    "servingLabel": "2 eggs + gravy (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "sabzi_mixed",
    "name": "Mixed Sabzi",
    "category": "lunch",
    "emoji": "🥦",
    "per100g": {
      "cal": 80,
      "protein": 2.5,
      "carbs": 10,
      "fat": 3,
      "fiber": 3
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "aloo_gobi",
    "name": "Aloo Gobi",
    "category": "lunch",
    "emoji": "🥔",
    "per100g": {
      "cal": 90,
      "protein": 2.2,
      "carbs": 13,
      "fat": 3,
      "fiber": 2.5
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "bhindi_masala",
    "name": "Bhindi Masala",
    "category": "lunch",
    "emoji": "🫑",
    "per100g": {
      "cal": 85,
      "protein": 2,
      "carbs": 8,
      "fat": 4.5,
      "fiber": 3
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "baingan_bharta",
    "name": "Baingan Bharta",
    "category": "lunch",
    "emoji": "🍆",
    "per100g": {
      "cal": 80,
      "protein": 1.5,
      "carbs": 7,
      "fat": 4.5,
      "fiber": 3.5
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "sambar",
    "name": "Sambar",
    "category": "lunch",
    "emoji": "🍲",
    "per100g": {
      "cal": 55,
      "protein": 3,
      "carbs": 8,
      "fat": 1,
      "fiber": 2
    },
    "defaultServingG": 200,
    "servingLabel": "1 bowl (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "rasam",
    "name": "Rasam",
    "category": "lunch",
    "emoji": "🥣",
    "per100g": {
      "cal": 25,
      "protein": 1,
      "carbs": 3.5,
      "fat": 0.5,
      "fiber": 0.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 bowl (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "kadhi",
    "name": "Kadhi",
    "category": "lunch",
    "emoji": "🍲",
    "per100g": {
      "cal": 70,
      "protein": 3.5,
      "carbs": 6,
      "fat": 3.5,
      "fiber": 0.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "khichdi",
    "name": "Khichdi (moong)",
    "category": "lunch",
    "emoji": "🍲",
    "per100g": {
      "cal": 100,
      "protein": 4.5,
      "carbs": 18,
      "fat": 1.5,
      "fiber": 2
    },
    "defaultServingG": 250,
    "servingLabel": "1 bowl (250g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "veg_pulao",
    "name": "Veg Pulao",
    "category": "lunch",
    "emoji": "🍚",
    "per100g": {
      "cal": 150,
      "protein": 3.5,
      "carbs": 28,
      "fat": 3,
      "fiber": 2
    },
    "defaultServingG": 200,
    "servingLabel": "1 plate (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chicken_biryani",
    "name": "Chicken Biryani",
    "category": "lunch",
    "emoji": "🍗",
    "per100g": {
      "cal": 188,
      "protein": 11,
      "carbs": 25,
      "fat": 5,
      "fiber": 1
    },
    "defaultServingG": 300,
    "servingLabel": "1 plate (300g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "veg_biryani",
    "name": "Veg Biryani",
    "category": "lunch",
    "emoji": "🍚",
    "per100g": {
      "cal": 155,
      "protein": 4,
      "carbs": 28,
      "fat": 3.5,
      "fiber": 2
    },
    "defaultServingG": 300,
    "servingLabel": "1 plate (300g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "pav_bhaji",
    "name": "Pav Bhaji",
    "category": "lunch",
    "emoji": "🍞",
    "per100g": {
      "cal": 175,
      "protein": 4.5,
      "carbs": 30,
      "fat": 5,
      "fiber": 3
    },
    "defaultServingG": 300,
    "servingLabel": "2 pavs + bhaji (300g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "curd_rice",
    "name": "Curd Rice",
    "category": "lunch",
    "emoji": "🍚",
    "per100g": {
      "cal": 100,
      "protein": 3,
      "carbs": 18,
      "fat": 2,
      "fiber": 0.5
    },
    "defaultServingG": 250,
    "servingLabel": "1 plate (250g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "lemon_rice",
    "name": "Lemon Rice",
    "category": "lunch",
    "emoji": "🍋",
    "per100g": {
      "cal": 140,
      "protein": 2.5,
      "carbs": 26,
      "fat": 3,
      "fiber": 0.8
    },
    "defaultServingG": 200,
    "servingLabel": "1 plate (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "soya_chunks",
    "name": "Soya Chunks Curry",
    "category": "lunch",
    "emoji": "🫘",
    "per100g": {
      "cal": 120,
      "protein": 15,
      "carbs": 10,
      "fat": 1.5,
      "fiber": 2.5
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "fish_curry",
    "name": "Fish Curry",
    "category": "lunch",
    "emoji": "🐟",
    "per100g": {
      "cal": 140,
      "protein": 16,
      "carbs": 4,
      "fat": 6.5,
      "fiber": 0.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "mutton_curry",
    "name": "Mutton Curry",
    "category": "lunch",
    "emoji": "🍖",
    "per100g": {
      "cal": 185,
      "protein": 18,
      "carbs": 4,
      "fat": 11,
      "fiber": 0.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "raita",
    "name": "Raita (veg)",
    "category": "lunch",
    "emoji": "🥒",
    "per100g": {
      "cal": 48,
      "protein": 2.5,
      "carbs": 4.5,
      "fat": 2,
      "fiber": 0.5
    },
    "defaultServingG": 100,
    "servingLabel": "1 katori (100g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "tofu_curry",
    "name": "Tofu Curry",
    "category": "lunch",
    "emoji": "🧀",
    "per100g": {
      "cal": 110,
      "protein": 8.5,
      "carbs": 4,
      "fat": 7,
      "fiber": 1
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "paneer_bhurji",
    "name": "Paneer Bhurji",
    "category": "lunch",
    "emoji": "🧀",
    "per100g": {
      "cal": 190,
      "protein": 12,
      "carbs": 4,
      "fat": 14,
      "fiber": 0.5
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "masoor_dal",
    "name": "Masoor Dal",
    "category": "lunch",
    "emoji": "🍲",
    "per100g": {
      "cal": 78,
      "protein": 5.5,
      "carbs": 11,
      "fat": 1,
      "fiber": 3.5
    },
    "defaultServingG": 200,
    "servingLabel": "1 katori (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "roti_dinner",
    "name": "Roti + Dal",
    "category": "dinner",
    "emoji": "🫓",
    "per100g": {
      "cal": 200,
      "protein": 7.5,
      "carbs": 33,
      "fat": 4,
      "fiber": 3
    },
    "defaultServingG": 250,
    "servingLabel": "3 rotis + 1 katori dal (250g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "khichdi_dinner",
    "name": "Khichdi (light)",
    "category": "dinner",
    "emoji": "🍲",
    "per100g": {
      "cal": 100,
      "protein": 4.5,
      "carbs": 18,
      "fat": 1.5,
      "fiber": 2
    },
    "defaultServingG": 250,
    "servingLabel": "1 bowl (250g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "soup_tomato",
    "name": "Tomato Soup",
    "category": "dinner",
    "emoji": "🍵",
    "per100g": {
      "cal": 40,
      "protein": 1,
      "carbs": 7,
      "fat": 0.8,
      "fiber": 1
    },
    "defaultServingG": 250,
    "servingLabel": "1 bowl (250ml)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "soup_chicken",
    "name": "Chicken Soup",
    "category": "dinner",
    "emoji": "🍵",
    "per100g": {
      "cal": 55,
      "protein": 5.5,
      "carbs": 4,
      "fat": 1.5,
      "fiber": 0.5
    },
    "defaultServingG": 250,
    "servingLabel": "1 bowl (250ml)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "dal_rice_dinner",
    "name": "Dal Rice",
    "category": "dinner",
    "emoji": "🍚",
    "per100g": {
      "cal": 120,
      "protein": 4,
      "carbs": 22,
      "fat": 1.5,
      "fiber": 2
    },
    "defaultServingG": 300,
    "servingLabel": "1 plate (300g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "paneer_sabzi",
    "name": "Paneer Sabzi",
    "category": "dinner",
    "emoji": "🧀",
    "per100g": {
      "cal": 160,
      "protein": 8.5,
      "carbs": 7,
      "fat": 11,
      "fiber": 2
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "egg_bhurji",
    "name": "Egg Bhurji",
    "category": "dinner",
    "emoji": "🍳",
    "per100g": {
      "cal": 155,
      "protein": 12,
      "carbs": 3,
      "fat": 11,
      "fiber": 0.5
    },
    "defaultServingG": 150,
    "servingLabel": "2-egg bhurji (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chicken_tikka",
    "name": "Chicken Tikka",
    "category": "dinner",
    "emoji": "🍗",
    "per100g": {
      "cal": 165,
      "protein": 25,
      "carbs": 4,
      "fat": 5.5,
      "fiber": 0.5
    },
    "defaultServingG": 150,
    "servingLabel": "1 serving (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "grilled_fish",
    "name": "Grilled Fish",
    "category": "dinner",
    "emoji": "🐟",
    "per100g": {
      "cal": 140,
      "protein": 25,
      "carbs": 0,
      "fat": 4,
      "fiber": 0
    },
    "defaultServingG": 150,
    "servingLabel": "1 fillet (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "vegetable_soup",
    "name": "Vegetable Soup",
    "category": "dinner",
    "emoji": "🥕",
    "per100g": {
      "cal": 35,
      "protein": 1.5,
      "carbs": 6.5,
      "fat": 0.5,
      "fiber": 2
    },
    "defaultServingG": 300,
    "servingLabel": "1 bowl (300ml)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "roti_sabzi",
    "name": "Roti + Sabzi",
    "category": "dinner",
    "emoji": "🫓",
    "per100g": {
      "cal": 175,
      "protein": 5,
      "carbs": 28,
      "fat": 5,
      "fiber": 3
    },
    "defaultServingG": 200,
    "servingLabel": "2 rotis + sabzi (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "biryani_dinner",
    "name": "Biryani (light)",
    "category": "dinner",
    "emoji": "🍚",
    "per100g": {
      "cal": 160,
      "protein": 7.5,
      "carbs": 27,
      "fat": 3.5,
      "fiber": 1.5
    },
    "defaultServingG": 250,
    "servingLabel": "1 plate (250g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "banana",
    "name": "Banana",
    "category": "snack",
    "emoji": "🍌",
    "per100g": {
      "cal": 89,
      "protein": 1.1,
      "carbs": 23,
      "fat": 0.3,
      "fiber": 2.6
    },
    "defaultServingG": 120,
    "servingLabel": "1 medium banana (120g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "apple",
    "name": "Apple",
    "category": "snack",
    "emoji": "🍎",
    "per100g": {
      "cal": 52,
      "protein": 0.3,
      "carbs": 14,
      "fat": 0.2,
      "fiber": 2.4
    },
    "defaultServingG": 150,
    "servingLabel": "1 medium apple (150g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "orange",
    "name": "Orange",
    "category": "snack",
    "emoji": "🍊",
    "per100g": {
      "cal": 47,
      "protein": 0.9,
      "carbs": 12,
      "fat": 0.1,
      "fiber": 2.4
    },
    "defaultServingG": 150,
    "servingLabel": "1 medium orange (150g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "mango",
    "name": "Mango",
    "category": "snack",
    "emoji": "🥭",
    "per100g": {
      "cal": 60,
      "protein": 0.8,
      "carbs": 15,
      "fat": 0.4,
      "fiber": 1.6
    },
    "defaultServingG": 200,
    "servingLabel": "1 medium mango (200g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "watermelon",
    "name": "Watermelon",
    "category": "snack",
    "emoji": "🍉",
    "per100g": {
      "cal": 30,
      "protein": 0.6,
      "carbs": 7.5,
      "fat": 0.2,
      "fiber": 0.4
    },
    "defaultServingG": 300,
    "servingLabel": "2 slices (300g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "papaya",
    "name": "Papaya",
    "category": "snack",
    "emoji": "🥭",
    "per100g": {
      "cal": 43,
      "protein": 0.5,
      "carbs": 11,
      "fat": 0.3,
      "fiber": 1.7
    },
    "defaultServingG": 200,
    "servingLabel": "1 bowl (200g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "guava",
    "name": "Guava",
    "category": "snack",
    "emoji": "🍈",
    "per100g": {
      "cal": 68,
      "protein": 2.5,
      "carbs": 14,
      "fat": 1,
      "fiber": 5.4
    },
    "defaultServingG": 100,
    "servingLabel": "1 guava (100g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "grapes",
    "name": "Grapes",
    "category": "snack",
    "emoji": "🍇",
    "per100g": {
      "cal": 69,
      "protein": 0.7,
      "carbs": 18,
      "fat": 0.2,
      "fiber": 0.9
    },
    "defaultServingG": 100,
    "servingLabel": "1 bunch (100g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "samosa",
    "name": "Samosa",
    "category": "snack",
    "emoji": "🥟",
    "per100g": {
      "cal": 310,
      "protein": 5.5,
      "carbs": 40,
      "fat": 14,
      "fiber": 2
    },
    "defaultServingG": 80,
    "servingLabel": "1 samosa (80g)",
    "preparationState": "fried",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "vada_pav",
    "name": "Vada Pav",
    "category": "snack",
    "emoji": "🍔",
    "per100g": {
      "cal": 280,
      "protein": 6,
      "carbs": 40,
      "fat": 10,
      "fiber": 2
    },
    "defaultServingG": 150,
    "servingLabel": "1 vada pav (150g)",
    "preparationState": "fried",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "bhel_puri",
    "name": "Bhel Puri",
    "category": "snack",
    "emoji": "🥗",
    "per100g": {
      "cal": 200,
      "protein": 4.5,
      "carbs": 35,
      "fat": 5,
      "fiber": 2.5
    },
    "defaultServingG": 150,
    "servingLabel": "1 plate (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "makhana",
    "name": "Roasted Makhana",
    "category": "snack",
    "emoji": "⚪",
    "per100g": {
      "cal": 347,
      "protein": 9.5,
      "carbs": 77,
      "fat": 0.5,
      "fiber": 14
    },
    "defaultServingG": 30,
    "servingLabel": "1 handful (30g)",
    "preparationState": "roasted",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "peanuts",
    "name": "Peanuts (roasted)",
    "category": "snack",
    "emoji": "🥜",
    "per100g": {
      "cal": 567,
      "protein": 26,
      "carbs": 16,
      "fat": 49,
      "fiber": 8.5
    },
    "defaultServingG": 30,
    "servingLabel": "1 handful (30g)",
    "preparationState": "roasted",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "almonds",
    "name": "Almonds",
    "category": "snack",
    "emoji": "🌰",
    "per100g": {
      "cal": 579,
      "protein": 21,
      "carbs": 22,
      "fat": 50,
      "fiber": 12.5
    },
    "defaultServingG": 30,
    "servingLabel": "10 almonds (30g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "cashews",
    "name": "Cashews",
    "category": "snack",
    "emoji": "🌰",
    "per100g": {
      "cal": 553,
      "protein": 18,
      "carbs": 33,
      "fat": 44,
      "fiber": 3.3
    },
    "defaultServingG": 30,
    "servingLabel": "10 cashews (30g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "dates",
    "name": "Dates",
    "category": "snack",
    "emoji": "🌴",
    "per100g": {
      "cal": 277,
      "protein": 1.8,
      "carbs": 75,
      "fat": 0.2,
      "fiber": 6.7
    },
    "defaultServingG": 50,
    "servingLabel": "5 dates (50g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "greek_yogurt",
    "name": "Greek Yogurt",
    "category": "snack",
    "emoji": "🥛",
    "per100g": {
      "cal": 59,
      "protein": 10,
      "carbs": 3.6,
      "fat": 0.4,
      "fiber": 0
    },
    "defaultServingG": 150,
    "servingLabel": "1 cup (150g)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "namkeen",
    "name": "Namkeen (mixed)",
    "category": "snack",
    "emoji": "🥨",
    "per100g": {
      "cal": 480,
      "protein": 8,
      "carbs": 60,
      "fat": 22,
      "fiber": 2
    },
    "defaultServingG": 40,
    "servingLabel": "1 small packet (40g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "maggi",
    "name": "Maggi Noodles",
    "category": "snack",
    "emoji": "🍜",
    "per100g": {
      "cal": 415,
      "protein": 9,
      "carbs": 57,
      "fat": 16,
      "fiber": 2.5
    },
    "defaultServingG": 80,
    "servingLabel": "1 packet cooked (80g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "biscuits_marie",
    "name": "Marie Biscuits (2)",
    "category": "snack",
    "emoji": "🍪",
    "per100g": {
      "cal": 416,
      "protein": 7,
      "carbs": 74,
      "fat": 10,
      "fiber": 1.5
    },
    "defaultServingG": 30,
    "servingLabel": "2 biscuits (30g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "dark_chocolate",
    "name": "Dark Chocolate",
    "category": "snack",
    "emoji": "🍫",
    "per100g": {
      "cal": 546,
      "protein": 5.5,
      "carbs": 60,
      "fat": 31,
      "fiber": 7
    },
    "defaultServingG": 25,
    "servingLabel": "1 small bar (25g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "sandwich_veg",
    "name": "Veg Sandwich",
    "category": "snack",
    "emoji": "🥪",
    "per100g": {
      "cal": 220,
      "protein": 7,
      "carbs": 32,
      "fat": 7,
      "fiber": 2.5
    },
    "defaultServingG": 120,
    "servingLabel": "1 sandwich (120g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chaat",
    "name": "Chaat",
    "category": "snack",
    "emoji": "🥗",
    "per100g": {
      "cal": 175,
      "protein": 5,
      "carbs": 30,
      "fat": 4,
      "fiber": 3
    },
    "defaultServingG": 150,
    "servingLabel": "1 plate (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "pani_puri",
    "name": "Pani Puri (6 pieces)",
    "category": "snack",
    "emoji": "🫙",
    "per100g": {
      "cal": 250,
      "protein": 4.5,
      "carbs": 42,
      "fat": 7,
      "fiber": 2
    },
    "defaultServingG": 120,
    "servingLabel": "6 puris (120g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "fruit_bowl",
    "name": "Mixed Fruit Bowl",
    "category": "snack",
    "emoji": "🍱",
    "per100g": {
      "cal": 55,
      "protein": 0.8,
      "carbs": 14,
      "fat": 0.2,
      "fiber": 1.8
    },
    "defaultServingG": 200,
    "servingLabel": "1 bowl (200g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "protein_bar",
    "name": "Protein Bar",
    "category": "snack",
    "emoji": "🍫",
    "per100g": {
      "cal": 370,
      "protein": 25,
      "carbs": 40,
      "fat": 10,
      "fiber": 3
    },
    "defaultServingG": 60,
    "servingLabel": "1 bar (60g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "paneer_raw",
    "name": "Paneer",
    "category": "protein",
    "emoji": "🧀",
    "per100g": {
      "cal": 265,
      "protein": 18,
      "carbs": 3,
      "fat": 20,
      "fiber": 0
    },
    "defaultServingG": 100,
    "servingLabel": "100g block",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "egg_white",
    "name": "Egg White",
    "category": "protein",
    "emoji": "🥚",
    "per100g": {
      "cal": 52,
      "protein": 11,
      "carbs": 0.7,
      "fat": 0.2,
      "fiber": 0
    },
    "defaultServingG": 60,
    "servingLabel": "2 egg whites (60g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chicken_breast",
    "name": "Chicken Breast (grilled)",
    "category": "protein",
    "emoji": "🍗",
    "per100g": {
      "cal": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6,
      "fiber": 0
    },
    "defaultServingG": 150,
    "servingLabel": "1 fillet (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chicken_thigh",
    "name": "Chicken Thigh",
    "category": "protein",
    "emoji": "🍗",
    "per100g": {
      "cal": 209,
      "protein": 26,
      "carbs": 0,
      "fat": 11,
      "fiber": 0
    },
    "defaultServingG": 150,
    "servingLabel": "1 piece (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "fish_rohu",
    "name": "Fish — Rohu (cooked)",
    "category": "protein",
    "emoji": "🐟",
    "per100g": {
      "cal": 111,
      "protein": 16,
      "carbs": 0,
      "fat": 5,
      "fiber": 0
    },
    "defaultServingG": 150,
    "servingLabel": "1 piece (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "tuna_canned",
    "name": "Tuna (canned, drained)",
    "category": "protein",
    "emoji": "🐟",
    "per100g": {
      "cal": 116,
      "protein": 26,
      "carbs": 0,
      "fat": 1,
      "fiber": 0
    },
    "defaultServingG": 85,
    "servingLabel": "1 can (85g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "shrimp",
    "name": "Shrimp (cooked)",
    "category": "protein",
    "emoji": "🦐",
    "per100g": {
      "cal": 99,
      "protein": 24,
      "carbs": 0.2,
      "fat": 0.3,
      "fiber": 0
    },
    "defaultServingG": 100,
    "servingLabel": "100g",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "tofu_firm",
    "name": "Tofu (firm)",
    "category": "protein",
    "emoji": "🧀",
    "per100g": {
      "cal": 76,
      "protein": 8,
      "carbs": 1.9,
      "fat": 4.8,
      "fiber": 0.3
    },
    "defaultServingG": 150,
    "servingLabel": "150g block",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "soya_chunks_dry",
    "name": "Soya Chunks (dry)",
    "category": "protein",
    "emoji": "🫘",
    "per100g": {
      "cal": 345,
      "protein": 52,
      "carbs": 33,
      "fat": 0.5,
      "fiber": 13
    },
    "defaultServingG": 50,
    "servingLabel": "50g dry (makes ~150g cooked)",
    "preparationState": "dry",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "milk_whole",
    "name": "Whole Milk",
    "category": "protein",
    "emoji": "🥛",
    "per100g": {
      "cal": 61,
      "protein": 3.2,
      "carbs": 4.8,
      "fat": 3.3,
      "fiber": 0
    },
    "defaultServingG": 250,
    "servingLabel": "1 glass (250ml)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "milk_skimmed",
    "name": "Skimmed Milk",
    "category": "protein",
    "emoji": "🥛",
    "per100g": {
      "cal": 34,
      "protein": 3.4,
      "carbs": 5,
      "fat": 0.1,
      "fiber": 0
    },
    "defaultServingG": 250,
    "servingLabel": "1 glass (250ml)",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "whey_protein",
    "name": "Whey Protein (1 scoop)",
    "category": "protein",
    "emoji": "💪",
    "per100g": {
      "cal": 370,
      "protein": 80,
      "carbs": 8,
      "fat": 4,
      "fiber": 0
    },
    "defaultServingG": 30,
    "servingLabel": "1 scoop (30g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "rajma_cooked",
    "name": "Rajma (cooked)",
    "category": "protein",
    "emoji": "🫘",
    "per100g": {
      "cal": 127,
      "protein": 8.7,
      "carbs": 22,
      "fat": 0.5,
      "fiber": 7.4
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "moong_dal_cooked",
    "name": "Moong Dal (cooked)",
    "category": "protein",
    "emoji": "🫘",
    "per100g": {
      "cal": 104,
      "protein": 7,
      "carbs": 17,
      "fat": 0.4,
      "fiber": 4
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "urad_dal",
    "name": "Urad Dal (cooked)",
    "category": "protein",
    "emoji": "🫘",
    "per100g": {
      "cal": 116,
      "protein": 7.5,
      "carbs": 18,
      "fat": 0.6,
      "fiber": 3.5
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  },
  {
    "id": "chole_cooked",
    "name": "Chole (cooked)",
    "category": "protein",
    "emoji": "🫘",
    "per100g": {
      "cal": 164,
      "protein": 8.9,
      "carbs": 27,
      "fat": 2.6,
      "fiber": 7.6
    },
    "defaultServingG": 150,
    "servingLabel": "1 katori (150g)",
    "preparationState": "cooked",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1
  }
];

export const PREPARATION_VARIANTS = [
  {
    "id": "oats_dry",
    "name": "Rolled Oats (dry)",
    "category": "breakfast",
    "emoji": "🥣",
    "per100g": {
      "cal": 389,
      "protein": 16.9,
      "carbs": 66,
      "fat": 6.9,
      "fiber": 10.6
    },
    "defaultServingG": 40,
    "servingLabel": "40g dry",
    "preparationState": "dry",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1,
    "canonicalParentId": "oats_plain"
  },
  {
    "id": "rice_raw",
    "name": "Raw Rice (dry grain)",
    "category": "lunch",
    "emoji": "🌾",
    "per100g": {
      "cal": 360,
      "protein": 7,
      "carbs": 79,
      "fat": 0.6,
      "fiber": 1.3
    },
    "defaultServingG": 50,
    "servingLabel": "50g raw dry",
    "preparationState": "raw",
    "sourceType": "curated_seed",
    "sourceName": "ZYRBIT_SEED",
    "sourceVersion": "1.0",
    "confidenceScore": 1,
    "canonicalParentId": "rice"
  }
];

import GLOBAL_CANONICAL_FOODS from './globalCanonicalFoods.js';
import GLOBAL_ALIASES from './globalFoodAliases.js';

export const ALL_CANONICAL_FOODS = GLOBAL_CANONICAL_FOODS;

/**
 * Curated aliases mapping synonyms, plurals, and regional names to canonical food IDs.
 */
export const FOOD_ALIASES_V2 = [
  // Eggs
  { patterns: [/^(?:boiled\s+)?eggs?$/i, /^egg\s+boiled$/i], id: 'egg_boiled', unitWeightG: 50 },
  { patterns: [/^egg\s+whites?$/i], id: 'egg_white', unitWeightG: 30 },
  { patterns: [/^scrambled\s+eggs?$/i], id: 'egg_scrambled', unitWeightG: 75 },
  { patterns: [/^egg\s+bhurji$/i, /^anda\s+bhurji$/i], id: 'egg_bhurji', unitWeightG: 150 },
  { patterns: [/^egg\s+curry$/i], id: 'egg_curry', unitWeightG: 200 },

  // Grains & Staples
  { patterns: [/^(?:plain\s+)?rotis?$/i, /^chapatis?$/i, /^phulkas?$/i], id: 'roti', unitWeightG: 30 },
  { patterns: [/^parathas?$/i], id: 'paratha', unitWeightG: 100 },
  { patterns: [/^aloo\s+parathas?$/i], id: 'aloo_paratha', unitWeightG: 120 },
  { patterns: [/^paneer\s+parathas?$/i], id: 'paneer_paratha', unitWeightG: 140 },
  { patterns: [/^(?:cooked\s+|white\s+|steamed\s+)?rice$/i, /^chawal$/i], id: 'rice', unitWeightG: 200 },
  { patterns: [/^(?:dry\s+|raw\s+|rolled\s+)oats?$/i], id: 'oats_dry', unitWeightG: 40 },
  { patterns: [/^cooked\s+oats?$/i, /^oats\s+cooked$/i], id: 'oats_plain', unitWeightG: 200 },
  { patterns: [/^oats?$/i, /^oatmeal$/i], id: 'oats_plain', unitWeightG: 40 },
  { patterns: [/^poha$/i], id: 'poha', unitWeightG: 150 },
  { patterns: [/^upma$/i], id: 'upma', unitWeightG: 150 },
  { patterns: [/^idlis?$/i], id: 'idli', unitWeightG: 50 },
  { patterns: [/^(?:plain\s+)?dosas?$/i], id: 'dosa', unitWeightG: 100 },
  { patterns: [/^masala\s+dosas?$/i], id: 'masala_dosa', unitWeightG: 150 },

  // Fruits
  { patterns: [/^(?:medium\s+)?bananas?$/i, /^kela$/i], id: 'banana', unitWeightG: 120 },
  { patterns: [/^(?:medium\s+)?apples?$/i, /^seb$/i], id: 'apple', unitWeightG: 150 },
  { patterns: [/^dates?$/i, /^khajoor$/i], id: 'dates', unitWeightG: 10 },
  { patterns: [/^oranges?$/i], id: 'orange', unitWeightG: 150 },
  { patterns: [/^mangos?$/i, /^mangoes?$/i, /^aam$/i], id: 'mango', unitWeightG: 200 },
  { patterns: [/^watermelons?$/i, /^tarbooz$/i], id: 'watermelon', unitWeightG: 300 },
  { patterns: [/^papayas?$/i], id: 'papaya', unitWeightG: 200 },
  { patterns: [/^guavas?$/i, /^amrood$/i], id: 'guava', unitWeightG: 100 },
  { patterns: [/^grapes?$/i, /^angoor$/i], id: 'grapes', unitWeightG: 100 },

  // Dairy & Protein
  { patterns: [/^(?:whole\s+)?milk$/i, /^doodh$/i], id: 'milk_whole', unitWeightG: 250 },
  { patterns: [/^skimmed\s+milk$/i], id: 'milk_skimmed', unitWeightG: 250 },
  { patterns: [/^(?:raw\s+)?paneer$/i], id: 'paneer_raw', unitWeightG: 100 },
  { patterns: [/^paneer\s+bhurji$/i], id: 'paneer_bhurji', unitWeightG: 150 },
  { patterns: [/^paneer\s+butter\s+masala$/i], id: 'paneer_butter_masala', unitWeightG: 200 },
  { patterns: [/^palak\s+paneer$/i], id: 'palak_paneer', unitWeightG: 200 },
  { patterns: [/^(?:grilled\s+)?chicken\s+breast$/i], id: 'chicken_breast', unitWeightG: 150 },
  { patterns: [/^chicken\s+curry$/i], id: 'chicken_curry', unitWeightG: 200 },
  { patterns: [/^chicken\s+biryani$/i], id: 'chicken_biryani', unitWeightG: 300 },
  { patterns: [/^(?:plain\s+)?curd$/i, /^dahi$/i], id: 'curd_plain', unitWeightG: 150 },
  { patterns: [/^greek\s+yogurt$/i], id: 'greek_yogurt', unitWeightG: 150 },
  { patterns: [/^whey(?:\s+protein)?(?:\s+powder)?$/i, /^1\s+scoop\s+whey$/i], id: 'whey_protein', unitWeightG: 30 },
  { patterns: [/^soya\s+chunks?$/i], id: 'soya_chunks_dry', unitWeightG: 50 },

  // Dals & Legumes
  { patterns: [/^(?:yellow\s+)?dal$/i, /^dal\s+tadka$/i], id: 'dal_tadka', unitWeightG: 200 },
  { patterns: [/^dal\s+makhani$/i], id: 'dal_makhani', unitWeightG: 200 },
  { patterns: [/^moong\s+dal$/i], id: 'moong_dal_cooked', unitWeightG: 150 },
  { patterns: [/^masoor\s+dal$/i], id: 'masoor_dal', unitWeightG: 200 },
  { patterns: [/^rajma$/i], id: 'rajma_cooked', unitWeightG: 150 },
  { patterns: [/^chole$/i, /^chana\s+masala$/i], id: 'chole_cooked', unitWeightG: 150 },

  // Beverages & Snacks
  { patterns: [/^chai$/i, /^tea$/i], id: 'chai', unitWeightG: 150 },
  { patterns: [/^coffee$/i, /^black\s+coffee$/i], id: 'black_coffee', unitWeightG: 150 },
  { patterns: [/^samosas?$/i], id: 'samosa', unitWeightG: 80 },
  { patterns: [/^vada\s+pav$/i], id: 'vada_pav', unitWeightG: 150 },
  { patterns: [/^makhana$/i, /^roasted\s+makhana$/i], id: 'makhana', unitWeightG: 30 },
  { patterns: [/^peanuts?$/i], id: 'peanuts', unitWeightG: 30 },
  { patterns: [/^almonds?$/i, /^badam$/i], id: 'almonds', unitWeightG: 30 },
  { patterns: [/^cashews?$/i, /^kaju$/i], id: 'cashews', unitWeightG: 30 },
];

/**
 * Resolves a food item by exact ID from the canonical food catalog.
 * @param {string} id
 * @returns {Object|null}
 */
export function getCanonicalFoodById(id) {
  if (!id) return null;
  return ALL_CANONICAL_FOODS.find((f) => f.id === id) || null;
}

/**
 * Searches canonical foods by exact name, slug, alias, or substring.
 * Returns best match and candidate alternatives.
 *
 * @param {string} rawName
 * @param {Object} [options]
 * @param {'raw'|'cooked'|'dry'|'boiled'|'fried'|'roasted'} [options.preparationState]
 * @returns {{ food: Object, unitWeightG: number|null, candidates?: Array<Object> } | null}
 */
export function findCanonicalFood(rawName, options = {}) {
  if (!rawName || typeof rawName !== 'string') return null;
  const q = rawName.trim().toLowerCase().replace(/^(?:some|plate of|bowl of|katori of|cup of|glass of)\s+/i, '');

  // 1. Alias match
  for (const alias of FOOD_ALIASES_V2) {
    if (alias.patterns.some((p) => p.test(q))) {
      let match = ALL_CANONICAL_FOODS.find((f) => f.id === alias.id);
      if (options.preparationState && match) {
        const variant = PREPARATION_VARIANTS.find(
          (v) => (v.canonicalParentId === match.id || v.id === match.id) && v.preparationState === options.preparationState
        );
        if (variant) match = variant;
      }
      if (match) {
        const variants = ALL_CANONICAL_FOODS.filter(
          (f) => f.id === match.id || f.canonicalParentId === match.id || match.canonicalParentId === f.id
        );
        return { food: match, unitWeightG: alias.unitWeightG, candidates: variants };
      }
    }
  }

  // 1b. Global Alias Dictionary (USDA / CoFID synonyms & plurals)
  if (GLOBAL_ALIASES && GLOBAL_ALIASES[q]) {
    const aliasEntry = GLOBAL_ALIASES[q];
    const match = ALL_CANONICAL_FOODS.find((f) => f.id === aliasEntry.canonicalId);
    if (match) {
      return { food: match, unitWeightG: aliasEntry.unitWeightG || match.defaultServingG, candidates: [match] };
    }
  }

  // 2. Exact Name or ID match
  const exact = ALL_CANONICAL_FOODS.find(
    (f) => f.id.toLowerCase() === q || f.name.toLowerCase() === q
  );
  if (exact) {
    const variants = ALL_CANONICAL_FOODS.filter(
      (f) => f.id === exact.id || f.canonicalParentId === exact.id || exact.canonicalParentId === f.id
    );
    return { food: exact, unitWeightG: exact.defaultServingG, candidates: variants };
  }

  // 3. Substring match
  const matches = ALL_CANONICAL_FOODS.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      q.includes(f.name.toLowerCase()) ||
      f.id.toLowerCase().includes(q.replace(/\s+/g, '_'))
  );

  if (matches.length > 0) {
    if (options.preparationState) {
      const prepMatch = matches.find((m) => m.preparationState === options.preparationState);
      if (prepMatch) {
        return { food: prepMatch, unitWeightG: prepMatch.defaultServingG, candidates: matches };
      }
    }
    const top = matches[0];
    return { food: top, unitWeightG: top.defaultServingG, candidates: matches };
  }

  return null;
}
