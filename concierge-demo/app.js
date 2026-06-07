/* ============================================================
   VenueVox Concierge Demo — Apex Social (vanilla JS)
   - Live engine: POST /api/concierge → model reply with a
     trailing `CAPTURE_STATE: {…}` line, parsed into the panel.
   - Graceful fallback if the endpoint is unreachable.
   - Mock data (packages / availability) is public display data;
     the system prompt + key live server-side in /api/concierge.
   ============================================================ */
(function () {
  "use strict";

  /* ----------------------------- mock data ----------------------------- */
  var VENUE = { name: "Apex Social", deposit: 50 };

  var PACKAGES = [
    { id: "starter", name: "Starter Bash", price: 249, headcount: "Up to 10 kids", popular: false,
      includes: ["1 lane · 2 hrs (or arcade cards)", "Pizza + drinks", "Party host"] },
    { id: "mega", name: "Mega Fun", price: 399, headcount: "10–20 kids", popular: true,
      includes: ["2 lanes", "Arcade cards", "Food + drinks", "Dedicated host", "Reserved table", "2.5 hrs"] },
    { id: "ultimate", name: "Ultimate Blowout", price: 649, headcount: "20–35 kids", popular: false,
      includes: ["Semi-private room", "Lanes + unlimited arcade", "Full food package", "Host", "Decorations", "3 hrs"] }
  ];

  var ADDONS = [
    { name: "Birthday cake setup", price: 45 },
    { name: "Extra 30 minutes", price: 75 },
    { name: "Laser-tag add-on", price: 120 },
    { name: "Private room upgrade", price: 120 },
    { name: "Goody bags", price: 25 }
  ];

  // Rolling availability constants — next 5 open days (Mondays closed), anchored to PT.
  // IMPORTANT: keep these constants + buildOpenDays() in sync with api/concierge.js
  // so the on-page strip and the chat agent always agree on which slots exist.
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var SLOT_TIMES = ["12:00pm", "2:00pm", "4:00pm", "6:00pm"];
  var BOOKED_BY_INDEX = [2, -1, 0, 1, 3]; // booked slot index per open-day index (-1 = none)

  var EMPTY_CAPTURE = {
    occasion: null, headcount: null, package: null, date: null, time: null,
    addOns: [], allergies: null, cakeDropoff: null, name: null, contact: null,
    depositStatus: "Not started"
  };

  var GREETING = "Thanks for reaching out to Apex Social! Happy to help you plan a party — what's the occasion, and roughly how many kids are you expecting?";

  var STARTERS = ["Plan a birthday party", "Can we bring a cake?", "Do we need a waiver?"];

  var FALLBACK_TEXT = "I'm having brief trouble reaching our booking system right now — apologies. Our team will follow up, and you can reach Apex Social directly in the meantime. Quick basics: party packages run $249–$649 by group size, a $50 deposit holds your date, and your own birthday cake is welcome (no cakeage). Mind trying that again in a moment?";

  /* ----------------------------- icons ----------------------------- */
  var ICON = {
    occasion: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M3 7h10v6H3z"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/><path d="M8 10v1"/></svg>',
    guests: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><circle cx="6" cy="6" r="2.2"/><path d="M2.5 13c0-1.8 1.5-3 3.5-3s3.5 1.2 3.5 3"/><circle cx="11.5" cy="5.5" r="1.8"/><path d="M10.5 13c0-1.5 1-2.5 2.5-2.5"/></svg>',
    package: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M2.5 5 L8 2.5 L13.5 5 L13.5 11 L8 13.5 L2.5 11 Z"/><path d="M2.5 5 L8 7.5 L13.5 5"/><path d="M8 7.5 V13.5"/></svg>',
    date: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><rect x="2.5" y="3.5" width="11" height="10" rx="1"/><path d="M2.5 6.5 H13.5"/><path d="M5.5 2 V4.5"/><path d="M10.5 2 V4.5"/></svg>',
    addon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M8 3 V13"/><path d="M3 8 H13"/></svg>',
    allergy: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M8 2 L14 13 H2 Z"/><path d="M8 6 V9"/><circle cx="8" cy="11" r=".5" fill="currentColor"/></svg>',
    cake: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M2.5 13.5 V8.5 H13.5 V13.5 Z"/><path d="M2.5 11 H13.5"/><path d="M8 5 V8.5"/><path d="M7 3.5 Q8 2.2 9 3.5"/></svg>',
    guest: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><circle cx="8" cy="5.5" r="2.5"/><path d="M3.5 13.5c0-2.2 2-3.6 4.5-3.6s4.5 1.4 4.5 3.6"/></svg>',
    contact: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><path d="M4 2.5 H6 L7 5.5 L5.5 6.5 a8 8 0 0 0 4 4 L10.5 9 L13.5 10 V12.5 a1 1 0 0 1-1 1 A11 11 0 0 1 3 4 a1 1 0 0 1 1-1.5"/></svg>',
    deposit: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><rect x="2.5" y="4.5" width="11" height="8" rx="1"/><path d="M2.5 7 H13.5"/><circle cx="11" cy="10" r="1"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M3 8.5 L6.5 12 L13 4.5"/></svg>',
    sparkle: '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"><path d="M6 1 L7 5 L11 6 L7 7 L6 11 L5 7 L1 6 L5 5 Z"/></svg>'
  };

  /* ----------------------------- state ----------------------------- */
  var messages = [];          // { role:'agent'|'guest'|'system', text, raw, ts }
  var capture = clone(EMPTY_CAPTURE);
  var loading = false;

  /* ----------------------------- dom refs ----------------------------- */
  var $body, $starters, $form, $input, $send, $capRows, $capMeta, $capToggle, $capToggleLabel, $capture, $reset, $pkg, $addonRow, $avail, $themeToggle;

  /* ----------------------------- helpers ----------------------------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(id) { return document.getElementById(id); }
  function track(event, props) { try { if (window.posthog) window.posthog.capture(event, props || {}); } catch (e) {} }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtText(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br/>");
  }
  function fmtTime() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    var hh = ((h + 11) % 12) + 1;
    return hh + ":" + (m < 10 ? "0" + m : m) + (h >= 12 ? " PM" : " AM");
  }
  function norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/\s+/g, ""); }

  function splitReply(raw) {
    var i = raw.lastIndexOf("CAPTURE_STATE:");
    if (i === -1) return { text: raw.trim(), capture: null };
    var text = raw.slice(0, i).trim();
    var cap = null;
    try { cap = JSON.parse(raw.slice(i + "CAPTURE_STATE:".length).trim()); } catch (e) { /* keep prior */ }
    return { text: text, capture: cap };
  }

  // Additive merge: fields only fill, never blank (keeps the panel from flickering empty).
  function mergeCapture(prev, next) {
    if (!next) return prev;
    var out = clone(prev);
    Object.keys(next).forEach(function (k) {
      var v = next[k];
      if (k === "addOns") { if (Array.isArray(v) && v.length) out.addOns = v; }
      else if (k === "depositStatus") { if (v) out.depositStatus = v; }
      else if (v !== null && v !== undefined && v !== "") out[k] = v;
    });
    return out;
  }

  /* ----------------------------- chat render ----------------------------- */
  function renderMessages() {
    var html = "";
    messages.forEach(function (m) {
      if (m.role === "system") {
        html += '<div class="bubble system">' + esc(m.text) + "</div>";
        return;
      }
      var who = m.role === "agent" ? "A" : "You";
      html += '<div class="row ' + m.role + '">' +
        '<div class="av ' + m.role + '">' + who + "</div>" +
        '<div><div class="bubble ' + m.role + '">' + fmtText(m.text) + "</div>" +
        '<div class="ts mono">' + esc(m.ts) + "</div></div></div>";
    });
    if (loading) {
      html += '<div class="row agent"><div class="av agent">A</div>' +
        '<div class="typing" aria-label="Concierge is typing"><i></i><i></i><i></i></div></div>';
    }
    $body.innerHTML = html;
    $body.scrollTop = $body.scrollHeight;
  }

  /* ----------------------------- capture render ----------------------------- */
  function renderCapture() {
    var dateTime = [capture.date, capture.time].filter(Boolean).join(" · ");
    var addons = (capture.addOns && capture.addOns.length) ? capture.addOns.join(", ") : "";
    var rows = [
      { label: "Occasion", icon: "occasion", val: capture.occasion },
      { label: "Headcount", icon: "guests", val: capture.headcount },
      { label: "Package", icon: "package", val: capture.package },
      { label: "Date / Time", icon: "date", val: dateTime },
      { label: "Add-ons", icon: "addon", val: addons },
      { label: "Allergies", icon: "allergy", val: capture.allergies },
      { label: "Cake drop-off", icon: "cake", val: capture.cakeDropoff },
      { label: "Guest", icon: "guest", val: capture.name },
      { label: "Contact", icon: "contact", val: capture.contact }
    ];
    var depositPending = capture.depositStatus && capture.depositStatus !== "Not started";
    var filled = rows.filter(function (r) { return r.val; }).length + (depositPending ? 1 : 0);
    var total = rows.length + 1;

    var html = "";
    rows.forEach(function (r) {
      html += '<div class="cap-row' + (r.val ? " filled" : "") + '">' +
        '<span class="cap-icon">' + ICON[r.icon] + "</span>" +
        '<span class="cap-label">' + r.label + "</span>" +
        '<span class="cap-val' + (r.val ? "" : " empty") + '">' + (r.val ? esc(r.val) : "—") + "</span></div>";
    });
    // deposit row
    html += '<div class="cap-row' + (depositPending ? " filled" : "") + '">' +
      '<span class="cap-icon">' + ICON.deposit + "</span>" +
      '<span class="cap-label">Deposit</span>' +
      '<span class="cap-val" style="text-align:right">' +
      (depositPending
        ? '<span class="dep-chip pending"><span class="d"></span>' + esc(capture.depositStatus) + "</span>"
        : '<span class="dep-chip not-started"><span class="d"></span>Not started</span>') +
      "</span></div>";

    $capRows.innerHTML = html;
    $capMeta.textContent = filled + "/" + total;
    $capToggleLabel.textContent = "Booking Capture · " + filled + "/" + total + " filled";
  }

  /* ----------------------------- packages render ----------------------------- */
  function renderPackages() {
    var html = "";
    PACKAGES.forEach(function (p) {
      html += '<article class="pkg' + (p.popular ? " popular" : "") + '">' +
        (p.popular ? '<span class="ribbon">Most popular</span>' : "") +
        '<h3 class="pkg-name">' + esc(p.name) + "</h3>" +
        '<div class="pkg-price"><span class="v num">$' + p.price + '</span><span class="u">flat</span></div>' +
        '<div class="pkg-min mono">' + esc(p.headcount) + "</div><ul>";
      p.includes.forEach(function (inc) {
        html += "<li>" + ICON.check + "<span>" + esc(inc) + "</span></li>";
      });
      html += "</ul><button class=\"pkg-cta\" data-pkg=\"" + esc(p.name) + "\">Plan a party on this →</button></article>";
    });
    $pkg.innerHTML = html;

    var arow = '<span class="lbl">Add-ons</span>';
    ADDONS.forEach(function (a) {
      arow += '<span class="chip">' + esc(a.name) + ' <span class="price">· $' + a.price + "</span></span>";
    });
    $addonRow.innerHTML = arow;

    Array.prototype.forEach.call($pkg.querySelectorAll(".pkg-cta"), function (btn) {
      btn.addEventListener("click", function () {
        sendTurn("I'd like to book the " + btn.getAttribute("data-pkg") + " package — what's next?", "package");
      });
    });
  }

  /* ----------------------------- availability render ----------------------------- */
  function ptParts(date) {
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });
    var o = {};
    fmt.formatToParts(date).forEach(function (p) { if (p.type !== "literal") o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day };
  }
  function buildOpenDays(count) {
    var t = ptParts(new Date());
    var base = new Date(Date.UTC(t.y, t.m - 1, t.d, 12)); // noon UTC carrier — DST-safe
    var days = [];
    while (days.length < count) {
      var dow = base.getUTCDay();
      if (dow !== 1) { // closed Monday
        var bookedSlot = BOOKED_BY_INDEX[days.length % BOOKED_BY_INDEX.length];
        days.push({
          date: DOW[dow] + " " + MON[base.getUTCMonth()] + " " + base.getUTCDate(),
          slots: SLOT_TIMES.map(function (tm, si) { return { time: tm, status: si === bookedSlot ? "booked" : "open" }; })
        });
      }
      base.setUTCDate(base.getUTCDate() + 1);
    }
    return days;
  }

  function renderAvailability() {
    var html = "";
    buildOpenDays(5).forEach(function (day) {
      var parts = day.date.split(" ");
      var name = parts[0];
      var dlabel = parts.slice(1).join(" ");
      var dayCaptured = norm(capture.date) === norm(day.date);
      html += '<div class="day' + (dayCaptured ? " captured" : "") + '">' +
        '<div class="day-head"><div class="day-name">' + esc(name) + '</div>' +
        '<div class="day-date">' + esc(dlabel) + "</div></div><div class=\"slots\">";
      day.slots.forEach(function (sl) {
        var isCap = dayCaptured && norm(capture.time) === norm(sl.time);
        var cls = isCap ? "slot captured" : "slot " + sl.status;
        html += '<button class="' + cls + '" data-date="' + esc(day.date) + '" data-time="' + esc(sl.time) +
          '" data-status="' + sl.status + '"' + (sl.status === "booked" ? " disabled" : "") + ">" + esc(sl.time) + "</button>";
      });
      html += "</div></div>";
    });
    $avail.innerHTML = html;

    Array.prototype.forEach.call($avail.querySelectorAll(".slot"), function (btn) {
      if (btn.getAttribute("data-status") === "booked") return;
      btn.addEventListener("click", function () {
        sendTurn("Can we do " + btn.getAttribute("data-date") + " at " + btn.getAttribute("data-time") + "?", "slot");
      });
    });
  }

  /* ----------------------------- starters ----------------------------- */
  function renderStarters() {
    var html = "";
    STARTERS.forEach(function (s) {
      html += '<button class="starter" data-text="' + esc(s) + '">' + ICON.sparkle + esc(s) + "</button>";
    });
    $starters.innerHTML = html;
    Array.prototype.forEach.call($starters.querySelectorAll(".starter"), function (btn) {
      btn.addEventListener("click", function () { sendTurn(btn.getAttribute("data-text"), "starter"); });
    });
  }

  function setStartersDisabled(d) {
    Array.prototype.forEach.call($starters.querySelectorAll(".starter"), function (b) { b.disabled = d; });
  }

  /* ----------------------------- engine ----------------------------- */
  function buildHistory() {
    var hist = messages
      .filter(function (m) { return m.role === "agent" || m.role === "guest"; })
      .map(function (m) {
        return { role: m.role === "agent" ? "assistant" : "user", content: m.role === "agent" ? (m.raw || m.text) : m.text };
      });
    // Anthropic requires the conversation to begin with a user turn.
    while (hist.length && hist[0].role === "assistant") hist.shift();
    return hist;
  }

  function accessCode() {
    try { return sessionStorage.getItem("vv-concierge-access") || ""; } catch (e) { return ""; }
  }

  async function callConcierge(history) {
    var headers = { "content-type": "application/json" };
    var code = accessCode();
    if (code) headers["x-demo-access"] = code;
    var res = await fetch("/api/concierge", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ messages: history })
    });
    if (res.status === 401) { var e = new Error("access"); e.code = "access"; throw e; }
    if (!res.ok) throw new Error("status " + res.status);
    var data = await res.json();
    if (!data || !data.reply) throw new Error("empty reply");
    return data.reply;
  }

  function sendTurn(text, source) {
    if (loading) return;
    var t = String(text || "").trim();
    if (!t) return;
    track("concierge_message_sent", { source: source || "input" });
    messages.push({ role: "guest", text: t, raw: t, ts: fmtTime() });
    renderMessages();
    scrollToChat();
    runConcierge();
  }

  async function runConcierge() {
    loading = true;
    setInputDisabled(true);
    renderMessages();
    try {
      var reply = await callConcierge(buildHistory());
      var parsed = splitReply(reply);
      messages.push({ role: "agent", text: parsed.text || "…", raw: reply, ts: fmtTime() });
      var prevPkg = capture.package, prevSlot = !!(capture.date && capture.time), prevDep = capture.depositStatus;
      capture = mergeCapture(capture, parsed.capture);
      track("concierge_reply_received", {});
      if (!prevPkg && capture.package) track("concierge_package_selected", { package: capture.package });
      if (!prevSlot && capture.date && capture.time) track("concierge_slot_selected", { date: capture.date, time: capture.time });
      if (prevDep !== "Pending (demo)" && capture.depositStatus === "Pending (demo)") track("concierge_deposit_reached", {});
    } catch (err) {
      if (err && err.code === "access") {
        track("concierge_reply_failed", { reason: "access" });
        messages.push({ role: "system", text: "🔒 This demo is access-protected. Open it with the access link you were sent (it includes ?access=…).", ts: fmtTime() });
      } else {
        track("concierge_reply_failed", { reason: "error" });
        messages.push({ role: "agent", text: FALLBACK_TEXT, raw: null, ts: fmtTime() });
      }
    } finally {
      loading = false;
      setInputDisabled(false);
      renderMessages();
      renderCapture();
      renderAvailability();
      if ($input) $input.focus();
    }
  }

  function setInputDisabled(d) {
    $input.disabled = d;
    $send.disabled = d || !$input.value.trim();
    setStartersDisabled(d);
  }

  /* ----------------------------- misc ui ----------------------------- */
  function scrollToChat() {
    var stage = document.querySelector(".stage");
    if (!stage) return;
    var top = stage.getBoundingClientRect().top + window.scrollY - 72;
    if (window.scrollY > top + 40 || window.scrollY < top - 200) {
      window.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  function resetDemo() {
    capture = clone(EMPTY_CAPTURE);
    messages = [{ role: "agent", text: GREETING, raw: GREETING + "\nCAPTURE_STATE: " + JSON.stringify(EMPTY_CAPTURE), ts: fmtTime() }];
    loading = false;
    renderMessages();
    renderCapture();
    renderAvailability();
  }

  function initTheme() {
    var saved;
    try { saved = localStorage.getItem("vv-concierge-theme"); } catch (e) {}
    if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
    $themeToggle.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("vv-concierge-theme", next); } catch (e) {}
      track("concierge_theme_toggled", { theme: next });
    });
  }

  /* ----------------------------- init ----------------------------- */
  // Pull an access code from ?access=… into sessionStorage, then strip it
  // from the visible URL (keeps the code out of the address bar).
  function initAccess() {
    try {
      var url = new URL(window.location.href);
      var a = url.searchParams.get("access");
      if (a) {
        sessionStorage.setItem("vv-concierge-access", a);
        url.searchParams.delete("access");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
      }
    } catch (e) {}
  }

  function init() {
    $body = $("chatBody"); $starters = $("starters"); $form = $("chatForm");
    $input = $("chatInput"); $send = $("chatSend"); $capRows = $("capRows");
    $capMeta = $("capMeta"); $capToggle = $("capToggle"); $capToggleLabel = $("capToggleLabel");
    $capture = $("capture"); $reset = $("capReset"); $pkg = $("pkgGrid");
    $addonRow = $("addonRow"); $avail = $("availGrid"); $themeToggle = $("themeToggle");

    initAccess();
    initTheme();
    if (window.posthog && window.posthog.register) window.posthog.register({ surface: "concierge-demo", venue: "Apex Social" });
    renderStarters();
    renderPackages();
    resetDemo();

    $form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = $input.value;
      $input.value = "";
      $send.disabled = true;
      sendTurn(v, "input");
    });
    $input.addEventListener("input", function () { $send.disabled = loading || !$input.value.trim(); });
    $send.disabled = true;

    $reset.addEventListener("click", function () { track("concierge_demo_reset", {}); resetDemo(); });

    $capToggle.addEventListener("click", function () {
      var collapsed = $capture.classList.toggle("collapsed");
      $capToggle.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
