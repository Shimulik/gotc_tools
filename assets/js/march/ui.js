globalThis.MS = globalThis.MS || {};

(function (MS) {
  "use strict";

  const D = MS.data;
  const E = MS.engine;
  const S = MS.store;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const STATE_KEY = "march.state.v1";

  const PREFERRED_ORDER = ["helmet", "chest", "pants", "boots", "ring", "weapon"];

  const DISPLAY_SLOTS = PREFERRED_ORDER.filter((s) => D.SLOTS.includes(s))
    .concat(D.SLOTS.filter((s) => !PREFERRED_ORDER.includes(s)));

  let state = null;
  let selection = new Set();
  let lastResult = null;

  function blankState() {
    const slots = {};
    D.SLOTS.forEach((slot) => { slots[slot] = []; });
    return {
      scenario: Object.keys(D.SITUATION_CONFIG)[0],
      bonuses: [],
      slots: slots,

      marchSize: "",

      baseLevel: D.LEVELS[D.LEVELS.length - 1],
      baseRarity: D.RARITIES[D.RARITIES.length - 1],

      buildId: null,
      nextId: 1
    };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY));
      if (!raw || !raw.slots) return blankState();
      const clean = blankState();
      if (D.SITUATION_CONFIG[raw.scenario]) clean.scenario = raw.scenario;
      if (typeof raw.marchSize === "string") clean.marchSize = raw.marchSize.slice(0, 24);

      if (D.LEVELS.indexOf(raw.baseLevel) !== -1) clean.baseLevel = raw.baseLevel;
      if (D.RARITIES.indexOf(raw.baseRarity) !== -1) clean.baseRarity = raw.baseRarity;

      if (typeof raw.buildId === "number" && isFinite(raw.buildId)) clean.buildId = raw.buildId;
      clean.bonuses = (Array.isArray(raw.bonuses) ? raw.bonuses : [])
        .filter((id) => D.BONUSES.some((b) => b.id === id));
      let nextId = 1;
      D.SLOTS.forEach((slot) => {
        const rows = Array.isArray(raw.slots[slot]) ? raw.slots[slot] : [];
        clean.slots[slot] = rows.filter((r) =>
          D.TEMPLATES[slot][r.templateIndex] &&
          r.templateIndex !== D.EMPTY_INDEX &&
          D.LEVELS[r.levelIndex] !== undefined &&
          D.RARITIES[r.rarityIndex] !== undefined
        ).map((r) => ({
          id: nextId++,
          templateIndex: r.templateIndex,
          levelIndex: r.levelIndex,
          rarityIndex: r.rarityIndex
        }));
      });
      clean.nextId = nextId;
      return clean;
    } catch (e) {
      return blankState();
    }
  }

  function persist() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {  }
  }

  const genId = () => state.nextId++;
  const inherent = () => D.bonusTotal(state.bonuses);
  const rowById = (id) => {
    for (const slot of D.SLOTS) {
      const row = state.slots[slot].find((r) => r.id === id);
      if (row) return { slot, row };
    }
    return null;
  };

  function levelButtons(picked, scope) {
    return `<div class="seg" role="radiogroup" aria-label="Level" data-seg="level" data-scope="${scope}">`
      + D.LEVELS.map((lvl, i) =>
          `<button type="button" class="seg-btn" data-level="${i}" role="radio"
                   aria-checked="${i === picked}">${lvl}</button>`).join("")
      + `</div>`;
  }

  function rarityDots(picked, scope) {
    return `<div class="seg dots" role="radiogroup" aria-label="Rarity" data-seg="rarity" data-scope="${scope}">`
      + D.RARITIES.map((name, i) =>
          `<button type="button" class="dot-btn" data-rarity="${i}" role="radio"
                   aria-checked="${i === picked}" style="--rar: var(--r-${name})"
                   title="${titleCase(name)}" aria-label="${titleCase(name)}">
             <span class="dot"></span>
           </button>`).join("")
      + `</div>`;
  }

  function pieceHtml(slot, row) {
    const tpl = D.TEMPLATES[slot][row.templateIndex] || { name: "Unknown" };
    const { label } = D.splitName(tpl.name);
    const img = D.pieceImage(slot, tpl.name);
    const ticked = selection.has(row.id);

    return `<div class="piece${ticked ? " ticked" : ""}"
                 data-id="${row.id}" data-slot="${slot}"
                 style="--rar: var(--r-${D.RARITIES[row.rarityIndex]})">
      <label class="piece-tick">
        <input type="checkbox" data-tick="${row.id}" ${ticked ? "checked" : ""}
               aria-label="Select ${esc(label)}">
        <span class="tick-box" aria-hidden="true"></span>
      </label>

      <button type="button" class="piece-face" data-swap="${row.id}"
              title="Change this piece" aria-label="Change ${esc(label)}">
        ${img ? `<img class="piece-img" src="${esc(img)}" alt="" loading="lazy" decoding="async">`
              : `<span class="piece-img is-empty" aria-hidden="true">+</span>`}
      </button>

      <!-- The name sits outside the button so the art can be its own tall
           column beside the stacked controls. It still swaps on click via the
           delegated data-swap handler; the button above is the keyboard route,
           so there is one tab stop rather than two for the same action. -->
      <span class="piece-name" data-swap="${row.id}">${esc(label)}</span>

      <div class="piece-controls">
        ${levelButtons(row.levelIndex, row.id)}
        ${rarityDots(row.rarityIndex, row.id)}
      </div>

      <button type="button" class="piece-remove" data-remove="${row.id}"
              aria-label="Remove ${esc(tpl.name)}"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    </div>`;
  }

  function renderSlots() {
    const box = $("msSlots");
    box.innerHTML = DISPLAY_SLOTS.map((slot) => {
      const rows = state.slots[slot];
      const allTicked = rows.length > 0 && rows.every((r) => selection.has(r.id));
      return `<section class="slot${rows.length ? "" : " bare"}" data-slot="${slot}">
        <header class="slot-head">
          <h3>${titleCase(slot)}</h3>
          <span class="slot-count">${rows.length || "none"}${rows.length ? " piece" + (rows.length === 1 ? "" : "s") : ""}</span>
          <span class="spacer"></span>
          ${rows.length ? `<button type="button" class="linky" data-slotpick="${slot}">
            ${allTicked ? "Deselect" : "Select"} all
          </button>` : ""}
          <button type="button" class="btn tiny" data-add="${slot}">+ Add</button>
        </header>
        <div class="pieces">${rows.length
          ? rows.map((r) => pieceHtml(slot, r)).join("")
          : `<p class="slot-bare">Nothing here. Counts as no bonus from this slot.</p>`}</div>
      </section>`;
    }).join("");
  }

  function sharedValue(key) {
    let found = -1;
    for (const id of selection) {
      const hit = rowById(id);
      if (!hit) continue;
      const v = hit.row[key];
      if (found === -1) found = v;
      else if (found !== v) return -1;
    }
    return found;
  }

  function renderBulkBar() {
    const bar = $("msBulk");
    const n = selection.size;
    bar.hidden = n === 0;
    if (!n) return;
    bar.innerHTML = `
      <span class="bulk-count">${n} piece${n === 1 ? "" : "s"} selected</span>
      <span class="bulk-group"><span class="bulk-label">Level</span>${levelButtons(sharedValue("levelIndex"), "bulk")}</span>
      <span class="bulk-group"><span class="bulk-label">Rarity</span>${rarityDots(sharedValue("rarityIndex"), "bulk")}</span>
      <span class="spacer"></span>
      <button type="button" class="btn ghost tiny" data-bulkclear>Clear</button>`;
  }

  function renderBuilder() {
    renderSlots();
    renderBulkBar();
    renderBonuses();
    $("msScenario").value = state.scenario;
  }

  function renderBonuses() {
    $("msBonuses").innerHTML = D.BONUSES.map((b) =>
      `<button type="button" class="pill" data-bonus="${esc(b.id)}"
               aria-pressed="${state.bonuses.indexOf(b.id) !== -1}">
         +${(b.value * 100).toFixed(2)}% ${esc(b.label)}
       </button>`).join("");
    $("msInherent").textContent = (inherent() * 100).toFixed(2) + "%";
  }

  function syncPiece(id) {
    const hit = rowById(id);
    const el = document.querySelector('.piece[data-id="' + id + '"]');
    if (!hit || !el) return;
    el.style.setProperty("--rar", "var(--r-" + D.RARITIES[hit.row.rarityIndex] + ")");
    el.querySelectorAll('[data-seg="level"] .seg-btn').forEach((b) => {
      b.setAttribute("aria-checked", Number(b.dataset.level) === hit.row.levelIndex);
    });
    el.querySelectorAll('[data-seg="rarity"] .dot-btn').forEach((b) => {
      b.setAttribute("aria-checked", Number(b.dataset.rarity) === hit.row.rarityIndex);
    });
  }

  function syncBulk() {
    const bar = $("msBulk");
    const n = selection.size;

    if (!n) { bar.hidden = true; bar.innerHTML = ""; return; }

    if (bar.hidden || !bar.firstChild) {
      bar.hidden = false;
      renderBulkBar();
      return;
    }
    bar.querySelector(".bulk-count").textContent =
      n + " piece" + (n === 1 ? "" : "s") + " selected";
    const level = sharedValue("levelIndex");
    const rarity = sharedValue("rarityIndex");
    bar.querySelectorAll('[data-seg="level"] .seg-btn').forEach((b) => {
      b.setAttribute("aria-checked", Number(b.dataset.level) === level);
    });
    bar.querySelectorAll('[data-seg="rarity"] .dot-btn').forEach((b) => {
      b.setAttribute("aria-checked", Number(b.dataset.rarity) === rarity);
    });
  }

  function syncSlotHead(slot) {
    const link = document.querySelector('[data-slotpick="' + slot + '"]');
    if (!link) return;
    const rows = state.slots[slot];
    const all = rows.length > 0 && rows.every((r) => selection.has(r.id));
    link.textContent = (all ? "Deselect" : "Select") + " all";
  }

  function setOn(ids, key, value) {
    ids.forEach((id) => {
      const hit = rowById(id);
      if (hit) hit.row[key] = value;
    });
    persist();
    ids.forEach(syncPiece);
    syncBulk();
  }

  function toggleTick(id, on) {
    if (on) selection.add(id); else selection.delete(id);
    const el = document.querySelector('.piece[data-id="' + id + '"]');
    if (el) el.classList.toggle("ticked", on);
    const hit = rowById(id);
    if (hit) syncSlotHead(hit.slot);
    syncBulk();
  }

  let picker = { slot: null, replacing: null, chosen: new Set() };

  function openPicker(slot, replacingId) {
    picker.slot = slot;
    picker.replacing = replacingId || null;
    picker.chosen.clear();
    $("msPickerTitle").textContent = (replacingId ? "Change " : "Add ") + slot;
    $("msPickerSearch").value = "";
    $("msPickerFoot").hidden = !!replacingId;
    renderPickerGrid("");
    syncPickerFoot();
    $("msPicker").showModal();
    $("msPickerSearch").focus();
  }

  function syncPickerFoot() {
    if (picker.replacing) return;
    const n = picker.chosen.size;
    $("msPickerCount").textContent = n
      ? n + " piece" + (n === 1 ? "" : "s") + " picked"
      : "Nothing picked yet";
    $("msPickerAdd").textContent = n ? "Add " + n : "Add";
    $("msPickerAdd").disabled = n === 0;
    $("msPickerNone").hidden = n === 0;
  }

  function matchesQuery(name, q) {
    if (!q) return true;
    const { season, label } = D.splitName(name);
    if (label.toLowerCase().includes(q)) return true;
    const s = season.toLowerCase();
    return s === q || s === "s" + q || s.slice(1) === q.replace(/^s/, "");
  }

  function renderPickerGrid(query) {
    const slot = picker.slot;
    const q = query.trim().toLowerCase();
    const hits = D.TEMPLATES[slot]
      .map((t, i) => ({ t, i }))
      .filter(({ i }) => i !== D.EMPTY_INDEX)
      .filter(({ t }) => matchesQuery(t.name, q));

    const multi = picker.replacing === null;

    $("msPickerGrid").innerHTML = hits.length
      ? hits.map(({ t, i }) => {
          const { season, label } = D.splitName(t.name);
          const img = D.pieceImage(slot, t.name);
          const on = multi && picker.chosen.has(i);
          return `<button type="button" class="pick${on ? " picked" : ""}" data-pick="${i}"
                          ${multi ? `aria-pressed="${on}"` : ""}>
            ${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">`
                  : `<span class="pick-empty" aria-hidden="true">?</span>`}
            <span class="pick-name">${esc(label)}</span>
            ${season ? `<span class="season-tag">${esc(season)}</span>` : ""}
            ${multi ? `<span class="pick-check" aria-hidden="true"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.4 8.4 3.1 3.1 6.1-6.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : ""}
          </button>`;
        }).join("")
      : `<p class="empty-note">Nothing matches that. Try a set name, or a season like “13”.</p>`;
  }

  function tapPiece(templateIndex) {
    if (picker.replacing !== null) {
      const hit = rowById(picker.replacing);
      if (hit) hit.row.templateIndex = templateIndex;
      persist();
      $("msPicker").close();
      renderBuilder();
      return;
    }

    if (picker.chosen.has(templateIndex)) picker.chosen.delete(templateIndex);
    else picker.chosen.add(templateIndex);

    const el = $("msPickerGrid").querySelector('[data-pick="' + templateIndex + '"]');
    if (el) {
      const on = picker.chosen.has(templateIndex);
      el.classList.toggle("picked", on);
      el.setAttribute("aria-pressed", on);
    }
    syncPickerFoot();
  }

  function baseLevelIndex() {
    const i = D.LEVELS.indexOf(state.baseLevel);
    return i === -1 ? D.LEVELS.length - 1 : i;
  }
  function baseRarityIndex() {
    const i = D.RARITIES.indexOf(state.baseRarity);
    return i === -1 ? D.RARITIES.length - 1 : i;
  }

  function addChosen() {
    const slot = picker.slot;
    const picks = Array.from(picker.chosen).sort((a, b) => a - b);
    if (!picks.length) return;

    const levelIndex = baseLevelIndex();
    const rarityIndex = baseRarityIndex();
    picks.forEach((templateIndex) => {
      state.slots[slot].push({
        id: genId(), templateIndex: templateIndex,
        levelIndex: levelIndex, rarityIndex: rarityIndex
      });
    });

    picker.chosen.clear();
    persist();
    $("msPicker").close();
    renderBuilder();
    MS.shell.toast(picks.length === 1
      ? "Piece added"
      : picks.length + " pieces added to " + slot);
  }

  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  function parseSize(text) {
    const raw = String(text == null ? "" : text).trim().toLowerCase().replace(/,/g, "");
    if (!raw) return null;
    const m = /^(\d*\.?\d+)\s*([kmb])?$/.exec(raw);
    if (!m) return null;
    const mult = { k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1;
    const n = parseFloat(m[1]) * mult;
    return isFinite(n) && n >= 0 ? n : null;
  }

  function gearHtml(combo) {
    return DISPLAY_SLOTS.map((slot) => {
      const meta = (combo.combo_meta && combo.combo_meta[slot]) || {};
      const name = combo.combo_names[slot];
      const bare = !name || name === D.EMPTY_NAME;
      const { label } = D.splitName(name);
      const img = D.pieceImage(slot, name);
      const rarity = D.RARITIES[meta.rarityIndex];
      const level = D.LEVELS[meta.levelIndex];

      if (bare) {
        return `<span class="gear bare" title="${esc(titleCase(slot))}: nothing">
          <span class="gear-empty" aria-hidden="true">-</span>
          <span class="gear-text">
            <span class="gear-slot">${esc(titleCase(slot))}</span>
            <span class="gear-name">none</span>
          </span>
        </span>`;
      }

      return `<span class="gear" style="--rar: var(--r-${esc(rarity || "poor")})"
                    title="${esc(titleCase(slot))}: ${esc(label)}, L${esc(level)} ${esc(rarity || "")}">
        ${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">`
              : `<span class="gear-empty" aria-hidden="true">?</span>`}
        <span class="gear-text">
          <span class="gear-slot">${esc(titleCase(slot))}</span>
          <span class="gear-name">${esc(label)}</span>
        </span>
        ${level !== undefined ? `<span class="gear-level">L${esc(level)}</span>` : ""}
      </span>`;
    }).join("");
  }

  function renderBands() {
    if (!lastResult || !lastResult.merged) return;

    const typed = parseSize($("msMarchSize").value);
    const size  = typed === null ? null : typed / (1 + inherent());
    const merged = lastResult.merged;

    const atIndex = size === null ? -1
      : merged.findIndex(([lo, hi]) => size >= lo && (!isFinite(hi) || size < hi));

    $("msOutput").innerHTML = merged.map(([lo, hi, combo], i) => {
      const range = isFinite(hi) ? `${fmt(lo)} to ${fmt(hi)}` : `${fmt(lo)} and above`;
      const here = i === atIndex;

      const projected = size === null ? null : combo.slope * size + combo.intercept;

      return `<div class="band${here ? " band-here" : ""}">
        <div class="band-head">
          ${here ? `<span class="band-flag">You are here</span>` : ""}
          <span class="band-range">${range}</span>
          <span class="band-meta">+${(combo.total_percent * 100).toFixed(2)}% · ${fmt(combo.total_flat)} flat</span>
        </div>
        ${projected === null ? "" : `<div class="band-yours${here ? " is-best" : ""}">
          <span class="yours-label">Your march with this gear</span>
          <span class="yours-value">${fmt(projected)}</span>
          <span class="yours-delta">+${fmt(projected - size)}</span>
        </div>`}
        <div class="band-gear">${gearHtml(combo)}</div>
      </div>`;
    }).join("");

    const note = $("msSizeNote");
    if (note) {
      if (size === null) {
        note.hidden = true;
      } else {
        note.hidden = false;
        note.textContent = atIndex === -1
          ? `A march of ${fmt(size)} falls outside every range below.`
          : `A march of ${fmt(size)} sits in range ${atIndex + 1} of ${merged.length}.`;
      }
    }
  }

  function run() {
    const result = E.solve({
      slots: state.slots, scenario: state.scenario, inherent: inherent()
    });
    lastResult = result;

    const out = $("msOutput");
    if (result.error === "empty-slot" || result.error === "empty-after-pruning") {
      out.innerHTML = `<div class="alert"><h3>Nothing to compare</h3>
        <p>${result.error === "empty-slot"
          ? `The <strong>${esc(result.slot)}</strong> slot has no pieces in it.`
          : `Every piece in <strong>${esc(result.slot)}</strong> was beaten outright by another one there.`}</p></div>`;

      $("msSizeBar").hidden = true;
      $("msResults").hidden = false;
      return;
    }

    const merged = result.merged;
    $("msSummary").textContent =
      `${merged.length} range${merged.length === 1 ? "" : "s"} · ${result.combos.length} combinations compared`;

    $("msSizeBar").hidden = false;
    renderBands();

    $("msResults").hidden = false;
    const box = $("msResults").getBoundingClientRect();
    if (box.top < 0 || box.top > (window.innerHeight || 800) * 0.7) {
      $("msResults").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
    }
  }

  let renamingId = null;

  function renderSaved() {
    const box = $("msSaved");
    const builds = S.list();
    if (!builds.length) {
      box.innerHTML = `<p class="empty-note">No saved builds yet. Name one above and it'll appear here.</p>`;
      return;
    }

    box.innerHTML = builds.map((b) => {
      if (b.id === renamingId) {
        return `<div class="saved renaming">
          <input type="text" class="rename-input" data-renameinput="${b.id}"
                 value="${esc(b.name)}" spellcheck="false" aria-label="Rename this build">
          <button type="button" class="btn primary tiny" data-renamesave="${b.id}">Rename</button>
          <button type="button" class="btn ghost tiny" data-renamecancel="1">Cancel</button>
        </div>`;
      }

      const open = b.id === state.buildId;
      const n = S.pieceCount(b);
      return `<div class="saved${open ? " is-open" : ""}">
        <div class="saved-main">
          <div class="saved-name">${esc(b.name)}${
            open ? ` <span class="open-tag">open</span>` : ""}</div>
          <div class="saved-meta">${esc(b.scenario)} · ${n} piece${n === 1 ? "" : "s"} · saved ${esc(b.date)}</div>
        </div>
        <button type="button" class="btn tiny" data-load="${b.id}">Load</button>
        <button type="button" class="btn ghost tiny" data-rename="${b.id}">Rename</button>
        <button type="button" class="btn ghost tiny danger" data-del="${b.id}">Delete</button>
      </div>`;
    }).join("");

    if (renamingId !== null) {
      const input = box.querySelector("[data-renameinput]");
      if (input) { input.focus(); input.select(); }
    }
  }

  function syncSaveBar() {
    const open = state.buildId === null ? null
      : S.list().find((b) => b.id === state.buildId) || null;

    if (!open && state.buildId !== null) { state.buildId = null; persist(); }

    $("msUpdateBtn").hidden = !open;
    $("msSaveBtn").textContent = open ? "Save as new" : "Save";
    $("msOpenBuild").hidden = !open;
    $("msSaveHint").hidden = !open;

    if (open) {
      $("msOpenBuild").textContent = "Editing “" + open.name + "”";
      $("msUpdateBtn").title = "Overwrite “" + open.name + "” with what you have here";
      $("msSaveHint").textContent =
        "Update overwrites “" + open.name + "”, including its name, if you change it above. "
        + "Save as new leaves it alone and stores a second build.";
    }
  }

  const currentBuild = () => ({
    scenario: state.scenario, bonuses: state.bonuses, slots: state.slots
  });

  function commitRename(id) {
    const input = $("msSaved").querySelector('[data-renameinput="' + id + '"]');
    if (!input) return;
    const name = input.value.trim();

    if (!name) { MS.shell.toast("A build needs a name"); input.focus(); return; }

    const clash = S.byName(name);
    if (clash && clash.id !== id) {
      MS.shell.toast("Another build is already called “" + clash.name + "”");
      input.focus(); input.select();
      return;
    }

    if (!S.rename(id, name)) { MS.shell.toast("That build could not be renamed"); return; }
    renamingId = null;

    if (state.buildId === id) $("msSaveName").value = name;
    syncSaveBar();
    renderSaved();
    MS.shell.toast("Renamed to “" + name + "”");
  }

  function setOpenBuild(id, name) {
    state.buildId = id;
    persist();
    if (name !== undefined) $("msSaveName").value = name;
    syncSaveBar();
    renderSaved();
  }

  function loadBuild(id) {
    const r = S.load(id);
    if (r.error) { MS.shell.toast("That build could not be opened"); return; }

    state.scenario = r.scenario;
    state.bonuses = r.bonuses;
    let nextId = 1;
    D.SLOTS.forEach((slot) => {
      state.slots[slot] = r.slots[slot].map((row) => ({ id: nextId++, ...row }));
    });
    state.nextId = nextId;
    selection.clear();
    persist();
    renderBuilder();

    setOpenBuild(id, r.build ? r.build.name : "");

    if (r.missing.length) {
      MS.shell.toast(`Loaded. ${r.missing.length} piece${r.missing.length > 1 ? "s are" : " is"} no longer in the game`);
    } else {
      MS.shell.toast("Build loaded");
    }
    $("msResults").hidden = true;
  }

  function shareNote(text, kind) {
    const el = $("msShareMsg");
    el.textContent = text || "";
    el.className = "hint" + (kind ? " " + kind : "");
  }

  async function refreshShareCode() {
    try {
      const code = await MS.share.encode(state, $("msSaveName").value.trim());
      $("msShareOut").value = code;
      $("msShareSize").textContent = code.length + " characters";
    } catch (e) {
      $("msShareOut").value = "";
      $("msShareSize").textContent = "";
      shareNote("Could not build a code: " + e.message, "bad");
    }
  }

  async function openShare() {
    $("msShareIn").value = "";
    shareNote("");
    await refreshShareCode();
    $("msShare").showModal();
  }

  function applyShared(r) {
    state.scenario = r.scenario;
    state.bonuses = r.bonuses;
    let nextId = 1;
    D.SLOTS.forEach((slot) => {
      state.slots[slot] = r.slots[slot].map((row) => ({ id: nextId++, ...row }));
    });
    state.nextId = nextId;
    selection.clear();
    persist();
    renderBuilder();
    $("msResults").hidden = true;

    const notes = [];
    if (r.missing.length) {
      notes.push(r.missing.length + " piece" + (r.missing.length > 1 ? "s are" : " is")
        + " not in this version: " + r.missing.map((m) => m.piece).join(", "));
    }
    if (r.unknownBonuses.length) {
      notes.push("unknown bonus" + (r.unknownBonuses.length > 1 ? "es" : "") + ": "
        + r.unknownBonuses.join(", "));
    }
    if (r.scenarioChanged) notes.push("that situation no longer exists, so it opened on the first one");

    if (notes.length) shareNote("Loaded, but " + notes.join("; ") + ".", "warn");
    else shareNote("Loaded.", "good");

    setOpenBuild(null, r.name || "");
  }

  function bindShare() {

    $("shareBtn").addEventListener("click", () => {
      if (document.body.dataset.tool === "march") openShare();
    });

    $("msShareClose").addEventListener("click", () => $("msShare").close());
    $("msShare").addEventListener("click", (e) => {
      if (e.target === $("msShare")) $("msShare").close();
    });

    $("msShareCopy").addEventListener("click", () => {
      const code = $("msShareOut").value;
      if (!code) return;
      const done = () => MS.shell.toast("Code copied");
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(done, done);
      } else {
        $("msShareOut").select();
        try { document.execCommand("copy"); done(); } catch (e) { MS.shell.toast("Copy failed"); }
      }
    });

    $("msShareApply").addEventListener("click", async () => {
      let r;
      try { r = await MS.share.decode($("msShareIn").value); }
      catch (e) { shareNote(e.message, "bad"); return; }
      applyShared(r);
      await refreshShareCode();
      MS.shell.toast("Build loaded");
    });

    $("msShareClear").addEventListener("click", () => {
      $("msShareIn").value = "";
      shareNote("");
    });
  }

  function bind() {

    $("msBuilder").addEventListener("click", (e) => {
      const t = e.target;
      const hit = (attr) => t.closest("[" + attr + "]");

      const seg = t.closest(".seg-btn, .dot-btn");
      if (seg) {
        const group = seg.closest("[data-seg]");
        const key = group.dataset.seg === "level" ? "levelIndex" : "rarityIndex";
        const value = Number(group.dataset.seg === "level" ? seg.dataset.level : seg.dataset.rarity);
        const scope = group.dataset.scope;
        setOn(scope === "bulk" ? Array.from(selection) : [Number(scope)], key, value);
        return;
      }

      const swap = hit("data-swap");
      if (swap) { const id = Number(swap.dataset.swap); openPicker(rowById(id).slot, id); return; }

      const remove = hit("data-remove");
      if (remove) {
        const id = Number(remove.dataset.remove);
        const found = rowById(id);
        if (found) {

          state.slots[found.slot] = state.slots[found.slot].filter((r) => r.id !== id);
          selection.delete(id);
          persist();
          renderBuilder();
        }
        return;
      }

      const bonus = hit("data-bonus");
      if (bonus) {
        const id = bonus.dataset.bonus;
        const at = state.bonuses.indexOf(id);
        if (at === -1) state.bonuses.push(id); else state.bonuses.splice(at, 1);
        persist();
        renderBonuses();
        return;
      }

      const add = hit("data-add");
      if (add) { openPicker(add.dataset.add, null); return; }

      const slotpick = hit("data-slotpick");
      if (slotpick) {
        const slot = slotpick.dataset.slotpick;
        const rows = state.slots[slot];
        const allTicked = rows.every((r) => selection.has(r.id));
        rows.forEach((r) => {
          if (allTicked) selection.delete(r.id); else selection.add(r.id);
          const el = document.querySelector('.piece[data-id="' + r.id + '"]');
          if (el) el.classList.toggle("ticked", !allTicked);
          const box = el && el.querySelector("[data-tick]");
          if (box) box.checked = !allTicked;
        });
        syncSlotHead(slot);
        syncBulk();
        return;
      }
    });

    $("msBuilder").addEventListener("change", (e) => {
      const tick = e.target.closest("[data-tick]");
      if (tick) toggleTick(Number(tick.dataset.tick), tick.checked);
    });

    $("msBulk").addEventListener("click", (e) => {
      const seg = e.target.closest(".seg-btn, .dot-btn");
      if (seg) {
        const group = seg.closest("[data-seg]");
        const key = group.dataset.seg === "level" ? "levelIndex" : "rarityIndex";
        const value = Number(group.dataset.seg === "level" ? seg.dataset.level : seg.dataset.rarity);
        setOn(Array.from(selection), key, value);
        return;
      }
      if (e.target.closest("[data-bulkclear]")) {
        selection.clear();
        document.querySelectorAll(".piece.ticked").forEach((el) => {
          el.classList.remove("ticked");
          const box = el.querySelector("[data-tick]");
          if (box) box.checked = false;
        });
        D.SLOTS.forEach(syncSlotHead);
        syncBulk();
      }
    });

    $("msScenario").addEventListener("change", () => {
      state.scenario = $("msScenario").value;
      persist();
    });

    $("msRun").addEventListener("click", run);

    $("msReset").addEventListener("click", () => {
      if (!confirm("Clear every piece and start a fresh build?\n\n"
                 + "Your saved builds are not touched.")) return;

      const keptSize = state.marchSize;
      const keptLevel = state.baseLevel;
      const keptRarity = state.baseRarity;
      state = blankState();
      state.marchSize = keptSize;
      state.baseLevel = keptLevel;
      state.baseRarity = keptRarity;
      selection.clear();
      persist();
      renderBuilder();

      $("msSaveName").value = "";
      renamingId = null;
      syncSaveBar();
      renderSaved();
      $("msResults").hidden = true;
      MS.shell.toast("Build cleared");
    });

    let searchTimer = null;
    $("msPickerSearch").addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderPickerGrid($("msPickerSearch").value), 100);
    });
    $("msPickerGrid").addEventListener("click", (e) => {
      const pick = e.target.closest("[data-pick]");
      if (pick) tapPiece(Number(pick.dataset.pick));
    });
    $("msPickerAdd").addEventListener("click", addChosen);
    $("msPickerNone").addEventListener("click", () => {
      picker.chosen.clear();
      $("msPickerGrid").querySelectorAll(".pick.picked").forEach((el) => {
        el.classList.remove("picked");
        el.setAttribute("aria-pressed", "false");
      });
      syncPickerFoot();
    });

    $("msPickerSearch").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && picker.replacing === null && picker.chosen.size) {
        e.preventDefault();
        addChosen();
      }
    });
    $("msPickerClose").addEventListener("click", () => $("msPicker").close());
    $("msPicker").addEventListener("click", (e) => {
      if (e.target === $("msPicker")) $("msPicker").close();
    });

    $("msMarchSize").addEventListener("input", () => {
      state.marchSize = $("msMarchSize").value.trim();
      persist();
      $("msSizeClear").hidden = !state.marchSize;
      renderBands();
    });
    $("msSizeClear").addEventListener("click", () => {
      $("msMarchSize").value = "";
      state.marchSize = "";
      persist();
      $("msSizeClear").hidden = true;
      renderBands();
      $("msMarchSize").focus();
    });

    const reportWriteError = (err) => {
      if (err === "no-name")      { MS.shell.toast("Give the build a name first"); return true; }
      if (err === "storage-full") { MS.shell.toast("This browser won't save any more builds"); return true; }
      if (err === "not-found")    { MS.shell.toast("That build is no longer there"); return true; }
      return false;
    };

    $("msSaveBtn").addEventListener("click", () => {
      const name = $("msSaveName").value.trim();
      if (!name) { MS.shell.toast("Give the build a name first"); return; }

      const clash = S.byName(name);
      if (clash) {
        if (!confirm(`A build called “${clash.name}” already exists.\n\n`
                   + `Replace it with what you have here?`)) return;
        const u = S.update(clash.id, currentBuild());
        if (reportWriteError(u.error)) return;
        setOpenBuild(clash.id, clash.name);
        MS.shell.toast("“" + clash.name + "” replaced");
        return;
      }

      const r = S.save(name, currentBuild());
      if (reportWriteError(r.error)) return;

      setOpenBuild(r.build.id, r.build.name);
      MS.shell.toast("Build saved");
    });

    $("msUpdateBtn").addEventListener("click", () => {
      if (state.buildId === null) return;
      const open = S.list().find((b) => b.id === state.buildId);
      if (!open) { syncSaveBar(); renderSaved(); MS.shell.toast("That build is no longer there"); return; }

      const name = $("msSaveName").value.trim();
      const renaming = name && name !== open.name;

      if (renaming) {
        const clash = S.byName(name);
        if (clash && clash.id !== open.id) {
          MS.shell.toast("Another build is already called “" + clash.name + "”");
          return;
        }
      }

      const r = S.update(open.id, currentBuild(), name);
      if (reportWriteError(r.error)) return;
      setOpenBuild(open.id, r.build.name);
      MS.shell.toast(renaming ? "Updated and renamed to “" + r.build.name + "”"
                              : "“" + r.build.name + "” updated");
    });

    $("msSaveName").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;

      (state.buildId !== null ? $("msUpdateBtn") : $("msSaveBtn")).click();
    });

    $("msSaved").addEventListener("click", (e) => {
      const load = e.target.closest("[data-load]");
      if (load) { renamingId = null; loadBuild(Number(load.dataset.load)); return; }

      const rename = e.target.closest("[data-rename]");
      if (rename) { renamingId = Number(rename.dataset.rename); renderSaved(); return; }

      const renameSave = e.target.closest("[data-renamesave]");
      if (renameSave) { commitRename(Number(renameSave.dataset.renamesave)); return; }

      if (e.target.closest("[data-renamecancel]")) { renamingId = null; renderSaved(); return; }

      const del = e.target.closest("[data-del]");
      if (del) {
        const id = Number(del.dataset.del);
        const build = S.list().find((b) => b.id === id);
        if (build && !confirm(`Delete “${build.name}”? This cannot be undone.`)) return;
        S.remove(id);
        renamingId = null;

        if (state.buildId === id) { state.buildId = null; persist(); }
        syncSaveBar();
        renderSaved();
        MS.shell.toast("Build deleted");
      }
    });

    $("msSaved").addEventListener("keydown", (e) => {
      const input = e.target.closest("[data-renameinput]");
      if (!input) return;
      if (e.key === "Enter")  { e.preventDefault(); commitRename(Number(input.dataset.renameinput)); }
      if (e.key === "Escape") { e.preventDefault(); renamingId = null; renderSaved(); }
    });
  }

  function bindOptions() {
    const level = $("msBaseLevel");
    const rarity = $("msBaseRarity");

    level.innerHTML = D.LEVELS
      .map((lvl) => `<option value="${esc(lvl)}">Level ${esc(lvl)}</option>`).join("");
    rarity.innerHTML = D.RARITIES
      .map((r) => `<option value="${esc(r)}">${esc(titleCase(r))}</option>`).join("");

    level.value = String(state.baseLevel);
    rarity.value = String(state.baseRarity);

    level.addEventListener("change", () => {
      const n = Number(level.value);
      if (D.LEVELS.indexOf(n) === -1) return;
      state.baseLevel = n;
      persist();
    });

    rarity.addEventListener("change", () => {
      if (D.RARITIES.indexOf(rarity.value) === -1) return;
      state.baseRarity = rarity.value;
      persist();
    });
  }

  function init() {
    state = loadState();

    $("msScenario").innerHTML = Object.keys(D.SITUATION_CONFIG)
      .map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join("");

    $("msMarchSize").value = state.marchSize || "";
    $("msSizeClear").hidden = !state.marchSize;

    bind();
    bindOptions();
    bindShare();
    renderBuilder();

    syncSaveBar();
    if (state.buildId !== null) {
      const open = S.list().find((b) => b.id === state.buildId);
      if (open) $("msSaveName").value = open.name;
    }
    renderSaved();
  }

  MS.ui = { init, run };
})(globalThis.MS);
