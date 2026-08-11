/* ============================================================================
   BIOLOGY ENTELLOQ — SIGN IN WITH GOOGLE.

   Identity only. Signing in gives the product your name and your face; it does
   NOT move your work anywhere. Every bit of progress this product keeps — what
   you have opened, what you got wrong, where you left off — stays in this
   browser's localStorage exactly as it did before, because there is no server
   behind this product to sync it to. Saying so plainly in the UI matters more
   than the feature does: an account that looks like it is backing your work up,
   and isn't, is worse than no account at all.

   Google Identity Services, no SDK bundled — the one <script> is fetched from
   Google on demand, and only when someone actually asks to sign in.

   CONFIGURATION. GIS needs an OAuth Client ID authorised for the exact origin it
   runs on. Set BIOQ_GOOGLE_CLIENT_ID below, or paste one into the panel this
   module renders (kept in localStorage under `bioq_gid_client`), which is how a
   client ID can be swapped without a rebuild. With none set, the control still
   appears and explains what is missing rather than silently doing nothing.

   SELF-INSTALLING, like the Living Field: it injects its own CSS and mounts into
   any [data-bioq-account] host on the page. A page without one shows nothing.
   ========================================================================== */
(function () {
  "use strict";
  if (window.BIOQ_AUTH) return;

  // The OAuth Client ID. Public by design — it identifies the app to Google and is
  // visible in every page that ships, which is fine and expected for a browser
  // client. The client SECRET that Google issues alongside it is NOT used here and
  // must never appear in this file: browser sign-in exchanges nothing, so there is
  // nothing for a secret to protect, and this repository is public.
  var BIOQ_GOOGLE_CLIENT_ID = "939725315910-4dplo09o8pj8n4jruihj1k6bqe3qf8fu.apps.googleusercontent.com";

  var K_USER = "bioq_user", K_CID = "bioq_gid_client";
  var GIS = "https://accounts.google.com/gsi/client";
  // GIS refuses to run from file:// — there is no origin for Google to authorise.
  var FILE = location.protocol === "file:";

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  }
  function cid() { return (ls(K_CID) || "").trim() || BIOQ_GOOGLE_CLIENT_ID || ""; }
  function user() {
    try { var u = JSON.parse(ls(K_USER) || "null"); return (u && u.n) ? u : null; } catch (e) { return null; }
  }

  var subs = [];
  function emit() { var u = user(); subs.forEach(function (f) { try { f(u); } catch (e) {} }); render(); }
  function save(u) { ls(K_USER, JSON.stringify(u)); emit(); }

  /* --- the token ---------------------------------------------------------- */
  // A Google ID token is a JWT: header.payload.signature. Only the payload is
  // read, and only for a display name and picture. It is NEVER sent anywhere —
  // there is no server to send it to — so it is not stored either.
  function decode(tok) {
    try {
      var p = tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(p))));
    } catch (e) { return null; }
  }
  function onCred(resp) {
    var p = resp && resp.credential ? decode(resp.credential) : null;
    if (!p || !p.email) return;
    save({ n: p.name || p.email.split("@")[0], e: p.email, pic: p.picture || "", at: Date.now() });
    close();
  }

  var ready = false, loading = false, pending = [];
  function load(cb) {
    if (!cid() || FILE) return;
    if (ready) { if (cb) cb(); return; }
    if (cb) pending.push(cb);
    if (loading) return;
    loading = true;
    var s = document.createElement("script");
    s.src = GIS; s.async = true; s.defer = true;
    s.onload = function () {
      try {
        google.accounts.id.initialize({
          client_id: cid(), callback: onCred,
          auto_select: false, cancel_on_tap_outside: true,
        });
        ready = true;
        pending.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
      } catch (e) { loading = false; }
    };
    s.onerror = function () { loading = false; note("Could not reach Google. Check the connection and try again."); };
    document.head.appendChild(s);
  }

  function signOut() {
    try { if (ready && window.google) google.accounts.id.disableAutoSelect(); } catch (e) {}
    ls(K_USER, null);
    emit();
  }

  /* --- styles ------------------------------------------------------------- */
  var css = document.createElement("style");
  css.id = "auth-css";
  css.textContent =
    ".bq-acct{position:relative;display:flex}" +
    ".bq-acct>button{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border-radius:11px;" +
      "border:1px solid var(--line,rgba(255,255,255,.08));color:var(--dim,#9fb2bc);cursor:pointer;" +
      "font:inherit;font-size:13px;transition:color .2s,border-color .2s,background .2s;text-align:left}" +
    ".bq-acct>button:hover{color:var(--ink,#eaf2f5);border-color:var(--hair,rgba(255,255,255,.12))}" +
    ".bq-avatar{width:22px;height:22px;border-radius:50%;flex:none;object-fit:cover;" +
      "background:color-mix(in srgb,var(--em,#34d399) 22%,transparent);display:grid;place-items:center;" +
      "font-size:10px;font-weight:700;color:var(--em,#34d399)}" +
    ".bq-acct .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}" +
    // Anchored to the RIGHT edge, not the left. This control lives at the right end
    // of a top bar on some pages and full-width in a sidebar on others; left:0 sent
    // the panel straight off the side of a phone (measured: 126px of horizontal
    // overflow at 390px wide, which dragged the whole page sideways). Right-anchored
    // it stays inside on both, and the width is clamped to the viewport rather than
    // to a vw fraction so the gutters survive at any size.
    ".bq-pop{position:absolute;bottom:calc(100% + 8px);right:0;left:auto;" +
      "width:min(300px,calc(100vw - 28px));max-width:calc(100vw - 28px);z-index:400;" +
      "border:1px solid var(--line,rgba(255,255,255,.1));border-radius:15px;padding:15px;" +
      "background:var(--panel,#0b1117);box-shadow:0 22px 60px -18px rgba(0,0,0,.7);" +
      "opacity:0;transform:translateY(6px) scale(.97);pointer-events:none;" +
      "transition:opacity .18s,transform .18s cubic-bezier(.22,1,.36,1)}" +
    ".bq-pop{visibility:hidden}" +
    ".bq-pop.on{opacity:1;transform:none;pointer-events:auto;visibility:visible}" +
    // visibility cannot animate, but it CAN be delayed — so the closing fade still
    // plays, and the panel only leaves the tab order once it is actually gone.
    ".bq-pop{transition:opacity .18s,transform .18s cubic-bezier(.22,1,.36,1),visibility 0s .18s}" +
    ".bq-pop.on{transition:opacity .18s,transform .18s cubic-bezier(.22,1,.36,1),visibility 0s}" +
    ".bq-pop h4{font-size:14px;font-weight:700;margin:0 0 4px;color:var(--ink,#eaf2f5)}" +
    ".bq-pop p{font-size:12.5px;line-height:1.55;color:var(--dim,#9fb2bc);margin:0 0 12px}" +
    ".bq-pop .who{display:flex;align-items:center;gap:10px;margin-bottom:12px}" +
    ".bq-pop .who b{display:block;font-size:13.5px;color:var(--ink,#eaf2f5)}" +
    ".bq-pop .who span{font-size:11.5px;color:var(--faint,#7d8b93);word-break:break-all}" +
    ".bq-pop .who .bq-avatar{width:36px;height:36px;font-size:14px}" +
    ".bq-act{display:block;width:100%;padding:9px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.1));" +
      "color:var(--dim,#9fb2bc);cursor:pointer;font:inherit;font-size:12.5px;transition:color .2s,border-color .2s}" +
    ".bq-act:hover{color:var(--ink,#eaf2f5);border-color:var(--hair,rgba(255,255,255,.14))}" +
    ".bq-pop input{width:100%;padding:9px 10px;border-radius:9px;font:inherit;font-size:12px;" +
      "border:1px solid var(--line,rgba(255,255,255,.1));background:var(--bg,#04070a);color:var(--ink,#eaf2f5);" +
      "font-family:var(--mono,monospace);margin-bottom:9px}" +
    ".bq-note{font-size:11.5px;color:var(--faint,#7d8b93);line-height:1.5;margin-top:10px}" +
    ".bq-priv{display:flex;gap:7px;align-items:flex-start;font-size:11.5px;color:var(--faint,#7d8b93);" +
      "line-height:1.5;margin-top:11px;padding-top:11px;border-top:1px solid var(--line-2,rgba(255,255,255,.05))}" +
    "#bq-gbtn{display:flex;justify-content:center;min-height:44px}" +
    "@media (prefers-reduced-motion:reduce){.bq-pop{transition:none}}";
  (document.head || document.documentElement).appendChild(css);

  /* --- UI ----------------------------------------------------------------- */
  var hosts = [], open = false, noteMsg = "";
  function note(m) { noteMsg = m; render(); }
  function close() { open = false; noteMsg = ""; render(); }

  function initials(n) {
    var parts = String(n || "?").trim().split(/\s+/);
    return ((parts[0] || "")[0] || "?").toUpperCase() + (parts[1] ? parts[1][0].toUpperCase() : "");
  }
  function avatar(u, cls) {
    if (u && u.pic) {
      return '<img class="bq-avatar ' + (cls || "") + '" alt="" referrerpolicy="no-referrer" src="' +
        String(u.pic).replace(/"/g, "&quot;") + '">';
    }
    return '<span class="bq-avatar ' + (cls || "") + '" aria-hidden="true">' + initials(u && u.n) + "</span>";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function popBody() {
    var u = user();
    if (u) {
      return '<div class="who">' + avatar(u, "big") + "<div><b>" + esc(u.n) + "</b><span>" + esc(u.e) + "</span></div></div>" +
        '<button class="bq-act" data-act="out">Sign out</button>' +
        '<div class="bq-priv"><span aria-hidden="true">🔒</span><span>Your work stays on this device. ' +
        "Signing out leaves every bit of it exactly where it is.</span></div>";
    }
    if (FILE) {
      return "<h4>Sign in with Google</h4><p>Google can only sign you in on the hosted site — a page opened " +
        "straight from a file has no web address for Google to trust. Open " +
        "<b>biology.entelloq.com</b> and it will work there.</p>" +
        '<div class="bq-priv"><span aria-hidden="true">🔒</span><span>Everything else works offline, exactly as it does now.</span></div>';
    }
    if (!cid()) {
      return "<h4>Sign in with Google</h4><p>This needs a Google OAuth <b>Client ID</b> authorised for " +
        "<b>" + esc(location.host) + "</b>. Create one in the Google Cloud console, then paste it here — " +
        "it is kept on this device and takes effect immediately.</p>" +
        '<input id="bq-cid" type="text" spellcheck="false" autocomplete="off" placeholder="…apps.googleusercontent.com" ' +
        'aria-label="Google OAuth client ID">' +
        '<button class="bq-act" data-act="setcid">Use this client ID</button>' +
        (noteMsg ? '<div class="bq-note">' + esc(noteMsg) + "</div>" : "");
    }
    return "<h4>Sign in with Google</h4><p>This puts your name and picture on your space. It does not move your " +
      "work anywhere — there is no server behind this product, and your progress stays in this browser.</p>" +
      '<div id="bq-gbtn"></div>' +
      (noteMsg ? '<div class="bq-note">' + esc(noteMsg) + "</div>" : "") +
      '<div class="bq-priv"><span aria-hidden="true">🔒</span><span>Google sees a sign-in. Biology Entelloq sees ' +
      "a name and a picture, and keeps them here.</span></div>";
  }

  function render() {
    var u = user();
    // innerHTML below replaces the very button that was just clicked, so whatever
    // had focus is destroyed mid-interaction and focus drops to <body>. Remember
    // where it was and put it back — but only if it was ours, or we would steal
    // focus from somewhere else on the page.
    var refocus = hosts.some(function (h) { return h.contains(document.activeElement); });
    hosts.forEach(function (h) {
      h.innerHTML =
        '<button type="button" aria-haspopup="dialog" aria-expanded="' + (open ? "true" : "false") + '">' +
          avatar(u) + '<span class="nm">' + (u ? esc(u.n) : "Sign in") + "</span></button>" +
        '<div class="bq-pop' + (open ? " on" : "") + '" role="dialog" aria-label="Account">' + popBody() + "</div>";
    });
    if (refocus) {
      // Prefer the panel's first control when it is open (that is where the user
      // was heading), otherwise the chip they clicked.
      var back = (open && hosts[0] && hosts[0].querySelector(".bq-pop button, .bq-pop input"))
              || (hosts[0] && hosts[0].querySelector("button"));
      if (back) try { back.focus(); } catch (e) {}
    }
    if (open && !user() && cid() && !FILE) {
      load(function () {
        var host = document.getElementById("bq-gbtn");
        if (!host) return;
        try {
          google.accounts.id.renderButton(host, {
            theme: (document.documentElement.getAttribute("data-theme") === "light") ? "outline" : "filled_black",
            size: "large", shape: "pill", text: "continue_with", logo_alignment: "left", width: 260,
          });
        } catch (e) { note("Google could not start. The client ID may not be authorised for this address."); }
      });
    }
  }

  document.addEventListener("click", function (e) {
    var act = e.target.closest && e.target.closest("[data-act]");
    if (act) {
      var a = act.getAttribute("data-act");
      if (a === "out") { signOut(); close(); }
      if (a === "setcid") {
        var v = (document.getElementById("bq-cid") || {}).value || "";
        v = v.trim();
        if (!v) { note("Paste the client ID first."); return; }
        if (!/\.apps\.googleusercontent\.com$/.test(v)) { note("That does not look like a client ID — they end in .apps.googleusercontent.com"); return; }
        ls(K_CID, v); ready = false; loading = false; noteMsg = ""; render();
      }
      e.preventDefault();
      return;
    }
    var btn = e.target.closest && e.target.closest(".bq-acct>button");
    if (btn) { open = !open; noteMsg = ""; render(); e.preventDefault(); return; }
    if (open && !(e.target.closest && e.target.closest(".bq-pop"))) close();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) close(); });

  function mount(el) {
    if (!el || hosts.indexOf(el) >= 0) return;
    el.classList.add("bq-acct");
    hosts.push(el);
    render();
  }
  function scan() {
    var found = document.querySelectorAll("[data-bioq-account]");
    for (var i = 0; i < found.length; i++) mount(found[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
  // Sign in on one page, and every other tab of the product should agree.
  addEventListener("storage", function (e) { if (e.key === K_USER) emit(); });

  window.BIOQ_AUTH = {
    user: user, signOut: signOut, mount: mount,
    onChange: function (f) { subs.push(f); },
    configured: function () { return !!cid(); },
  };
})();
