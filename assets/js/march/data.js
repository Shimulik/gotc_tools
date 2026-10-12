globalThis.MS = globalThis.MS || {};

(function (MS) {
  "use strict";

  const SLOTS = ["helmet", "weapon", "chest", "ring", "pants", "boots"];

  const IMAGE_DIR = "assets/img/pieces/";

const LEVELS   = [40, 45, 50];
const RARITIES = ["poor","common","fine","exquisite","epic","legendary"];

const SLOT_ICONS = { helmet:"", weapon:"", chest:"", ring:"", pants:"", boots:"" };

const SITUATION_CONFIG = {
  "vs SOP":              { flat_keys: ["base","vs SOP","vs P"],          percent_keys: ["Percent"] },
  "vs SOP with Drag":    { flat_keys: ["base","Dragon","vs SOP","vs P"], percent_keys: ["Percent"] },
  "vs Player":           { flat_keys: ["base","vs P"],                   percent_keys: ["Percent"] },
  "vs Player with Drag": { flat_keys: ["base","Dragon","vs P"],          percent_keys: ["Percent"] },
  "Rein":                { flat_keys: ["base","Rein"],                   percent_keys: ["Percent"] },
  "Rein with Drag":      { flat_keys: ["base","Rein","Dragon"],          percent_keys: ["Percent"] }
};

const MATRICES = {
  base_105: [
    [1456,1560,1664,1769,1873,2081],
    [1616,1732,1847,1963,2078,2309],
    [1776,1903,2030,2157,2284,2538]
  ],
  base_10: [
    [2913,3121,3329,3538,3746,4162],
    [3233,3464,3695,3926,4157,4619],
    [3553,3807,4060,4314,4568,5076]
  ],
  base_11: [
    [3496,3746,3995,4245,4495,4994],
    [3880,4157,4434,4711,4988,5543],
    [4263,4568,4873,5177,5482,6091]
  ],
  base_12: [
    [4195,4495,4795,5094,5394,5993],
    [4656,4988,5321,5654,5986,6651],
    [5116,5482,5847,6213,6578,7309]
  ],
  base_13: [
    [5034,5394,5754,6113,6473,7192],
    [5587,5986,6385,6784,7183,7982],
    [6140,6578,7017,7455,7894,8771]
  ],
  base_14: [
    [6041,6473,6905,7336,7768,8631],
    [6705,7183,7662,8141,8620,9578],
    [7368,7894,8420,8947,9473,10525]
  ],
  base_145: [
    [3020,3236,3452,3668,3884,4315],
    [3352,3591,3831,4070,4310,4789],
    [3684,3947,4210,4473,4736,5262]
  ],
  drag_10: [
    [5827,6243,6659,7076,7492,8324],
    [6467,6928,7390,7852,8314,9238],
    [7106,7614,8121,8629,9137,10152]
  ],
  drag_115: [
    [3496,3746,3995,4245,4495,4994],
    [3880,4157,4434,4711,4988,5543],
    [4263,4568,4873,5177,5482,6091]
  ],
  drag_12: [
    [8391,8990,9590,10189,10789,11987],
    [9312,9977,10642,11308,11973,13303],
    [10233,10964,11695,12426,13157,14619]
  ],
  drag_125: [
    [4195,4495,4795,5094,5394,5993],
    [4656,4988,5321,5654,5986,6651],
    [5116,5482,5847,6213,6578,7309]
  ],
  drag_13: [
    [10069,10789,11508,12227,12946,14385],
    [11175,11973,12771,13569,14367,15964],
    [12280,13157,14034,14911,15788,17543]
  ],
  drag_135: [
    [5034,5394,5754,6113,6473,7192],
    [5587,5986,6385,6784,7183,7982],
    [6140,6578,7017,7455,7894,8771]
    ],
  percent_11: [
    [0.0233097854976,0.024974770176,0.0266397548544,0.0283047395328,0.0299697242112,0.033299693568],
    [0.0258681765888,0.027715903488,0.0295636303872,0.0314113572864,0.0332590841856,0.036954537984],
    [0.02842656768,0.0304570368,0.03248750592,0.03451797504,0.03654844416,0.0406093824]
  ],
  percent_115: [
    [0.0116548927488,0.012487385088,0.0133198774272,0.0141523697664,0.0149848621056,0.016649846784],
    [0.0129340882944,0.013857951744,0.0147818151936,0.0157056786432,0.0166295420928,0.018477268992],
    [0.01421328384,0.0152285184,0.01624375296,0.01725898752,0.01827422208,0.0203046912]
  ],
  percent_12: [
    [0.02797174259712,0.0299697242112,0.03196770582528,0.03396568743936,0.03596366905344,0.0399596322816],
    [0.03104181190656,0.0332590841856,0.03547635646464,0.03769362874368,0.03991090102272,0.0443454455808],
    [0.034111881216,0.03654844416,0.038985007104,0.041421570048,0.043858132992,0.04873125888]
  ],
  percent_125: [
    [0.01398587129856,0.0149848621056,0.01598385291264,0.01698284371968,0.01798183452672,0.0199798161408],
    [0.01552090595328,0.0166295420928,0.01773817823232,0.01884681437184,0.01995545051136,0.0221727227904],
    [0.017055940608,0.01827422208,0.019492503552,0.020710785024,0.021929066496,0.02436562944]
  ],
  percent_13: [
    [0.033566091116544,0.03596366905344,0.038361246990336,0.040758824927232,0.043156402864128,0.04795155873792],
    [0.037250174287872,0.03991090102272,0.042571627757568,0.045232354492416,0.047893081227264,0.05321453469696],
    [0.0409342574592,0.043858132992,0.0467820085248,0.0497058840576,0.0526297595904,0.058477510656]
  ],
  percent_135: [
      [0.016783045558272,0.01798183452672,0.019180623495168,0.020379412463616,0.021578201432064,0.02397577936896],
      [0.018625087143936,0.01995545051136,0.021285813878784,0.022616177246208,0.023946540613632,0.02660726734848],
      [0.0204671287296,0.021929066496,0.0233910042624,0.0248529420288,0.0263148797952,0.029238755328]
  ],
  percent_14: [
    [0.0402793093398528,0.043156402864128,0.0460334963884032,0.0489105899126784,0.0517876834369536,0.057541870485504],
    [0.0447002091454464,0.047893081227264,0.0510859533090816,0.0542788253908992,0.0574716974727168,0.063857441636352],
    [0.04912110895104,0.0526297595904,0.05613841022976,0.05964706086912,0.06315571150848,0.0701730127872]
  ],
  percent_145: [
    [0.0201396546699264,0.021578201432064,0.0230167481942016,0.0244552949563392,0.0258938417184768,0.028770935242752],
    [0.0223501045727232,0.023946540613632,0.0255429766545408,0.0271394126954496,0.0287358487363584,0.031928720818176],
    [0.02456055447552,0.0263148797952,0.02806920511488,0.02982353043456,0.03157785575424,0.0350865063936]
  ],
  rein_11: [
    [5244,5619,5993,6368,6743,7492],
    [5820,6236,6651,7067,7483,8314],
    [6395,6852,7309,7766,8223,9137]
  ],
  rein_12: [
    [6293,6743,7192,7642,8091,8990],
    [6984,7483,7982,8481,8979,9977],
    [7675,8223,8771,9319,9868,10964]
  ],
  rein_13: [
    [7552,8091,8631,9170,9710,10789],
    [8381,8979,9578,10177,10775,11973],
    [9210,9868,10525,11183,11841,13157]
  ],
  sop_10: [
    [4370,4682,4994,5307,5619,6243],
    [4850,5196,5543,5889,6236,6928],
    [5329,5710,6091,6472,6852,7614]
  ],
  sop_11: [
    [5244,5619,5993,6368,6743,7492],
    [5820,6236,6651,7067,7483,8314],
    [6395,6852,7309,7766,8223,9137]
  ],
  sop_12: [
    [6293,6743,7192,7642,8091,8990],
    [6984,7483,7982,8481,8979,9977],
    [7675,8223,8771,9319,9868,10964]
  ],
  sop_13: [
    [7552,8091,8631,9170,9710,10789],
    [8381,8979,9578,10177,10775,11973],
    [9210,9868,10525,11183,11841,13157]
  ],
  vp_10: [
    [4370,4682,4994,5307,5619,6243],
    [4850,5196,5543,5889,6236,6928],
    [5329,5710,6091,6472,6852,7614]
  ]
};

const TEMPLATES = {
    helmet: [
        {name: "Empty",                             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Free Folk",                    mapping: {base: null,              "vs P": null,             Percent: "percent_145",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Dragonseed",                   mapping: {base: null,              "vs P": null,             Percent: "percent_145",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Lion of the West",             mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Sparrow",                      mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Dothraki",                     mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_135",    "vs SOP": "sop_13",          Rein: null}},
        {name: "13 | Hedge Knight",                 mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Laughing Baratheon",           mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Valorous Kingsguard",          mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Sun Dornish",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: "rein_12"}},
        {name: "12 | Golden Rose",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: "drag_12",     "vs SOP": null,              Rein: null}},
        {name: "12 | Frost Thenn",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_12",          Rein: null}},
        {name: "12 | Dragonflame",                  mapping: {base: null,              "vs P": null,             Percent: "percent_125",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Chilled Corsair",              mapping: {base: null,              "vs P": null,             Percent: "percent_125",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Bur Usurper",                  mapping: {base: null,              "vs P": null,             Percent: "percent_125",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Lit Lannister",                mapping: {base: null,              "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: "rein_11"}},
        {name: "11 | KoF",                          mapping: {base: null,              "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Greenfyre",                    mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_11",          Rein: null}},
        {name: "11 | Frostbitten",                  mapping: {base: "base_11",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Flame Reaver",                 mapping: {base: "base_11",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Umber",                        mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Tourney Herald",               mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | QM",                           mapping: {base: "base_10",         "vs P": "vp_10",          Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Fishmonger",                   mapping: {base: "base_105",        "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Drag Heiress",                 mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_10",          Rein: null}},
    ],
    chest: [
        {name: "Empty",                             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Free Folk",                    mapping: {base: null,              "vs P": null,             Percent: "percent_14",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Dragonseed",                   mapping: {base: null,              "vs P": null,             Percent: "percent_14",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Lion of the West",             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_13",          Rein: null}},
        {name: "13 | Sparrow",                      mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Dothraki",                     mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_135",    "vs SOP": "sop_13",          Rein: null}},
        {name: "13 | Hedge Knight",                 mapping: {base: null,              "vs P": null,             Percent: "percent_135",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Laughing Baratheon",           mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Valorous Kingsguard",          mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Sun Dornish",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: "rein_12"}},
        {name: "12 | Golden Rose",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_125",    "vs SOP": null,              Rein: null}},
        {name: "12 | Frost Thenn",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Dragonflame",                  mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Chilled Corsair",              mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Bur Usurper",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Lit Lannister",                mapping: {base: "base_11",         "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | KoF",                          mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Greenfyre",                    mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: "drag_115",    "vs SOP": null,              Rein: null}},
        {name: "11 | Frostbitten",                  mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Flame Reaver",                 mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Umber",                        mapping: {base: "base_105",        "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Tourney Herald",               mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Stag Lord",                    mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_10",     "vs SOP": null,              Rein: null}},
        {name: "10 | QM",                           mapping: {base: "base_10",         "vs P": "vp_10",          Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
    ],
    pants: [
        {name: "Empty",                             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Free Folk",                    mapping: {base: "base_145",        "vs P": null,             Percent: "percent_14",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Dragonseed",                   mapping: {base: null,              "vs P": null,             Percent: "percent_145",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Lion of the West",             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_13",          Rein: null}},
        {name: "13 | Sparrow",                      mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: "rein_13"}},
        {name: "13 | Dothraki",                     mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: "drag_13",     "vs SOP": null,              Rein: null}},
        {name: "13 | Hedge Knight",                 mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Laughing Baratheon",           mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Valorous Kingsguard",          mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Sun Dornish",                  mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Golden Rose",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_125",    "vs SOP": null,              Rein: null}},
        {name: "12 | Frost Thenn",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Dragonflame",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Chilled Corsair",              mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Bur Usurper",                  mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Lit Lannister",                mapping: {base: null,              "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: "rein_11"}},
        {name: "11 | KoF",                          mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Greenfyre",                    mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: "drag_115",    "vs SOP": null,              Rein: null}},
        {name: "11 | Frostbitten",                  mapping: {base: null,              "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Flame Reaver",                 mapping: {base: null,              "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Umber",                        mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | QM",                           mapping: {base: "base_10",         "vs P": "vp_10",          Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Fishmonger",                   mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
    ],
    boots: [
        {name: "Empty",                             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Free Folk",                    mapping: {base: "base_14",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Dragonseed",                   mapping: {base: "base_14",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Lion of the West",             mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Sparrow",                      mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Dothraki",                     mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: "drag_13",     "vs SOP": null,              Rein: null}},
        {name: "13 | Hedge Knight",                 mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Laughing Baratheon",           mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Valorous Kingsguard",          mapping: {base: "base_13",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Sun Dornish",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: "rein_12"}},
        {name: "12 | Golden Rose",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: "drag_12",     "vs SOP": null,              Rein: null}},
        {name: "12 | Frost Thenn",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_12",          Rein: null}},
        {name: "12 | Dragonflame",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Chilled Corsair",              mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Bur Usurper",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Lit Lannister",                mapping: {base: null,              "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: "rein_11"}},
        {name: "11 | KoF",                          mapping: {base: "base_11",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Greenfyre",                    mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_11",          Rein: null}},
        {name: "11 | Frostbitten",                  mapping: {base: "base_11",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Flame Reaver",                 mapping: {base: "base_11",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Umber",                        mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Tourney Herald",               mapping: {base: "base_105",        "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Stag Lord",                    mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_10",     "vs SOP": null,              Rein: null}},
        {name: "10 | QM",                           mapping: {base: "base_10",         "vs P": "vp_10",          Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Fishmonger",                   mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Drag Heiress",                 mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_10",          Rein: null}}
    ],
    ring: [
        {name: "Empty",                             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Free Folk",                    mapping: {base: null,              "vs P": null,             Percent: "percent_14",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Dragonseed",                   mapping: {base: null,              "vs P": null,             Percent: "percent_14",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Lion of the West",             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_13",          Rein: null}},
        {name: "13 | Sparrow",                      mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: "rein_13"}},
        {name: "13 | Dothraki",                     mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_135",    "vs SOP": "sop_13",          Rein: null}},
        {name: "13 | Hedge Knight",                 mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Laughing Baratheon",           mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Valorous Kingsguard",          mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Sun Dornish",                  mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Golden Rose",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: "drag_12",     "vs SOP": null,              Rein: null}},
        {name: "12 | Frost Thenn",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_12",          Rein: null}},
        {name: "12 | Dragonflame",                  mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Chilled Corsair",              mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Bur Usurper",                  mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Lit Lannister",                mapping: {base: "base_11",         "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | KoF",                          mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Greenfyre",                    mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_11",          Rein: null}},
        {name: "11 | Frostbitten",                  mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Flame Reaver",                 mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Tourney Herald",               mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Stag Lord",                    mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_10",     "vs SOP": null,              Rein: null}},
        {name: "10 | QM",                           mapping: {base: "base_10",         "vs P": "vp_10",          Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Fishmonger",                   mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
    ],
    weapon: [
        {name: "Empty",                             mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Free Folk",                    mapping: {base: null,              "vs P": null,             Percent: "percent_145",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "14 | Dragonseed",                   mapping: {base: "base_145",        "vs P": null,             Percent: "percent_14",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Lion of the West",             mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Sparrow",                      mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: "rein_13"}},
        {name: "13 | Dothraki",                     mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: "drag_13",     "vs SOP": null,              Rein: null}},
        {name: "13 | Hedge Knight",                 mapping: {base: null,              "vs P": null,             Percent: "percent_13",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Laughing Baratheon",           mapping: {base: null,              "vs P": null,             Percent: "percent_135",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "13 | Valorous Kingsguard",          mapping: {base: null,              "vs P": null,             Percent: "percent_135",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Sun Dornish",                  mapping: {base: "base_12",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Golden Rose",                  mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_125",    "vs SOP": null,              Rein: null}},
        {name: "12 | Frost Thenn",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Dragonflame",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Chilled Corsair",              mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "12 | Bur Usurper",                  mapping: {base: null,              "vs P": null,             Percent: "percent_12",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Lit Lannister",                mapping: {base: "base_11",         "vs P": null,             Percent: "percent_115",             Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | KoF",                          mapping: {base: "base_11",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Greenfyre",                    mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: "drag_115",    "vs SOP": null,              Rein: null}},
        {name: "11 | Frostbitten",                  mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "11 | Flame Reaver",                 mapping: {base: null,              "vs P": null,             Percent: "percent_11",              Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Umber",                        mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Tourney Herald",               mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Stag Lord",                    mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: "drag_10",     "vs SOP": null,              Rein: null}},
        {name: "10 | QM",                           mapping: {base: "base_10",         "vs P": "vp_10",          Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Fishmonger",                   mapping: {base: "base_10",         "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": null,              Rein: null}},
        {name: "10 | Drag Heiress",                 mapping: {base: null,              "vs P": null,             Percent: null,                      Dragon: null,          "vs SOP": "sop_10",          Rein: null}},
    ]
};

  function setNameToSlug(pieceName) {
    const stripped = String(pieceName).replace(/^\d+\s*\|\s*/, "").trim();
    return stripped.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  function pieceImage(slot, pieceName) {
    if (!pieceName || pieceName === EMPTY_NAME) return "";
    return IMAGE_DIR + slot + "/" + setNameToSlug(pieceName) + ".png";
  }

  function splitName(name) {
    const m = /^(\d+)\s*\|\s*(.+)$/.exec(String(name));
    return m ? { season: "S" + m[1], label: m[2].trim() }
             : { season: "", label: String(name) };
  }

  const BONUSES = [
    { id: "keep", label: "Keep", value: 0.08 },
    { id: "waif", label: "Waif", value: 0.0656 }
  ];

  function bonusTotal(ids) {
    const on = new Set(ids || []);
    return BONUSES.reduce((t, b) => t + (on.has(b.id) ? b.value : 0), 0);
  }

  const EMPTY_NAME = "Empty";
  const EMPTY_INDEX = 0;

  MS.data = {
    LEVELS, RARITIES, SLOTS, SLOT_ICONS,
    SITUATION_CONFIG, MATRICES, TEMPLATES,
    EMPTY_NAME, EMPTY_INDEX, BONUSES, bonusTotal,
    setNameToSlug, pieceImage, splitName
  };
})(globalThis.MS);
