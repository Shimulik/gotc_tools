globalThis.MS = globalThis.MS || {};

(function (MS) {
  "use strict";

  const D = MS.data;

  function buildPiece(template, levelIndex, rarityIndex) {
    const stats = {};
    for (const key of ["base", "Dragon", "vs SOP", "Rein", "Percent", "vs P"]) {
      const matId = template.mapping[key];
      stats[key] = (matId && D.MATRICES[matId])
        ? (D.MATRICES[matId][levelIndex]?.[rarityIndex] || 0)
        : 0;
    }
    return { name: template.name, levelIndex, rarityIndex, stats };
  }

  function removeDominated(pieces, cfg) {
    if (!pieces || pieces.length === 0) return [];
    const statList = pieces.map((piece) => ({
      piece,
      flat:    cfg.flat_keys.reduce((a, k) => a + (piece.stats[k] || 0), 0),
      percent: cfg.percent_keys.reduce((a, k) => a + (piece.stats[k] || 0), 0)
    }));
    return statList
      .filter(({ flat: fi, percent: pei }, i) =>
        !statList.some(({ flat: fj, percent: pej }, j) =>
          i !== j && fj >= fi && pej >= pei && (fj > fi || pej > pei)
        )
      )
      .map((x) => x.piece);
  }

  function prune(runtimeSlots, cfg) {
    const pruned = {};
    for (const slot of Object.keys(runtimeSlots)) {
      pruned[slot] = removeDominated(runtimeSlots[slot], cfg);
    }
    return pruned;
  }

  function comboStats(combination, cfg, inherent) {
    let totalFlat = 0, totalPercent = 0;
    for (const piece of combination) {
      for (const k of cfg.flat_keys)    totalFlat    += piece.stats[k] || 0;
      for (const k of cfg.percent_keys) totalPercent += piece.stats[k] || 0;
    }
    totalPercent += inherent;
    return {
      slope: 1 + totalPercent,
      intercept: totalFlat * (1 + totalPercent),
      totalFlat,
      totalPercent
    };
  }

  function cartesian(arrays) {
    if (!arrays || arrays.length === 0) return [[]];
    return arrays.reduce((acc, arr) => {
      const out = [];
      for (const prefix of acc) for (const item of arr) out.push([...prefix, item]);
      return out;
    }, [[]]);
  }

  function allCombinations(slotsMap, cfg, inherent, slotOrder) {
    const lists = slotOrder.map((s) => slotsMap[s] || []);
    if (lists.some((l) => l.length === 0)) return [];
    return cartesian(lists).map((combination) => {

      const combo_names = {};
      const combo_meta = {};
      slotOrder.forEach((slot, i) => {
        const piece = combination[i];
        combo_names[slot] = piece.name;
        combo_meta[slot] = {
          name: piece.name,
          levelIndex: piece.levelIndex,
          rarityIndex: piece.rarityIndex
        };
      });
      const s = comboStats(combination, cfg, inherent);
      return {
        combo: combination, combo_names, combo_meta,
        slope: s.slope, intercept: s.intercept,
        total_flat: s.totalFlat, total_percent: s.totalPercent
      };
    });
  }

  function intersections(combos, eps = 1e-9) {
    const candidates = new Set([0]);
    for (let i = 0; i < combos.length; i++) {
      for (let j = i + 1; j < combos.length; j++) {
        const dm = combos[i].slope - combos[j].slope;
        if (Math.abs(dm) < eps) continue;
        const x = (combos[j].intercept - combos[i].intercept) / dm;
        if (x >= 0 && isFinite(x)) candidates.add(x);
      }
    }
    return Array.from(candidates).sort((a, b) => a - b);
  }

  function optimalIntervals(combos, candidates) {
    if (!combos || combos.length === 0) return [];
    return candidates.map((xLower, idx) => {
      const xUpper = idx < candidates.length - 1 ? candidates[idx + 1] : Infinity;
      const testX = isFinite(xUpper) ? (xLower + xUpper) / 2 : xLower + 100;
      let best = null, bestVal = -Infinity;
      for (const combo of combos) {
        const val = combo.slope * testX + combo.intercept;
        if (val > bestVal) { bestVal = val; best = combo; }
      }
      return best ? [xLower, xUpper, best] : null;
    }).filter(Boolean);
  }

  function mergeIntervals(intervals, eps = 1e-6) {
    if (!intervals || intervals.length === 0) return [];
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const [prevMin, prevMax, prevCombo] = merged[merged.length - 1];
      const [curMin, curMax, curCombo] = intervals[i];
      if (JSON.stringify(prevCombo.combo_names) === JSON.stringify(curCombo.combo_names) &&
          Math.abs(curMin - prevMax) < eps) {
        merged[merged.length - 1] = [prevMin, curMax, prevCombo];
      } else {
        merged.push(intervals[i]);
      }
    }
    return merged;
  }

  function buildRuntimeSlots(slots) {
    const runtime = {};
    for (const slot of D.SLOTS) {
      const rows = slots[slot] || [];

      runtime[slot] = rows.length
        ? rows.map((row) => buildPiece(D.TEMPLATES[slot][row.templateIndex],
                                       row.levelIndex, row.rarityIndex))
        : [buildPiece(D.TEMPLATES[slot][D.EMPTY_INDEX], 0, 0)];
    }
    return runtime;
  }

  function solve(options) {
    const slots    = options.slots;
    const scenario = options.scenario;
    const inherent = options.inherent || 0;
    const cfg      = D.SITUATION_CONFIG[scenario];

    if (!cfg) return { error: "unknown-scenario", scenario: scenario };

    const pruned = prune(buildRuntimeSlots(slots), cfg);
    for (const slot of D.SLOTS) {
      if (!pruned[slot] || pruned[slot].length === 0) {
        return { error: "empty-after-pruning", slot: slot };
      }
    }

    const combos     = allCombinations(pruned, cfg, inherent, D.SLOTS);
    const candidates = intersections(combos);
    const merged     = mergeIntervals(optimalIntervals(combos, candidates));

    return { merged, combos, candidates, pruned };
  }

  MS.engine = {
    buildPiece, removeDominated, prune, comboStats, cartesian,
    allCombinations, intersections, optimalIntervals, mergeIntervals,
    buildRuntimeSlots, solve
  };
})(globalThis.MS);
