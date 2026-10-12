globalThis.MS = globalThis.MS || {};

(function (MS) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const TOOL_KEY = "site.tool.v1";
  const TOOLS = ["path", "march"];

  let toastTimer = null;
  function toast(message) {
    const node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2200);
  }

  let active = null;

  function showTool(which, remember) {
    const tool = TOOLS.indexOf(which) === -1 ? TOOLS[0] : which;
    if (tool === active) return;
    active = tool;

    TOOLS.forEach((t) => {
      const tab = $("tool-" + t);
      const panel = $("app-" + t);
      const on = t === tool;
      if (tab) {
        tab.classList.toggle("active", on);
        tab.setAttribute("aria-selected", on);
        tab.tabIndex = on ? 0 : -1;
      }
      if (panel) panel.hidden = !on;
    });

    document.body.dataset.tool = tool;

    if (drawerOpen()) {
      document.querySelectorAll(".tool-panel").forEach((p) => { p.inert = false; });
      const panel = $("app-" + tool);
      if (panel) panel.inert = true;
    }
    if (remember) { try { localStorage.setItem(TOOL_KEY, tool); } catch (e) {  } }

    if (tool === "march" && !MS.ui.ready) {
      MS.ui.init();
      MS.ui.ready = true;
    }
  }

  function savedTool() {
    try {
      const t = localStorage.getItem(TOOL_KEY);
      return TOOLS.indexOf(t) === -1 ? TOOLS[0] : t;
    } catch (e) { return TOOLS[0]; }
  }

  function activePanel() {
    return $("app-" + active) || document.querySelector(".tool-panel:not([hidden])");
  }

  function drawerOpen() { return !$("settingsDrawer").hidden; }

  function openDrawer() {
    if (drawerOpen()) return;
    const drawer = $("settingsDrawer");

    drawer.hidden = false;
    $("drawerScrim").hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    $("settingsBtn").setAttribute("aria-expanded", "true");

    void drawer.offsetWidth;
    document.body.classList.add("drawer-open");

    const panel = activePanel();
    if (panel) panel.inert = true;
    $("drawerClose").focus();
  }

  function closeDrawer() {
    if (!drawerOpen()) return;
    const drawer = $("settingsDrawer");

    document.body.classList.remove("drawer-open");
    drawer.setAttribute("aria-hidden", "true");
    $("settingsBtn").setAttribute("aria-expanded", "false");

    document.querySelectorAll(".tool-panel").forEach((p) => { p.inert = false; });

    const finish = () => { drawer.hidden = true; $("drawerScrim").hidden = true; };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else setTimeout(finish, 200);

    $("settingsBtn").focus();
  }

  function bindChrome() {
    $("settingsBtn").addEventListener("click", () => {
      drawerOpen() ? closeDrawer() : openDrawer();
    });
    $("drawerClose").addEventListener("click", closeDrawer);
    $("drawerScrim").addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawerOpen()) closeDrawer();
    });

    const help = $("helpDialog");
    $("helpBtn").addEventListener("click", () => help.showModal());
    $("helpClose").addEventListener("click", () => help.close());
    help.addEventListener("click", (e) => { if (e.target === help) help.close(); });
  }

  function init() {
    const tabs = TOOLS.map((t) => $("tool-" + t));
    tabs.forEach((tab, i) => {
      if (!tab) return;
      tab.addEventListener("click", () => showTool(TOOLS[i], true));
      tab.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (i + step + TOOLS.length) % TOOLS.length;
        showTool(TOOLS[next], true);
        tabs[next].focus();
      });
    });

    showTool(savedTool(), false);
    bindChrome();
  }

  MS.shell = { init, toast, showTool };
})(globalThis.MS);
