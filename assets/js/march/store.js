globalThis.MS = globalThis.MS || {};

(function (MS) {
  "use strict";

  const D = MS.data;

  const KEY = "march.builds.v1";
  const VERSION = 1;

  function canPersist() {
    try {
      localStorage.setItem("__ms__", "1");
      localStorage.removeItem("__ms__");
      return true;
    } catch (e) { return false; }
  }

  function readRaw() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }

  function writeRaw(builds) {
    try { localStorage.setItem(KEY, JSON.stringify(builds)); return true; }
    catch (e) { return false; }
  }

  function encodeSlots(slots) {
    const out = {};
    D.SLOTS.forEach((slot) => {
      out[slot] = (slots[slot] || []).map((row) => {
        const template = D.TEMPLATES[slot][row.templateIndex];
        return template ? {
          piece:  template.name,
          level:  D.LEVELS[row.levelIndex],
          rarity: D.RARITIES[row.rarityIndex]
        } : null;
      }).filter(Boolean);
    });
    return out;
  }

  function decodeSlots(saved) {
    const out = {};
    const missing = [];

    D.SLOTS.forEach((slot) => {
      const rows = [];
      (saved && saved[slot] ? saved[slot] : []).forEach((row) => {
        const templateIndex = D.TEMPLATES[slot].findIndex((t) => t.name === row.piece);
        if (templateIndex === -1) {
          missing.push({ slot: slot, piece: String(row.piece) });
          return;
        }

        let levelIndex = D.LEVELS.indexOf(Number(row.level));
        if (levelIndex === -1) levelIndex = D.LEVELS.length - 1;
        let rarityIndex = D.RARITIES.indexOf(String(row.rarity));
        if (rarityIndex === -1) rarityIndex = D.RARITIES.length - 1;

        rows.push({ templateIndex, levelIndex, rarityIndex });
      });

      out[slot] = rows;
    });

    return { slots: out, missing: missing };
  }

  function list() {
    return readRaw().filter(Boolean).slice().reverse();
  }

  function save(name, current) {
    const clean = String(name || "").trim();
    if (!clean) return { error: "no-name" };

    const builds = readRaw();
    const build = {
      v: VERSION,
      id: Date.now(),
      name: clean,
      date: new Date().toLocaleDateString(),
      scenario: current.scenario,
      bonuses: (current.bonuses || []).slice(),
      slots: encodeSlots(current.slots || {})
    };
    builds.push(build);
    if (!writeRaw(builds)) return { error: "storage-full" };
    return { build: build };
  }

  function load(id) {
    const build = readRaw().find((b) => b && b.id === id);
    if (!build) return { error: "not-found" };

    const decoded = decodeSlots(build.slots);
    return {
      build: build,
      scenario: D.SITUATION_CONFIG[build.scenario] ? build.scenario
                                                   : Object.keys(D.SITUATION_CONFIG)[0],

      bonuses: (Array.isArray(build.bonuses) ? build.bonuses : [])
                 .filter((id) => D.BONUSES.some((b) => b.id === id)),
      slots: decoded.slots,
      missing: decoded.missing
    };
  }

  function update(id, current, name) {
    const builds = readRaw();
    const b = builds.find((x) => x && x.id === id);
    if (!b) return { error: "not-found" };

    const clean = String(name == null ? "" : name).trim();
    if (clean) b.name = clean;
    b.scenario = current.scenario;
    b.bonuses  = (current.bonuses || []).slice();
    b.slots    = encodeSlots(current.slots || {});
    b.date     = new Date().toLocaleDateString();

    if (!writeRaw(builds)) return { error: "storage-full" };
    return { build: b };
  }

  function remove(id) {
    writeRaw(readRaw().filter((b) => b && b.id !== id));
  }

  function rename(id, name) {
    const clean = String(name || "").trim();
    if (!clean) return false;
    const builds = readRaw();
    const b = builds.find((x) => x && x.id === id);
    if (!b) return false;
    b.name = clean;
    return writeRaw(builds);
  }

  function byName(name) {
    const clean = String(name || "").trim().toLowerCase();
    if (!clean) return null;
    return readRaw().find((b) => b && String(b.name).trim().toLowerCase() === clean) || null;
  }

  function pieceCount(build) {
    if (!build || !build.slots) return 0;
    return D.SLOTS.reduce((n, slot) =>
      n + (Array.isArray(build.slots[slot]) ? build.slots[slot].length : 0), 0);
  }

  function exportAll() {
    return JSON.stringify({ format: "march-builds", v: VERSION, builds: readRaw() }, null, 2);
  }

  MS.store = {
    KEY, VERSION,
    canPersist: canPersist(),
    list, save, load, update, remove, rename, byName, pieceCount, exportAll,
    encodeSlots, decodeSlots
  };
})(globalThis.MS);
