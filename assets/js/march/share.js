globalThis.MS = globalThis.MS || {};

(function (MS) {
  "use strict";

  const D = MS.data;
  const PREFIX     = "MSB1.";
  const PREFIX_ZIP = "MSB1Z.";

  function toB64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromB64url(text) {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  const canZip   = typeof CompressionStream !== "undefined";
  const canUnzip = typeof DecompressionStream !== "undefined";

  async function through(stream, bytes) {
    const piped = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(piped).arrayBuffer());
  }

  function pack(state, name) {
    const encoded = MS.store.encodeSlots(state.slots);
    const slots = {};
    D.SLOTS.forEach((slot) => {
      slots[slot] = (encoded[slot] || []).map((r) => [r.piece, r.level, r.rarity]);
    });
    return {
      v: 1,
      n: name || "",
      sc: state.scenario,
      b: (state.bonuses || []).slice(),
      s: slots
    };
  }

  function unpack(payload) {
    const slots = {};
    D.SLOTS.forEach((slot) => {
      const rows = Array.isArray(payload.s && payload.s[slot]) ? payload.s[slot] : [];
      slots[slot] = rows
        .filter((r) => Array.isArray(r) && r.length >= 3)
        .map((r) => ({ piece: String(r[0]), level: r[1], rarity: String(r[2]) }));
    });

    const decoded = MS.store.decodeSlots(slots);

    const asked = Array.isArray(payload.b) ? payload.b.map(String) : [];
    const known = new Set(D.BONUSES.map((b) => b.id));
    const bonuses = asked.filter((id) => known.has(id));
    const unknownBonuses = asked.filter((id) => !known.has(id));

    const scenario = D.SITUATION_CONFIG[payload.sc]
      ? payload.sc
      : Object.keys(D.SITUATION_CONFIG)[0];

    return {
      name: String(payload.n || ""),
      scenario: scenario,
      scenarioChanged: scenario !== payload.sc,
      bonuses: bonuses,
      slots: decoded.slots,
      missing: decoded.missing,
      unknownBonuses: unknownBonuses
    };
  }

  async function encode(state, name) {
    const json = JSON.stringify(pack(state, name));
    const bytes = new TextEncoder().encode(json);

    if (canZip) {
      try {
        const zipped = await through(new CompressionStream("deflate"), bytes);

        if (zipped.length < bytes.length) return PREFIX_ZIP + toB64url(zipped);
      } catch (e) {  }
    }
    return PREFIX + toB64url(bytes);
  }

  async function decode(raw) {
    const code = String(raw || "").trim().replace(/\s+/g, "");
    if (!code) throw new Error("Paste a code first.");

    let body, zipped;
    if (code.indexOf(PREFIX_ZIP) === 0)  { body = code.slice(PREFIX_ZIP.length); zipped = true; }
    else if (code.indexOf(PREFIX) === 0) { body = code.slice(PREFIX.length);     zipped = false; }
    else throw new Error("That doesn't look like a build code. They start with MSB1.");

    if (zipped && !canUnzip) {
      throw new Error("This browser can't read compressed codes. Open it in a newer browser.");
    }

    let bytes;
    try {
      bytes = fromB64url(body);
      if (zipped) bytes = await through(new DecompressionStream("deflate"), bytes);
    } catch (e) {
      throw new Error("That code is damaged. It may have been cut short when copied.");
    }

    let payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw new Error("That code is damaged. It may have been cut short when copied.");
    }
    if (!payload || typeof payload !== "object") throw new Error("That code is empty.");
    if (Number(payload.v) > 1) {
      throw new Error("That code was made by a newer version. Reload the page and try again.");
    }

    return unpack(payload);
  }

  MS.share = { encode, decode, canZip };
})(globalThis.MS);
