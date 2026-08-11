/*
 * shell.js — everything the student sees around the specimen.
 *
 * Owns all chrome CSS (exported as a string, injected by the host page) and the
 * teaching layer: objectives that gate on real dissection events rather than a
 * Next button, the running record, and the closing viva.
 *
 * This revision makes the chrome feel like an instrument panel and — per the
 * user's explicit ask to "show the actual hand thing" — turns the hand panel
 * into a live cockpit: a mirrored self-view with a glowing hand skeleton drawn
 * from the tracker's published landmarks, a status dot, a gesture chip, a grip
 * meter driven by pinchStrength, a one/two-hand indicator, and a first-run
 * coach card. The specimen still dominates; every panel floats and recedes.
 *
 * The public contract is unchanged. buildShell(root) returns the same handles
 * main.js calls, and setHandState still accepts {on,status,health,video,reason}
 * — it just also accepts (optional) {gesture,grip,hands} and, when the live
 * tracker snapshot is reachable, reads gesture/grip/skeleton straight from it so
 * the panel is genuinely live rather than 4Hz. Nothing is renamed.
 */

export const SHELL_CSS = `
/* ── shared chrome ─────────────────────────────────────────────────────── */
.chrome{position:fixed;z-index:20;background:var(--glass);border:1px solid var(--line);
        backdrop-filter:blur(20px) saturate(1.15);-webkit-backdrop-filter:blur(20px) saturate(1.15);
        border-radius:14px;box-shadow:0 12px 44px -14px rgba(0,0,0,.66),inset 0 1px 0 rgba(255,255,255,.045)}
.lbl{font-family:var(--mono);font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--faint)}
.lbl.em{color:var(--em)}

/* ── picker ────────────────────────────────────────────────────────────── */
#pick{position:fixed;inset:0;z-index:60;display:grid;place-items:center;transition:opacity .6s ease;
      background:radial-gradient(72% 62% at 50% 38%,#0c1620 0%,#070c11 62%,#04070a 100%)}
#pick.gone{opacity:0;pointer-events:none}
#pick .in{text-align:center;max-width:980px;padding:24px}
#pick .kick{font-family:var(--mono);font-size:9px;letter-spacing:.42em;color:var(--cy);margin:0 0 16px}
#pick h1{font-family:var(--sans);font-weight:600;font-size:30px;letter-spacing:-.012em;color:var(--ink);margin:0 0 10px}
#pick h1 span{color:var(--em)}
#pick .tag{color:var(--dim);font-size:13.5px;margin:0 auto 38px;max-width:600px;line-height:1.65}
#cards{display:flex;gap:20px;justify-content:center;flex-wrap:wrap}
.card{position:relative;width:340px;text-align:left;padding:24px;border:1px solid var(--line);border-radius:16px;
      cursor:pointer;overflow:hidden;transition:.2s cubic-bezier(.2,.7,.3,1);
      background:linear-gradient(180deg,rgba(255,255,255,.032),rgba(255,255,255,.008))}
.card::before{content:"";position:absolute;left:0;top:0;height:3px;width:100%;opacity:0;transition:.2s;
      background:linear-gradient(90deg,var(--em),var(--cy))}
.card:hover{border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.05);transform:translateY(-3px);
      box-shadow:0 26px 64px -26px rgba(52,211,153,.5)}
.card:hover::before{opacity:1}
.card h2{margin:12px 0 8px;font-size:19px;color:var(--ink)}
.card p{margin:0;font-size:12.5px;color:var(--dim);line-height:1.65}

/* ── objective bar ─────────────────────────────────────────────────────── */
/* One spacing token for every screen-edge margin, so the whole chrome sits on a
   consistent frame instead of a mix of 16/18/22px. */
:root{--edge:22px}
#obj{top:var(--edge);left:50%;transform:translateX(-50%);padding:11px 20px;min-width:448px;max-width:60vw;
     display:flex;flex-direction:column;gap:9px}
/* When the bedside monitor claims the top-left, cap the centred objective bar so it
   cannot grow into it: a centred bar of width W has its left edge at (100vw-W)/2, so
   keeping that past the ~380px monitor edge means W <= 100vw - 760px. Long objectives
   wrap instead of overlapping. */
body.physio-on #obj{max-width:min(60vw, calc(100vw - 760px))}
#objdots{display:flex;gap:5px}
#objdots span{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.09);transition:.35s}
#objdots span.now{background:linear-gradient(90deg,var(--em),var(--cy));box-shadow:0 0 8px rgba(52,211,153,.6)}
#objdots span.done{background:rgba(52,211,153,.55)}
.objmain{display:flex;gap:14px;align-items:baseline}
#objn{color:var(--em);white-space:nowrap;flex:none}
#objtxt{font-size:13.5px;line-height:1.45;flex:1;color:var(--ink)}
#objtxt b{color:var(--em)}

/* ── tool dock ─────────────────────────────────────────────────────────── */
/* Six instruments make the dock 360px tall, which at 900px viewport height put
   its top edge 16px INSIDE physio.js's monitor (#phy-mon, 352x278 at top-left).
   So: centred while there is room, otherwise pushed clear of the monitor, and
   never pushed so far that the hand cockpit at bottom-left is fouled. z-index
   above the monitor as well — a readout must never swallow an instrument. */
/* Spacing. Everything on the edges was packed tight enough that the chrome read
   as one dense band rather than a few distinct instruments, and with a hand
   driving the cursor, small targets sitting shoulder to shoulder are genuinely
   hard to hit. Gaps and hit areas are deliberately generous here — this is a
   workspace, and the specimen is what deserves the density, not the furniture. */
/* NOT clamp(). clamp(min, val, max) returns the MAX when max < val — so as the
   viewport shortens, the upper bound silently overrides the floor and yanks the
   dock UP underneath the monitor. That inversion is exactly how the dock ended up
   behind the bedside monitor twice, most recently at 1512x832 (a 13" MacBook).
   max(floor, min(preferred, ceiling)) makes the floor genuinely non-negotiable. */
#dock{left:22px;transform:none;z-index:24;padding:11px;display:flex;flex-direction:column;gap:11px;
      top:max(var(--docktop),min(calc(50% - 200px),calc(100vh - 560px)));
      top:max(var(--docktop),min(calc(50% - 200px),calc(100dvh - 560px)))}
/* Short viewports (laptops at 720p, the actual school machine) cannot stack all
   three left-edge surfaces: monitor 285 + dock 359 + hand cockpit 136 = 780 > 720.
   The clamp above then resolves to its UPPER bound and pulls the dock back up
   under the monitor, hiding the first two instruments. Reflowing to two columns
   halves the dock to ~184px, which fits with room to spare — and a 3x2 instrument
   grid is if anything faster to hit than a 6-tall strip. */
/* How far down the dock may start. The bedside monitor occupies the top-left
   corner down to ~286px, but ONLY while physiology is running — so the floor is a
   variable rather than a constant, and the dock reclaims the space the moment the
   monitor leaves. Hardcoding 300px everywhere would permanently pay for a panel
   that is absent by default. */
:root{--docktop:206px}
body.physio-on{--docktop:300px}
/* 900px, not 820px: a single column of six needs ~390px, and once the monitor
   claims the top 286 there is not room for that plus the hand cockpit until well
   past 900. Below this, the 3x2 grid. */
@media (max-height:900px){
  #dock{display:grid;grid-template-columns:repeat(2,52px);gap:10px;
        top:max(var(--docktop),calc(50% - 110px))}
}
/* With a hand driving, targets need to be bigger — a tracked fingertip is nowhere
   near as precise as a mouse, and a 52px button is a hard target in mid-air. But
   6 taller buttons in ONE column overruns into the hand cockpit at bottom-left,
   so hand mode always takes the 3x2 grid regardless of viewport height. The two
   rules have to travel together; changing the button size alone reintroduces the
   overlap at tall viewports where the short-viewport media query does not apply. */
body.handmode .tool{width:60px;height:60px}
body.handmode #dock{display:grid;grid-template-columns:repeat(2,60px);gap:14px;padding:13px;
      top:max(var(--docktop),min(calc(50% - 117px),calc(100vh - 420px)));
      top:max(var(--docktop),min(calc(50% - 117px),calc(100dvh - 420px)))}
.tool{position:relative;width:52px;height:52px;border:1px solid transparent;border-radius:12px;cursor:pointer;
      background:rgba(255,255,255,.02);color:var(--dim);display:grid;place-items:center;
      transition:.16s cubic-bezier(.2,.7,.3,1)}
.tool:hover{background:rgba(255,255,255,.06);color:var(--ink);transform:translateX(2px)}
.tool.on{color:var(--em);border-color:rgba(52,211,153,.5);
      background:linear-gradient(135deg,rgba(52,211,153,.2),rgba(56,224,216,.09));
      box-shadow:0 0 24px -6px rgba(52,211,153,.7),inset 0 0 0 1px rgba(52,211,153,.14)}
.tool.on::after{content:"";position:absolute;left:-9px;top:50%;transform:translateY(-50%);
      width:3px;height:22px;border-radius:2px;background:linear-gradient(var(--em),var(--cy));
      box-shadow:0 0 10px var(--em)}
.tool svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.7;
      stroke-linecap:round;stroke-linejoin:round}
.tnum{position:absolute;bottom:3px;right:5px;font-family:var(--mono);font-size:8.5px;font-style:normal;
      line-height:1;color:var(--faint)}
.tool.on .tnum{color:var(--em)}
.ttip{position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%) translateX(-6px);
      white-space:nowrap;padding:8px 12px;border-radius:10px;opacity:0;pointer-events:none;transition:.16s;
      display:flex;flex-direction:column;gap:2px;background:var(--glass);border:1px solid var(--line);
      backdrop-filter:blur(16px);box-shadow:0 12px 32px -14px rgba(0,0,0,.72)}
.ttip b{font-family:var(--sans);font-size:12px;color:var(--ink);font-weight:600}
.ttip s{text-decoration:none;font-size:10.5px;color:var(--dim)}
.ttip em{font-family:var(--mono);font-style:normal;font-size:8.5px;letter-spacing:.14em;color:var(--faint)}
.tool:hover .ttip{opacity:1;transform:translateY(-50%) translateX(0)}

/* ── structure readout ─────────────────────────────────────────────────── */
/* Specimen switcher — top-left, always visible. Slides right to clear the bedside
   monitor (352px) when living physiology is on, reusing the physio-on body class. */
/* Slide clear of the 352px bedside monitor when living physiology is on. Driven by
   a custom property ON body — the same pattern the dock uses for --docktop, which
   works reliably here, whereas a plain descendant rule (body.physio-on #specbtn)
   did not apply even with !important in this engine. */
/* Top-RIGHT cluster: help button + specimen switcher, in one right-anchored row.
   Top-right, not top-left, because the left corner is claimed by the bedside monitor
   when physiology is on. The structure readout sits just below this row (the #rail
   starts at var(--edge)+52px) and only appears on hover. */
#topright{position:fixed;right:var(--edge);top:var(--edge);z-index:25;display:flex;align-items:stretch;gap:9px}
#topright .chrome{position:relative}
#helpbtn{width:37px;display:flex;align-items:center;justify-content:center;cursor:pointer;
  font:600 16px/1 var(--sans);color:var(--dim);
  transition:border-color .15s,background .15s,color .15s}
#helpbtn:hover{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.07);color:var(--em)}
#specbtn{display:flex;align-items:center;gap:9px;padding:9px 13px;cursor:pointer;color:var(--ink);font:inherit;
  transition:border-color .15s,background .15s}
#specbtn .lbl{color:var(--faint)}
#specbtn .specname{font-size:13px;font-weight:600;color:var(--em);letter-spacing:-.005em}
#specbtn svg{color:var(--faint);transition:color .15s}
#specbtn:hover{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.07)}
#specbtn:hover svg{color:var(--em)}
/* Sits below the specimen button (which is ~37px tall at top:var(--edge)). */
#struct{right:var(--edge);top:calc(var(--edge) + 52px);z-index:21;padding:15px 18px;min-width:238px;max-width:308px;
        opacity:0;transform:translateX(8px);transition:.18s}
#struct.on{opacity:1;transform:none}
#struct .n{font-size:14.5px;color:var(--em);margin:5px 0 4px;font-weight:600}
#struct .d{font-size:11.5px;color:var(--dim);line-height:1.55}
#struct .sys{margin-top:7px;color:var(--faint)}
/* Contextual depth. The app grew a histology microscope, four imaging modalities
   and a vascular clamp, and ALL of them were reachable only by pressing an unmarked
   key — a reviewer who read the whole codebase still concluded they did not exist.
   So the offer is made where the interest already is: on the structure under the
   cursor, naming only what that structure can actually do. Clickable as well as
   keyed, because keyboard-only parity runs both ways. */
#struct .acts{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
#struct .acts:empty{display:none}
#struct .act{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;cursor:pointer;
      font:500 10px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;
      color:var(--dim);background:rgba(255,255,255,.03);border:1px solid var(--line);
      border-radius:6px;transition:.15s cubic-bezier(.2,.7,.3,1)}
#struct .act:hover{color:var(--em);border-color:rgba(52,211,153,.45);
      background:rgba(52,211,153,.10)}
#struct .act kbd{font:600 9px/1 var(--mono);color:var(--faint);background:rgba(255,255,255,.05);
      border:1px solid var(--line);border-radius:3px;padding:2px 4px}
#struct .act:hover kbd{color:var(--em);border-color:rgba(52,211,153,.35)}

/* ── hint line ─────────────────────────────────────────────────────────── */
#hint{left:50%;bottom:var(--edge);transform:translateX(-50%);padding:9px 18px;font-size:12px;
      color:var(--dim);max-width:60vw;text-align:center}
#hint b{color:var(--cy)}

/* ── demonstrator voice ────────────────────────────────────────────────── */
#say{right:22px;bottom:22px;width:340px;padding:16px 19px;opacity:0;transform:translateY(10px) scale(.985);
     transition:.34s cubic-bezier(.2,.7,.3,1);pointer-events:none}
#say.on{opacity:1;transform:none}
#say .t{font-size:13px;line-height:1.55;margin-top:6px;color:var(--ink)}
#say.warn{border-color:rgba(240,184,102,.5);background:rgba(28,20,10,.82)}
#say.warn .lbl{color:var(--warn)}

/* ── hand cockpit ──────────────────────────────────────────────────────── */
#hand{left:22px;bottom:22px;width:222px;padding:14px;display:flex;flex-direction:column;gap:11px}
.handhead{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hcount{font-family:var(--mono);font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);
        border:1px solid var(--line);border-radius:6px;padding:2px 7px}
#hand.live .hcount{color:var(--em);border-color:rgba(52,211,153,.35)}
#hand #selfwrap,#hand #handlive{display:none}
#hand.live #selfwrap{display:block}
#hand.live #handlive{display:flex}
#selfwrap{position:relative;width:100%;aspect-ratio:4/3;border-radius:10px;overflow:hidden;
          border:1px solid rgba(52,211,153,.3);
          box-shadow:0 0 0 1px rgba(0,0,0,.4),0 10px 26px -12px rgba(52,211,153,.4)}
#selfview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);
          filter:saturate(.85) contrast(1.03) brightness(.9)}
#skel{position:absolute;inset:0;z-index:1;width:100%;height:100%;pointer-events:none}
#selflabel{position:absolute;left:8px;bottom:6px;z-index:2;color:var(--em);font-family:var(--mono);
           font-size:8px;letter-spacing:.16em;text-transform:uppercase;display:flex;align-items:center;gap:6px;
           text-shadow:0 1px 4px rgba(0,0,0,.85)}
#selflabel::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--em);
           box-shadow:0 0 6px var(--em);animation:blink 1.6s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
#handlive{flex-direction:column;gap:9px;margin-top:1px}
#handstat{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:9px;
          letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}
#handstat .dot{width:7px;height:7px;border-radius:50%;background:var(--faint);flex:none;transition:.2s}
#handstat.ok .dot{background:var(--em);box-shadow:0 0 8px rgba(52,211,153,.85)}
#handstat.warm .dot{background:var(--cy);box-shadow:0 0 8px rgba(56,224,216,.85);animation:pulse 1s infinite}
#handstat.deg .dot{background:var(--warn);box-shadow:0 0 8px rgba(240,184,102,.75)}
#handstat.lost .dot{background:var(--bad);box-shadow:0 0 8px rgba(232,115,94,.75)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.gchip{align-self:flex-start;font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;
       padding:4px 10px;border-radius:7px;border:1px solid var(--line);color:var(--dim);
       background:rgba(255,255,255,.03);transition:.2s}
.gchip[data-k="ok"]{color:var(--em);border-color:rgba(52,211,153,.4);background:rgba(52,211,153,.08)}
.gchip[data-k="grip"]{color:var(--cy);border-color:rgba(56,224,216,.5);background:rgba(56,224,216,.11)}
.gchip[data-k="dim"]{color:var(--faint)}
.gripwrap{display:flex;align-items:center;gap:9px}
.gripwrap .lbl{flex:none}
.griptrack{position:relative;flex:1;height:6px;border-radius:4px;overflow:hidden;
           background:rgba(255,255,255,.06);border:1px solid var(--line)}
#gripfill{position:absolute;inset:0;transform-origin:left center;transform:scaleX(0);
          background:linear-gradient(90deg,var(--em),var(--cy));transition:transform .06s linear}
#gripfill[data-on="1"]{box-shadow:0 0 10px rgba(56,224,216,.7)}
/* Show-camera switch. Hidden with the rest of the live readouts until the camera
   is actually running, because it is meaningless before that. */
#hand #camrow{display:none}
#hand.live #camrow{display:flex;align-items:center;justify-content:space-between;gap:9px}
.tgl{position:relative;width:34px;height:18px;flex:none;padding:0;border-radius:10px;cursor:pointer;
     border:1px solid var(--line);background:rgba(255,255,255,.05);transition:.18s}
.tgl i{position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;
     background:var(--faint);transition:.18s}
.tgl[aria-checked="true"]{border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.16)}
.tgl[aria-checked="true"] i{left:18px;background:var(--em);box-shadow:0 0 8px rgba(52,211,153,.8)}
.tgl:hover{border-color:rgba(52,211,153,.5)}
/* Camera hidden: the video goes, the tracked skeleton stays on a dark plate so
   the panel still shows that tracking is live. */
#selfwrap.nocam{background:rgba(4,7,10,.85);border-color:rgba(52,211,153,.16)}
#selfwrap.nocam #selfview{display:none}
#handbtn{margin-top:1px;width:100%;padding:9px 12px;border:1px solid rgba(52,211,153,.42);border-radius:9px;
         cursor:pointer;color:var(--em);font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;
         text-transform:uppercase;transition:.16s;
         background:linear-gradient(180deg,rgba(52,211,153,.16),rgba(52,211,153,.07))}
#handbtn:hover{background:rgba(52,211,153,.24);box-shadow:0 0 18px -4px rgba(52,211,153,.6)}
#handbtn:not(.off){border-color:rgba(232,115,94,.42);color:#f0a494;
         background:linear-gradient(180deg,rgba(232,115,94,.14),rgba(232,115,94,.06))}
#handbtn:not(.off):hover{background:rgba(232,115,94,.18);box-shadow:0 0 18px -6px rgba(232,115,94,.6)}
.hnote{font-size:10px;line-height:1.5;color:var(--faint)}

/* ── first-run coach ───────────────────────────────────────────────────── */
#coach{left:252px;bottom:var(--edge);width:238px;z-index:24;padding:14px 15px;opacity:0;transform:translateY(10px);
       pointer-events:none;transition:.32s cubic-bezier(.2,.7,.3,1)}
#coach.on{opacity:1;transform:none}
#coach ul{margin:9px 0 11px;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px}
#coach li{position:relative;padding-left:17px;font-size:11.5px;color:var(--dim);line-height:1.4}
#coach li::before{content:"";position:absolute;left:2px;top:6px;width:5px;height:5px;border-radius:50%;
       background:var(--em);box-shadow:0 0 6px var(--em)}
#coach li b{color:var(--cy)}
.minibtn{pointer-events:auto;padding:6px 12px;border:1px solid var(--line);border-radius:7px;cursor:pointer;
       background:rgba(255,255,255,.05);color:var(--ink);font-family:var(--mono);font-size:9px;
       letter-spacing:.12em;text-transform:uppercase;transition:.15s}
.minibtn:hover{border-color:rgba(52,211,153,.5);color:var(--em)}

/* ── systems toggles ───────────────────────────────────────────────────── */
#systems{left:50%;top:94px;transform:translateX(-50%);padding:6px 8px;display:flex;gap:4px;flex-wrap:wrap;
         max-width:64vw;justify-content:center}
.sysb{padding:5px 11px;border:1px solid transparent;border-radius:7px;background:none;color:var(--faint);
      cursor:pointer;font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;transition:.14s}
.sysb:hover{color:var(--ink);background:rgba(255,255,255,.05)}
.sysb.off{opacity:.4;text-decoration:line-through}

/* ── attempt record ────────────────────────────────────────────────────── */
#rec{right:var(--edge);top:var(--edge);bottom:var(--edge);width:370px;padding:16px;display:none;flex-direction:column;z-index:23}
#rec.on{display:flex}
#recl{overflow-y:auto;flex:1;margin-top:10px;font-family:var(--mono);font-size:10.5px;line-height:1.65}
.ev{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);color:var(--dim)}
.ev .s{color:var(--faint);margin-right:8px}
.ev.damage{color:var(--bad)} .ev.discover{color:var(--cy)} .ev.peel,.ev.lift{color:var(--em)}

/* ── viva ──────────────────────────────────────────────────────────────── */
#viva{position:fixed;inset:0;z-index:70;background:rgba(4,7,10,.94);backdrop-filter:blur(10px);
      display:none;place-items:center;padding:36px}
#viva.on{display:grid}
#vbox{width:min(720px,92vw);max-height:86vh;overflow-y:auto;padding:28px 32px;
      background:var(--glass);border:1px solid var(--line);border-radius:16px;
      box-shadow:0 30px 90px -30px rgba(0,0,0,.8)}
#vbox h2{margin:6px 0 16px;font-size:20px;color:var(--em)}
.qa{margin-bottom:16px}
.qa .q{font-size:14px;line-height:1.6;margin-bottom:6px;color:var(--ink)}
.qa .a{font-size:12.5px;color:var(--dim);line-height:1.6;padding-left:13px;border-left:2px solid rgba(52,211,153,.35)}
.btn{padding:10px 18px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--ink);
     border-radius:8px;cursor:pointer;font-family:var(--mono);font-size:10px;letter-spacing:.1em;
     text-transform:uppercase;margin-right:8px;transition:.15s}
.btn:hover{border-color:rgba(52,211,153,.5);color:var(--em)}

/* ── the right rail ────────────────────────────────────────────────────────
   Eight new surfaces would have been eight new boxes. Instead the right edge
   becomes ONE quiet column — status line, structure readout, case note — with
   everything the student only occasionally reaches for folded away behind a
   single closed drawer at its foot. The centre of the viewport stays empty:
   the specimen is still the interface. Bottom stops short of #say. */
/* Starts BELOW the specimen button (top-right, ~37px tall at top:var(--edge)) so
   the structure readout — the first item in this right-hand column — clears it. */
#rail{position:fixed;right:var(--edge);top:calc(var(--edge) + 52px);bottom:112px;width:320px;z-index:21;
      display:flex;flex-direction:column;gap:10px;align-items:stretch;pointer-events:none}
#rail .chrome{position:relative;pointer-events:auto}
#rail #struct{right:auto;top:auto;min-width:0;max-width:none;width:100%;display:none}
#rail #struct.on{display:block;opacity:1;transform:none}
#rail ::-webkit-scrollbar{width:6px;height:6px}
#rail ::-webkit-scrollbar-track{background:transparent}
#rail ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.11);border-radius:3px}

/* physiology presence — a status line, NOT a second monitor. physio.js owns
   #phy-mon at top-left; this only says the simulation is breathing. */
#physline{display:none;align-items:center;gap:9px;padding:8px 12px}
#physline.on{display:flex}
#physline .dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--em);
      box-shadow:0 0 7px var(--em);animation:blink 1.6s infinite}
#physline .v{font-family:var(--mono);font-size:9.5px;letter-spacing:.11em;color:var(--faint);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#physline .v b{color:var(--em);font-weight:600;letter-spacing:.16em;text-transform:uppercase}

/* case note — a chart entry, never a quiz card, and never a diagnosis */
#vig{display:none;flex-direction:column;padding:13px 15px;max-height:34vh;overflow-y:auto}
#vig.on{display:flex}
#vig .vhead{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
#vig .vwho{font-family:var(--mono);font-size:9px;letter-spacing:.14em;color:var(--faint)}
#vig .vlab{font-size:12.5px;line-height:1.45;color:var(--ink);margin:8px 0 0}
#vig dl{margin:11px 0 0;padding:0;display:flex;flex-direction:column;gap:9px}
#vig dt{font-family:var(--mono);font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--faint)}
#vig dd{margin:4px 0 0;font-size:11.5px;line-height:1.6;color:var(--dim)}
#vig dd.ask{color:var(--ink);padding-left:10px;border-left:2px solid rgba(56,224,216,.4)}
#vig .vfoot{margin-top:11px;padding-top:8px;border-top:1px solid var(--line);
      font-family:var(--mono);font-size:8.5px;letter-spacing:.13em;color:var(--faint);line-height:1.6}

/* the one drawer. Closed by default; the foot row is the only affordance. */
#drawer{margin-top:auto;display:flex;flex-direction:column;gap:8px}
#drawbody{display:none;flex-direction:column;gap:16px;padding:13px 14px;max-height:44vh;overflow-y:auto}
#drawer.open #drawbody{display:flex}
#railfoot{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:6px;padding:7px 8px}
.minibtn.on{border-color:rgba(52,211,153,.5);color:var(--em);background:rgba(52,211,153,.1)}
.minibtn.vr{border-color:rgba(56,224,216,.4);color:var(--cy)}
.minibtn.vr.live{border-color:rgba(56,224,216,.7);background:rgba(56,224,216,.14)}

/* the squeamishness escape hatch stays legible with the drawer shut */
.bchip{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid var(--line);
      border-radius:7px;cursor:pointer;background:rgba(255,255,255,.04);color:var(--dim);
      font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;transition:.15s}
.bchip:hover{border-color:rgba(232,115,94,.45);color:var(--ink)}
.bchip i{width:6px;height:6px;border-radius:50%;flex:none;font-style:normal;background:var(--faint)}
.bchip[data-k="1"] i{background:rgba(232,115,94,.45)}
.bchip[data-k="2"] i{background:rgba(232,115,94,.78)}
.bchip[data-k="3"] i{background:var(--bad);box-shadow:0 0 7px rgba(232,115,94,.85)}

/* drawer sections */
.dsec{display:flex;flex-direction:column;gap:8px}
.dsec.hide{display:none}
.dsec.flash{animation:dflash 1.1s ease}
@keyframes dflash{0%,100%{box-shadow:none}22%{box-shadow:0 0 0 1px rgba(232,115,94,.4)}}
.dnote{font-size:10px;line-height:1.55;color:var(--faint)}
.seg{display:flex;flex-wrap:wrap;gap:4px}
.seg button{flex:1 1 auto;padding:6px 7px;border:1px solid var(--line);border-radius:7px;cursor:pointer;
      background:rgba(255,255,255,.03);color:var(--faint);font-family:var(--mono);font-size:8.5px;
      letter-spacing:.12em;text-transform:uppercase;transition:.14s;white-space:nowrap}
.seg button:hover{color:var(--ink);background:rgba(255,255,255,.07)}
.seg button.on{color:var(--em);border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.12)}
.seg.bleed button.on{color:#f0a494;border-color:rgba(232,115,94,.45);background:rgba(232,115,94,.13)}

/* radiology console: amber on black, monospace, no decoration */
.slice{display:flex;align-items:center;gap:9px}
.slice .lbl{flex:none}
.slice #imgpos{min-width:56px;text-align:right;color:var(--warn)}
.slice input[type=range]{flex:1;min-width:0;-webkit-appearance:none;appearance:none;height:3px;
      border-radius:2px;outline:none;background:linear-gradient(90deg,rgba(240,184,102,.5),rgba(240,184,102,.14))}
.slice input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border:none;
      border-radius:50%;background:var(--warn);box-shadow:0 0 9px rgba(240,184,102,.7);cursor:pointer}
.slice input[type=range]::-moz-range-thumb{width:11px;height:11px;border:none;border-radius:50%;
      background:var(--warn);box-shadow:0 0 9px rgba(240,184,102,.7);cursor:pointer}
.rad{padding:8px 10px;border:1px solid rgba(240,184,102,.22);border-radius:7px;background:#05080b;
      font-family:var(--mono);font-size:9.5px;line-height:1.75;letter-spacing:.1em;color:var(--warn);
      text-transform:uppercase}
.rad i{font-style:normal;color:rgba(240,184,102,.42);margin-right:6px}
.dsec.off .slice,.dsec.off .rad{opacity:.34}
.dsec.off .slice{pointer-events:none}

/* pathology cases — labels only. The diagnosis is the student's job. */
.caselist{display:flex;flex-direction:column;gap:4px}
.caseb{text-align:left;padding:8px 10px;border:1px solid var(--line);border-radius:8px;cursor:pointer;
      background:rgba(255,255,255,.025);color:var(--dim);font-family:var(--sans);font-size:11px;
      line-height:1.45;transition:.14s}
.caseb:hover{border-color:rgba(56,224,216,.4);color:var(--ink);background:rgba(56,224,216,.07)}
.caseb.on{border-color:rgba(56,224,216,.55);color:var(--cy);background:rgba(56,224,216,.1)}
.caseb.none{font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.caseb.none.on{color:var(--em);border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.1)}

/* depth gauge */
.ladder{position:relative;display:flex;flex-direction:column;padding-left:16px}
.ladder::before{content:"";position:absolute;left:4px;top:9px;bottom:9px;width:1px;background:var(--line)}
.rung{position:relative;display:flex;align-items:center;gap:9px;padding:4px 0;transition:.16s;
      font-size:10.5px;line-height:1.35;color:var(--faint)}
.rung i{position:absolute;left:-14.5px;top:50%;transform:translateY(-50%);width:5px;height:5px;
      border-radius:50%;font-style:normal;background:#0a1015;border:1px solid var(--line)}
.rung .d{flex:none;font-family:var(--mono);font-size:8.5px;letter-spacing:.13em;color:var(--faint)}
.rung.past{color:var(--dim)}
.rung.past i{background:rgba(52,211,153,.45);border-color:rgba(52,211,153,.5)}
.rung.now{color:var(--em)}
.rung.now .d{color:var(--em)}
.rung.now i{background:var(--em);border-color:var(--em);box-shadow:0 0 9px var(--em)}

/* ── the tutor's question line ─────────────────────────────────────────────
   One glass line at the foot. While it is open the hint and the demonstrator
   step aside, and every key belongs to the student — see the keydown guard. */
/* 16px from the bottom of the viewport, which with viewport-fit=cover is the
   bottom of the SCREEN — on a tablet that is inside the home indicator, and the
   system eats the first tap on the field. env() is 0px on everything without an
   indicator, so no desktop moves. */
#ask{left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);
     width:min(620px,66vw);z-index:26;
     display:none;flex-direction:column;gap:9px;padding:13px 16px}
#ask.on{display:flex}
#ask .q{font-size:12.5px;line-height:1.55;color:var(--ink)}
.askline{display:flex;align-items:center;gap:9px}
.askline .car{flex:none;color:var(--em);font-family:var(--mono);font-size:13px}
#askin{flex:1;min-width:0;padding:2px 0;border:none;outline:none;background:none;color:var(--ink);
      font-family:var(--sans);font-size:13.5px;line-height:1.5;caret-color:var(--em)}
#askin::placeholder{color:var(--faint)}
#ask .k{font-family:var(--mono);font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.asking #hint{opacity:0;pointer-events:none}
.asking #say{opacity:0}

/* ── keyboard reference ────────────────────────────────────────────────── */
#keys{position:fixed;inset:0;z-index:72;padding:36px;display:none;place-items:center;
      background:rgba(4,7,10,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
#keys.on{display:grid}
#kbox{width:min(700px,92vw);max-height:84vh;overflow-y:auto;padding:26px 30px;
      background:var(--glass);border:1px solid var(--line);border-radius:16px;
      box-shadow:0 30px 90px -30px rgba(0,0,0,.8)}
#kbox h2{margin:6px 0 20px;font-size:19px;font-weight:600;color:var(--em)}
#kgrps{column-count:2;column-gap:34px}
.kgrp{break-inside:avoid;-webkit-column-break-inside:avoid;margin:0 0 18px}
.kgrp>.lbl{display:block;margin-bottom:8px}
.krow{display:flex;align-items:baseline;gap:11px;padding:3.5px 0}
.krow kbd{flex:none;min-width:32px;text-align:center;padding:3px 7px;border:1px solid var(--line);
      border-radius:5px;background:rgba(255,255,255,.04);color:var(--cy);
      font-family:var(--mono);font-size:9.5px;letter-spacing:.06em}
.krow s{text-decoration:none;font-size:12px;line-height:1.5;color:var(--dim)}
#kbox .foot{margin-top:4px;font-family:var(--mono);font-size:9px;letter-spacing:.14em;
      text-transform:uppercase;color:var(--faint)}

/* ── things the phone layout needs, defined off ────────────────────────────
   Three elements exist in the markup for every viewport but are only ever
   shown on a phone. Declaring them off here (rather than only on there) keeps
   the desktop rendering identical to what it was, whatever else changes. */
/* The instrument name under its glyph. On a desktop it lives in the hover
   tooltip; a touch screen has no hover, and "which one is the retractor" is not
   a question a student should have to answer by tapping one to find out. */
.tname{display:none}
/* The objective's hint. On a desktop it has its own bar at the foot (#hint);
   down on a phone the foot is the instrument tray. */
#objhint{display:none;font-size:11.5px;line-height:1.45;color:var(--dim)}
#objhint b{color:var(--cy)}
/* Controls that only make sense without a keyboard. */
.mobonly{display:none}

/* ── touch, on any device that has it ──────────────────────────────────────
   Not scoped to the phone: a touchscreen laptop and a tablet get a finger too,
   and every rule here is either inert under a mouse or corrects something that
   is only wrong under a finger. */
/* The scene owns every touch that lands on it — no page scroll, no rubber
   band, no double-tap zoom, no long-press callout over the specimen.
   OrbitControls sets touch-action on the canvas itself, but the stage behind it
   is ours and a gap between the two is a scroll waiting to happen. */
#stage{touch-action:none}
#stage canvas{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
html,body{overscroll-behavior:none}
/* A panel that reaches the end of its scroll must not hand the rest of the
   gesture to the page behind it: that is what turns "read the case note" into
   "rubber-band the whole lab". */
#recl,#drawbody,#vig,#struct,#kbox,#vbox,#cards{overscroll-behavior:contain}
@media (hover:none){
  /* Hover affordances are a lie here. The tooltip only appears AFTER the tap
     has already selected the instrument, and on iOS the hover state then sticks
     to that button until you tap somewhere else. */
  .ttip{display:none}
  .tool:hover{transform:none;background:rgba(255,255,255,.02);color:var(--dim)}
  .tool.on:hover{color:var(--em);
      background:linear-gradient(135deg,rgba(52,211,153,.2),rgba(56,224,216,.09))}
  .card:hover{transform:none;box-shadow:none;background:rgba(52,211,153,.05)}
  *{-webkit-tap-highlight-color:transparent}
  /* A drag that begins on a label must move the instrument, not select the word. */
  .tool,.minibtn,.bchip,.sysb,.seg button,.caseb,.btn,.act,.card,.rung,.lbl,
  #specbtn,#helpbtn,#handbtn,#coachok{
      -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
}

/* ── the phone ─────────────────────────────────────────────────────────────
   The desktop chrome is a ring of sidebars around a wide viewport: instruments
   down the left, a 320px rail down the right, the objective floating across the
   top. A 390px phone has no sides. So the same surfaces become a top row and a
   bottom sheet, and the middle — the specimen — is left alone, which is the one
   thing that was already right.

   Every rule is scoped to body.bioq-phone, a class buildShell adds only when
   the device has a coarse pointer AND a short screen edge. It is deliberately
   a class and not a media query: the layout comes with structural changes (the
   systems toggles move into the console, the record and the viva grow buttons)
   and a query on max-width would flip the CSS back to the desktop the moment
   the handset was turned on its side while the DOM stayed where it was. The
   short EDGE of a screen does not change when you rotate it. */
body.bioq-phone{
  /* The notch, the home indicator and the rounded corners. These read as 0px
     without viewport-fit=cover on the viewport meta — assemble.py sets it. */
  --sat:env(safe-area-inset-top,0px);
  --sar:env(safe-area-inset-right,0px);
  --sab:env(safe-area-inset-bottom,0px);
  --sal:env(safe-area-inset-left,0px);
  --edge:10px;
  --pl:calc(var(--sal) + 10px);
  --pr:calc(var(--sar) + 10px);
  /* The bottom stack, stated once so everything above the tray agrees on where
     the tray ends: a 58px button plus 7px of padding either side. */
  --dockh:72px;
  --bot:calc(var(--sab) + 10px);
  --above-dock:calc(var(--bot) + var(--dockh) + 8px);
}

/* picker — one card per row, and the deck scrolls if the shelf grows */
/* The gutter here is measured from the screen edge, and on a phone held on its
   side that edge is under the notch. The insets keep the deck clear of it. */
body.bioq-phone #pick .in{padding:20px calc(var(--sar) + 16px) 20px calc(var(--sal) + 16px);width:100%}
body.bioq-phone #pick .kick{font-size:8.5px;letter-spacing:.3em;margin-bottom:12px}
body.bioq-phone #pick h1{font-size:23px}
body.bioq-phone #pick .tag{font-size:12.5px;margin-bottom:20px}
body.bioq-phone #cards{gap:11px;max-height:62vh;overflow-y:auto;padding:2px}
body.bioq-phone .card{width:100%;padding:16px 17px;border-radius:13px}
body.bioq-phone .card h2{font-size:17px;margin:9px 0 6px}
body.bioq-phone .card p{font-size:12px}

/* top: the help and specimen chips on one row, the objective on the next.
   Two rows and not one because the specimen name is variable width — a single
   row that reserved room for "Earthworm" would leave a hole under "Frog". */
body.bioq-phone #topright{top:calc(var(--sat) + 10px);right:var(--pr);gap:7px;z-index:26}
body.bioq-phone #helpbtn{width:38px}
body.bioq-phone #specbtn{padding:8px 11px;gap:7px}
body.bioq-phone #specbtn .lbl{display:none}
body.bioq-phone #specbtn .specname{font-size:12.5px}
body.bioq-phone #obj{top:calc(var(--sat) + 54px);left:var(--pl);right:var(--pr);
  transform:none;min-width:0;max-width:none;width:auto;padding:10px 13px;gap:7px}
body.bioq-phone #objtxt{font-size:12.5px;line-height:1.4}
body.bioq-phone .objmain{gap:10px}
body.bioq-phone #hint{display:none}
body.bioq-phone #objhint{display:block}

/* the demonstrator, deliberately OVER the objective bar rather than under it.
   The objective's height depends on how long the objective is, so there is no
   offset below it that reliably clears it on every step; and while the
   demonstrator is speaking, what it is saying outranks the step you are already
   on. It takes itself away after a few seconds and the objective is back. */
body.bioq-phone #say{left:var(--pl);right:var(--pr);width:auto;
  top:calc(var(--sat) + 54px);bottom:auto;padding:12px 14px;z-index:27;
  transform:translateY(-8px) scale(.99)}
body.bioq-phone #say.on{transform:none}
body.bioq-phone #say .t{font-size:12.5px}

/* the instrument tray: a strip along the bottom, at thumb height, with the
   names spelled out. flex:1 1 0 and min-width:0 so six instruments always fit
   the width — a tray that scrolls sideways hides instruments, and an instrument
   nobody knows is there may as well not be. */
body.bioq-phone #dock{left:var(--pl);right:var(--pr);top:auto;bottom:var(--bot);
  display:flex;flex-direction:row;gap:6px;padding:7px;z-index:24;transform:none}
body.bioq-phone .tool{width:auto;height:58px;flex:1 1 0;min-width:0;border-radius:11px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
body.bioq-phone .tool svg{width:22px;height:22px}
body.bioq-phone .tool .tnum{display:none}
body.bioq-phone .tname{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;font-family:var(--mono);font-size:7.5px;letter-spacing:.05em;
  text-transform:uppercase;color:inherit;opacity:.85}
/* The selected marker was a bar off the LEFT edge, which means nothing once the
   tray runs horizontally. Underline the instrument instead. */
body.bioq-phone .tool.on::after{left:50%;top:auto;bottom:-6px;transform:translateX(-50%);
  width:24px;height:3px}

/* the rail becomes a bottom sheet, stacking UP from just above the tray. It is
   still pointer-events:none with only its panels interactive, so the empty part
   of the sheet is still specimen you can turn. */
body.bioq-phone #rail{left:0;right:0;top:auto;bottom:var(--above-dock);width:auto;
  padding:0 var(--pr) 0 var(--pl);max-height:62vh;gap:7px;justify-content:flex-end}
body.bioq-phone #rail #struct{max-height:30vh;overflow-y:auto;padding:12px 14px}
body.bioq-phone #struct .n{font-size:14px}
body.bioq-phone #vig{max-height:30vh}
body.bioq-phone #drawbody{max-height:40vh;gap:14px}
body.bioq-phone #railfoot{justify-content:flex-start;gap:6px;padding:7px}
/* Everything you tap grows to something a thumb can actually land on. */
body.bioq-phone .minibtn,body.bioq-phone .bchip{padding:9px 12px;font-size:9.5px}
body.bioq-phone .seg button{padding:9px 8px;font-size:9px}
body.bioq-phone .sysb{padding:8px 11px;font-size:9.5px}
body.bioq-phone .caseb{padding:10px 11px;font-size:11.5px}
body.bioq-phone #struct .act{padding:7px 10px}
body.bioq-phone .btn{padding:11px 16px;margin-bottom:8px}

/* the systems toggles are re-homed into the console (see buildShell), so they
   stop being a fixed panel and become a row of chips inside a drawer section */
body.bioq-phone #systems{position:static;transform:none;left:auto;top:auto;max-width:none;
  padding:0;background:none;border:none;box-shadow:none;justify-content:flex-start;gap:5px;
  backdrop-filter:none;-webkit-backdrop-filter:none}

/* the attempt record, full sheet, with its own way out — it is opened by the L
   key on a desktop and a phone has no L */
body.bioq-phone #rec{left:var(--pl);right:var(--pr);top:calc(var(--sat) + 10px);
  bottom:calc(var(--sab) + 10px);width:auto;z-index:28}
body.bioq-phone #recl{font-size:11px}
body.bioq-phone #recclose{position:absolute;right:10px;top:10px}
body.bioq-phone .mobonly{display:inline-flex}

/* hand tracking is not offered here at all (see buildShell for why), so the
   cockpit goes rather than sitting there as a control that would not work.
   The coach card is positioned defensively anyway — it costs one rule. */
body.bioq-phone #hand{display:none}
body.bioq-phone #coach{left:var(--pl);right:var(--pr);width:auto;bottom:var(--above-dock)}

/* the viva and the keyboard reference stop being dialogs and become the screen */
body.bioq-phone #viva,body.bioq-phone #keys{padding:0}
/* Full-screen sheets. The vertical insets were already here; a phone on its side
   puts the notch on the LEFT or RIGHT of these instead, so the horizontal gutters
   have to clear it too or the questions run underneath it. */
body.bioq-phone #vbox,body.bioq-phone #kbox{width:100%;height:100%;max-height:none;
  border-radius:0;padding:calc(var(--sat) + 20px) calc(var(--sar) + 18px)
                          calc(var(--sab) + 20px) calc(var(--sal) + 18px)}
body.bioq-phone #kgrps{column-count:1}

/* the tutor's question line sits above the tray. 16px on the input is not a
   style choice: iOS Safari zooms the whole page in on any focused field with a
   smaller font, and it does not zoom back out. */
body.bioq-phone #ask{left:var(--pl);right:var(--pr);width:auto;transform:none;
  bottom:var(--above-dock);z-index:29}
body.bioq-phone #askin{font-size:16px}

/* physio.js mounts a 352x278 bedside monitor at the top-left corner. There is
   no corner here, and nothing is lost by dropping it: #physline in the rail
   already carries the same numbers on one line, which is exactly what it was
   built for. This needs the body class to out-specify PHY_CSS, which is
   injected into head after this stylesheet. */
body.bioq-phone #phy-mon{display:none}

/* At 360px — the narrowest Android still in a classroom — each of the six
   instruments gets 49px, and "Retractor" is the one name that does not fit at
   the tracked-out size. Tighten the label rather than let it ellipsise: an
   instrument called "Retracto…" is worse than a slightly denser one. */
@media (max-width:380px){
  body.bioq-phone #dock{gap:5px;padding:6px}
  body.bioq-phone .tname{font-size:7px;letter-spacing:0}
}

/* a phone on its side is 390px tall, and the top rows plus the tray already
   claim 180 of it. The sheets get shorter and the objective drops to its text. */
@media (max-height:520px){
  body.bioq-phone{--dockh:58px}
  body.bioq-phone .tool{height:46px}
  body.bioq-phone .tool svg{width:19px;height:19px}
  body.bioq-phone #objdots{display:none}
  body.bioq-phone #objhint{display:none}
  body.bioq-phone #obj{padding:8px 12px}
  body.bioq-phone #rail{max-height:46vh}
  body.bioq-phone #rail #struct{max-height:26vh}
  body.bioq-phone #drawbody{max-height:34vh}
  body.bioq-phone #vig{max-height:24vh}
}
`;

/* Cleaner instrument glyphs — 24×24, stroked, rendered at 26px in the dock. */
const ICONS = {
  probe: '<path d="M4.5 19.5 14 10"/><circle cx="15.7" cy="8.3" r="1.8"/><path d="M3 21l2.4-2.4"/>',
  scalpel: '<path d="M3 21l8-8"/><path d="M11 13l5.6-6.6c.7-.8 2-.2 1.8.9L17 13l-4.2 1z"/>',
  forceps: '<path d="M8 3l3.3 10.6V20"/><path d="M16 3l-3.3 10.6"/>',
  pins: '<circle cx="12" cy="6" r="2.4"/><path d="M12 8.4V19"/><path d="M9.4 19h5.2"/>',
  retractor: '<path d="M4 12h4M8 8v8M8 8h2M8 16h2"/><path d="M20 12h-4M16 8v8M16 8h-2M16 16h-2"/>',
  // A stick running out of the bottom-left into a capsule head set at 45° —
  // stroked like the rest of the set, no fill, same 1.7 weight.
  swab: '<path d="M4 20L14.6 9.4"/>'
      + '<path d="M16.3 10.6L19.4 7.5a2 2 0 0 0-2.8-2.8L13.4 7.8a2 2 0 0 0 2.9 2.8z"/>',
};

/* Tool metadata. Order fixes the number badge (1..6) and MUST match main.js's
   keymap {1:probe,2:scalpel,3:forceps,4:pins,5:retractor,6:swab}. A main.js that
   has not yet learned key 6 simply leaves the swab click-only — the dock, the
   tooltip and the `tool` event all work regardless. */
const SHELL_TOOLS = [
  { id: 'probe',     name: 'Probe',     desc: 'Touch a structure to identify it' },
  { id: 'scalpel',   name: 'Scalpel',   desc: 'One drawn stroke to incise' },
  { id: 'forceps',   name: 'Forceps',   desc: 'Grip and reflect a cut edge' },
  { id: 'pins',      name: 'Pins',      desc: 'Anchor a limb under tension' },
  { id: 'retractor', name: 'Retractor', desc: 'Hold the body wall open' },
  { id: 'swab',      name: 'Swab',      desc: 'Take a surface sample, or dry the field' },
];

/* Teaching level. The tutor grades to the same four bands (TUT_LEVELS), so the
   ids here are its ids — a mismatch would silently grade everyone as A-level. */
const SHELL_LEVELS = [
  { id: 'school',    label: 'School' },
  { id: 'alevel',    label: 'A-level' },
  { id: 'undergrad', label: 'Undergrad' },
  { id: 'medical',   label: 'Medical' },
];

/* Modalities, in the order a radiographer would reach for them. ids match
   imaging.js's IMG_MODES exactly. */
const SHELL_IMG_MODES = [
  { id: 'off',        label: 'Off' },
  { id: 'xray',       label: 'X-ray' },
  { id: 'ct',         label: 'CT' },
  { id: 'mri',        label: 'MRI' },
  { id: 'ultrasound', label: 'US' },
];

/* Four stops rather than a slider: a student who wants less blood wants to pick
   "less", not to negotiate with a continuum. Moderate is the default. */
const SHELL_BLEED = [
  { k: 0,    label: 'Off',      note: 'No blood at all. Nothing else about the specimen changes.' },
  { k: 0.3,  label: 'Light',    note: 'A trace at the cut edge — enough to read the tissue planes.' },
  { k: 0.55, label: 'Moderate', note: 'What a well-drained preserved specimen actually does.' },
  { k: 1,    label: 'Full',     note: 'Fresh-tissue bleeding, as it would be in theatre.' },
];

/* Fallback for setKeymap(null) — the app should never show an empty help sheet. */
const SHELL_KEYMAP_DEF = [
  { key: '1–6', label: 'Select instrument',            group: 'Instruments' },
  { key: 'L',   label: 'Attempt record',               group: 'Session' },
  { key: 'V',   label: 'Viva',                         group: 'Session' },
  { key: 'N',   label: 'Narration on / off',           group: 'Session' },
  { key: 'M',   label: 'Theatre ambience',             group: 'Session' },
  { key: '\\',  label: 'Open the console',             group: 'Console' },
  { key: 'B',   label: 'Blood level',                  group: 'Console' },
  { key: '?',   label: 'This sheet',                   group: 'Console' },
  { key: 'Esc', label: 'Close whatever is open',       group: 'Console' },
];

/*
 * Is this a phone? Decided ONCE, at load, from two things:
 *
 *   - a coarse pointer, which is the only honest test for "this is a finger",
 *   - the SHORT edge of the viewport, because that is the one measure of a
 *     handset that does not change when the handset is turned on its side.
 *
 * Deliberately not a media query. The phone layout comes with structural
 * changes as well as CSS ones — the systems toggles move into the console, the
 * attempt record and the viva grow buttons because there is no keyboard to open
 * them with — and a query on max-width would hand a rotated phone the desktop
 * stylesheet while the DOM stayed rearranged for the phone. A query on
 * max-height would hand the phone layout to a short desktop window instead.
 *
 * 520px covers the largest handsets in portrait (a Pro Max is 440 CSS px wide)
 * and leaves tablets and unfolded foldables on the desktop layout, where their
 * width genuinely does carry the sidebars.
 *
 * main.js reads this too (as SH_PHONE — shell.js is concatenated ahead of it),
 * for the pixel-ratio cap and the post-processing tier.
 */
const SH_PHONE = (() => {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    if (!window.matchMedia('(pointer: coarse)').matches) return false;
    const short = Math.min(window.innerWidth || 0, window.innerHeight || 0);
    return short > 0 && short <= 520;
  } catch (e) { return false; }   // matchMedia throws in a few embedded webviews
})();

/* Everything the shell interpolates into innerHTML goes through this first:
   case labels and layer names arrive from data files, not from the shell. */
const SH_esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* MediaPipe 21-landmark bone graph, for drawing the on-panel skeleton. */
const HAND_CONN = [
  [0, 1], [1, 2], [2, 3], [3, 4],            // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],            // index
  [5, 9], [9, 10], [10, 11], [11, 12],       // middle
  [9, 13], [13, 14], [14, 15], [15, 16],     // ring
  [13, 17], [17, 18], [18, 19], [19, 20],    // pinky
  [0, 17],                                   // palm base
];
const HAND_TIPS = [4, 8, 12, 16, 20];

/* Gesture → chip label + colour key. */
const GST = {
  pinch: { t: 'Pinch — grip',   k: 'grip' },
  open:  { t: 'Open — release', k: 'ok' },
  point: { t: 'Point',          k: 'ok' },
  fist:  { t: 'Fist',           k: 'ok' },
  none:  { t: 'Ready',          k: 'dim' },
};

const OBJECTIVES = {
  frog: [
    { id: 'pin', text: 'Pin the frog out by its four limbs so the body wall comes under tension.',
      hint: 'Pins tool (4). Grip on each limb.',
      done: (s) => s.pinned.size >= 4 },
    { id: 'skin', text: 'Make a <b>midline incision</b> through the skin, from chest to vent.',
      hint: 'Scalpel (3). Hold your grip and draw one smooth stroke — do not saw.',
      done: (s) => s.incisions.has('skin') && s.incisions.get('skin').length > 1.1 },
    { id: 'reflect', text: 'Reflect the skin flaps to expose the muscle wall.',
      hint: 'Forceps (2 hands: 3). Grip the cut edge and draw it aside.',
      done: (s) => s.opened.has('skin') },
    { id: 'wall', text: 'Open the <b>muscle wall</b> — and watch for the ventral abdominal vein in the midline.',
      hint: 'Scalpel. A shallow first stroke; plunging cuts the vein beneath.',
      done: (s) => s.incisions.has('muscle-wall') },
    { id: 'open', text: 'Reflect the body wall and look into the cavity.',
      hint: 'Forceps on the cut edge, or the retractor with two hands.',
      done: (s) => s.opened.has('muscle-wall') },
    { id: 'identify', text: 'Identify the <b>liver</b>, <b>heart</b>, <b>lungs</b> and <b>intestine</b>.',
      hint: 'Probe (1) on each organ to identify it.',
      done: (s, seen) => ['liver-median', 'frog-heart', 'lung-left', 'small-intestine']
        .every((id) => seen.has(id)) },
    { id: 'liver', text: 'Lift the <b>liver</b> clear to expose the stomach and gall bladder beneath it.',
      hint: 'Forceps. Grip a lobe and draw it out of the cavity.',
      done: (s) => ['liver-left', 'liver-right', 'liver-median'].some((id) => s.removed.has(id)) },
    { id: 'kidney', text: 'Find the <b>kidneys</b> on the dorsal wall.',
      hint: 'They are retroperitoneal — behind everything else.',
      done: (s, seen) => seen.has('kidney-left') || seen.has('kidney-right') },
  ],
  heart: [
    { id: 'peri', text: 'Open the <b>pericardium</b> and trim the epicardial fat.',
      hint: 'Scalpel (3) on the sac, then forceps to reflect it.',
      done: (s) => s.incisions.has('pericardium') },
    { id: 'vessels', text: 'Identify the <b>aorta</b> — probe it, do not name it from the stump.',
      hint: 'Probe (1) on each great vessel.',
      done: (s, seen) => seen.has('aorta') },
    { id: 'open', text: 'Open the <b>left ventricle</b> in one drawn stroke.',
      hint: 'Scalpel. Smooth — sawing shreds the trabeculae.',
      done: (s) => s.incisions.has('lv-free-wall') },
    { id: 'chordae', text: 'Find the <b>chordae tendineae</b> and the papillary muscle.',
      hint: 'Probe them. They are what stop the valve inverting.',
      done: (s, seen) => [...seen].some((id) => id.startsWith('chordae-')) },
  ],
};

export function buildShell(root) {
  const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
  const handlers = {};
  const on = (n, fn) => { (handlers[n] = handlers[n] || []).push(fn); };
  const fire = (n, v) => (handlers[n] || []).forEach((f) => f(v));

  /* picker */
  const pick = el(`<div id="pick"><div class="in">
      <p class="kick">Biology Entelloq · Dissection Lab</p>
      <h1>Choose your <span>specimen</span></h1>
      <p class="tag">Dissect with your hands or the mouse — both do everything. Hand tracking runs entirely on your device; nothing is recorded.</p>
      <div id="cards"></div></div></div>`);
  root.appendChild(pick);

  /* chrome */
  const objBar = el(`<div id="obj" class="chrome">
      <div id="objdots"></div>
      <div class="objmain"><span class="lbl" id="objn">—</span><span id="objtxt">—</span></div>
      <div id="objhint"></div></div>`);
  // The hint has its own bar at the foot of a desktop viewport (#hint). On a
  // phone the foot is the instrument tray, and "what to do" and "how to do it"
  // belong on the same card anyway — so it is written to both, and CSS shows
  // whichever of the two that viewport has room for.
  const objHint = objBar.querySelector('#objhint');
  // A VISIBLE, always-present specimen switcher. The cold open loads the frog and
  // hides the picker, and a keyboard shortcut nobody is told about is not an access
  // path — a user with four specimens on the shelf could reach only one. This chip
  // shows what is on the table and opens the chooser on click.
  // Top-right cluster: a help button + the specimen switcher, in one right-anchored
  // row so they never overlap whatever the specimen name's width.
  const topRight = el(`<div id="topright"></div>`);
  const helpBtn = el(`<button id="helpbtn" class="chrome" title="Show all controls (?)">?</button>`);
  const specBtn = el(`<button id="specbtn" class="chrome" title="Change specimen">
      <span class="lbl">Specimen</span><b class="specname">—</b>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path
        d="M4 6l4-4 4 4M4 10l4 4 4-4" fill="none" stroke="currentColor"
        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`);
  specBtn.onclick = () => pick.classList.remove('gone');
  // The keyboard reference is the single place every control is spelled out; make it
  // reachable by a visible affordance, not only the ? key nobody is told about.
  helpBtn.onclick = () => keysEl.classList.toggle('on');
  topRight.appendChild(helpBtn); topRight.appendChild(specBtn);
  const dock = el(`<div id="dock" class="chrome"></div>`);
  const struct = el(`<div id="struct" class="chrome"><span class="lbl">Structure</span>
                     <div class="n">—</div><div class="d"></div><div class="sys lbl"></div>
                     <div class="acts"></div></div>`);
  const hint = el(`<div id="hint" class="chrome">—</div>`);
  const say = el(`<div id="say" class="chrome"><span class="lbl">Demonstrator</span><div class="t"></div></div>`);
  const handBox = el(`<div id="hand" class="chrome">
      <div class="handhead"><span class="lbl">Hand tracking</span><span id="handcount" class="hcount">—</span></div>
      <div id="selfwrap"><video id="selfview" muted playsinline></video><canvas id="skel"></canvas><span id="selflabel">You · live</span></div>
      <div id="handlive">
        <div id="handstat"><span class="dot"></span><span class="stxt">Camera off</span></div>
        <span id="gesturechip" class="gchip" data-k="dim">—</span>
        <div class="gripwrap"><span class="lbl">Grip</span><div class="griptrack"><div id="gripfill"></div></div></div>
      </div>
      <div id="camrow"><span class="lbl">Show camera</span>
        <button id="cambtn" class="tgl" role="switch" aria-checked="true"
          aria-label="Show camera"><i></i></button></div>
      <button id="handbtn" class="off">Use my hands</button>
      <div id="handnote" class="hnote">Drive the instruments with a pinch. Runs on-device — nothing is recorded.</div></div>`);
  const coach = el(`<div id="coach" class="chrome">
      <span class="lbl em">Your hands</span>
      <ul>
        <li><b>Pinch</b> your fingers to grip</li>
        <li>Move your hand to <b>aim</b> the instrument</li>
        <li><b>Open</b> your hand to let go</li>
        <li><b>Twist</b> your open hand like a dial to change instrument</li>
        <li><b>Flick</b> it sharply up or down to change instrument</li>
      </ul>
      <button id="coachok" class="minibtn">Got it</button></div>`);
  const systems = el(`<div id="systems" class="chrome"></div>`);
  const rec = el(`<div id="rec" class="chrome"><span class="lbl">Attempt record — press L</span>
                  <div id="recl"></div></div>`);
  const viva = el(`<div id="viva"><div id="vbox"><span class="lbl">Assessment</span>
                   <h2>Viva</h2><div id="vq"></div><div id="vbtns"></div></div></div>`);

  /* ── the right rail ────────────────────────────────────────────────────
     Everything added after the first build lives here, in one column at the
     edge: a physiology status line, the structure readout (re-homed from its
     own fixed corner so it can never collide with the case note), the case
     note, and — at the foot — a single drawer holding every secondary
     control. The drawer is shut on load. Nothing here touches the centre. */
  const rail = el(`<div id="rail"></div>`);
  const physline = el(`<div id="physline" class="chrome"><span class="dot"></span><span class="v"></span></div>`);
  const vig = el(`<div id="vig" class="chrome"></div>`);
  const drawer = el(`<div id="drawer">
      <div id="drawbody" class="chrome">
        <div class="dsec" id="secblood"><span class="lbl">Blood</span>
          <div class="seg bleed" id="bleedseg"></div>
          <div class="dnote" id="bleednote"></div></div>
        <div class="dsec" id="seclevel"><span class="lbl">Level</span>
          <div class="seg" id="levelseg"></div></div>
        <div class="dsec off" id="secimg"><span class="lbl">Imaging</span>
          <div class="seg" id="imgseg"></div>
          <div class="slice"><span class="lbl">Slice</span>
            <input id="imgslice" type="range" min="0" max="1000" value="500" aria-label="Slice position">
            <span class="lbl" id="imgpos">—</span></div>
          <div class="rad" id="imgrad"></div></div>
        <div class="dsec hide" id="seccases"><span class="lbl">Pathology</span>
          <div class="caselist" id="caselist"></div></div>
        <div class="dsec hide" id="secdepth"><span class="lbl">Depth</span>
          <div class="ladder" id="ladder"></div></div>
      </div>
      <div id="railfoot" class="chrome"></div></div>`);

  const ask = el(`<div id="ask" class="chrome">
      <div class="q"></div>
      <div class="askline"><span class="car">&rsaquo;</span><input id="askin" type="text"
        autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="Say what you see, in your own words"></div>
      <div class="k">Enter · send &nbsp; Esc · skip</div></div>`);
  const keysEl = el(`<div id="keys"><div id="kbox"><span class="lbl">Reference</span>
      <h2>Keyboard</h2><div id="kgrps"></div>
      <div class="foot">? or Esc to close</div></div></div>`);

  [objBar, topRight, dock, hint, say, handBox, systems, rec, viva, coach, rail, ask, keysEl]
    .forEach((n) => root.appendChild(n));
  [physline, struct, vig, drawer].forEach((n) => rail.appendChild(n));

  /* tool dock */
  SHELL_TOOLS.forEach((t, i) => {
    // .tname is display:none everywhere but the phone tray, where the hover
    // tooltip below cannot exist and the glyph alone does not tell a student
    // which of these is the retractor.
    const b = el(`<button class="tool${i === 0 ? ' on' : ''}" data-tool="${t.id}" aria-label="${t.name}">
        <svg viewBox="0 0 24 24">${ICONS[t.id]}</svg><i class="tnum">${i + 1}</i>
        <span class="tname">${t.name}</span>
        <span class="ttip"><b>${t.name}</b><s>${t.desc}</s><em>Key ${i + 1}</em></span></button>`);
    b.onclick = () => { setTool(t.id); fire('tool', t.id); };
    dock.appendChild(b);
  });

  /* hand-cockpit element refs */
  const handBtn = handBox.querySelector('#handbtn');
  const selfview = handBox.querySelector('#selfview');
  const skel = handBox.querySelector('#skel');
  const handStat = handBox.querySelector('#handstat');
  const gchip = handBox.querySelector('#gesturechip');
  const gripfill = handBox.querySelector('#gripfill');
  const handCount = handBox.querySelector('#handcount');
  const handNote = handBox.querySelector('#handnote');
  const camBtn = handBox.querySelector('#cambtn');
  const selfwrap = handBox.querySelector('#selfwrap');
  const selflabel = handBox.querySelector('#selflabel');
  const coachOk = coach.querySelector('#coachok');
  skel.width = 240; skel.height = 180;
  const skelCtx = skel.getContext ? skel.getContext('2d') : null;

  /* state */
  let spec = null, objIdx = 0, seen = new Set(), events = [], seq = 0, holdUntil = 0;

  function setTool(t) {
    dock.querySelectorAll('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  }

  function sayMsg(text, opts) {
    const o = opts || {};
    const now = performance.now();
    if (!o.consequence && now < holdUntil) return;
    if (o.consequence) holdUntil = now + 9000;
    say.querySelector('.t').textContent = text;
    say.classList.toggle('warn', !!o.consequence);
    say.classList.add('on');
    clearTimeout(sayMsg._t);
    sayMsg._t = setTimeout(() => say.classList.remove('on'), o.consequence ? 9000 : 6500);
  }

  function setStructure(s) {
    if (!s || !s.name) { struct.classList.remove('on'); return; }
    struct.classList.add('on');
    struct.querySelector('.n').textContent = s.name;
    struct.querySelector('.d').textContent = s.note || '';
    struct.querySelector('.sys').textContent = s.system || '';
    if (s.actions !== undefined) setActions(s.actions);
  }

  let actionCb = null;
  /* list = [{id, label, key}]. Rendered only while a structure is hovered, so the
     offer disappears with the thing it was about instead of becoming furniture. */
  function setActions(list, cb) {
    if (cb) actionCb = cb;
    const box = struct.querySelector('.acts');
    if (!box) return;
    box.innerHTML = '';
    (list || []).forEach((a) => {
      if (!a || !a.label) return;
      const b = el(`<button class="act" type="button"><span></span>${a.key ? `<kbd>${a.key}</kbd>` : ''}</button>`);
      b.querySelector('span').textContent = a.label;
      b.onclick = (e) => { e.stopPropagation(); if (actionCb) actionCb(a.id); };
      box.appendChild(b);
    });
  }

  function refreshObjective(state) {
    const sid = spec && spec.id;
    const list = OBJECTIVES[sid]
      || (typeof SPECIMEN_OBJECTIVES !== 'undefined' && SPECIMEN_OBJECTIVES[sid])
      || [];
    while (objIdx < list.length && list[objIdx].done(state, seen)) {
      pushEvent({ kind: 'objective', text: 'Objective complete: ' + list[objIdx].id });
      objIdx++;
    }
    const dots = objBar.querySelectorAll('#objdots span');
    dots.forEach((d, i) => { d.className = i < objIdx ? 'done' : (i === objIdx ? 'now' : ''); });
    if (objIdx >= list.length) {
      objBar.querySelector('#objn').textContent = 'Complete';
      objBar.querySelector('#objtxt').innerHTML = SH_PHONE
        ? '<b>Dissection complete.</b> The viva is in the console.'
        : '<b>Dissection complete.</b> Press V for the viva.';
      // A phone has no V and no L, so it is told where the two buttons are.
      hint.innerHTML = SH_PHONE
        ? 'Open the <b>console</b> for the viva and your record'
        : 'Press <b>V</b> for the viva · <b>L</b> for your record';
      if (objHint) objHint.innerHTML = hint.innerHTML;
      return;
    }
    objBar.querySelector('#objn').textContent = 'Step ' + (objIdx + 1) + ' / ' + list.length;
    objBar.querySelector('#objtxt').innerHTML = list[objIdx].text;
    hint.innerHTML = list[objIdx].hint;
    if (objHint) objHint.innerHTML = hint.innerHTML;
  }

  function pushEvent(evt) {
    if (evt.kind === 'hover') return;
    if (evt.kind === 'discover' && evt.partId) seen.add(evt.partId);
    if (evt.kind === 'lift' && evt.partId) seen.add(evt.partId);
    seq++;
    events.push(evt);
    const l = rec.querySelector('#recl');
    const d = document.createElement('div');
    d.className = 'ev ' + (evt.kind || '');
    d.innerHTML = `<span class="s">${String(seq).padStart(3, '0')}</span>${evt.text || evt.kind}`;
    l.insertBefore(d, l.firstChild);
  }

  function setSpecimen(s, parts) {
    spec = s; objIdx = 0; seen = new Set(); events = []; seq = 0;
    pick.classList.add('gone');
    const nameEl = specBtn.querySelector('.specname');
    if (nameEl) nameEl.textContent = s.name || '—';
    // Built-in objectives for frog/heart; self-registered ones (fish, earthworm, …)
    // arrive via the shared SPECIMEN_OBJECTIVES registry that anatomy.js declares.
    const list = OBJECTIVES[s.id]
      || (typeof SPECIMEN_OBJECTIVES !== 'undefined' && SPECIMEN_OBJECTIVES[s.id])
      || [];
    objBar.querySelector('#objdots').innerHTML = list.map(() => '<span></span>').join('');
    systems.innerHTML = '';
    const sys = [...new Set(parts.map((p) => p.system))];
    sys.forEach((name) => {
      const b = el(`<button class="sysb" data-sys="${name}">${name}</button>`);
      b.onclick = () => {
        b.classList.toggle('off');
        const off = b.classList.contains('off');
        parts.filter((p) => p.system === name).forEach((p) => { p.mesh.userData.sysHidden = off; });
        parts.forEach((p) => { if (p.mesh.userData.sysHidden) p.mesh.visible = false; });
      };
      systems.appendChild(b);
    });
    // Per-specimen surfaces are stale the moment the specimen changes: a heart
    // case note over a frog is worse than no case note. Preferences (blood
    // level, teaching level) deliberately survive.
    setVignette(null);
    setCases(null);
    setStrata(null, 0);
    refreshObjective({ pinned: new Set(), incisions: new Map(), opened: new Set(), removed: new Set() });
  }

  function showViva(state) {
    const qs = [];
    const dmg = state.damage || [];
    if (spec && spec.id === 'frog') {
      qs.push({ q: 'Why do you pin the specimen out before making any incision?',
        a: 'Without tension the body wall slides away from the blade, so the cut wanders and goes too deep.' });
      if (dmg.some((d) => d.partId === 'ventral-abdominal-vein'))
        qs.push({ q: 'You cut the ventral abdominal vein. Where does it run, and how is it avoided?',
          a: 'In the midline of the muscle wall, immediately beneath your incision line. You lift the wall with forceps and cut onto a raised fold, not down into a flat surface.' });
      else
        qs.push({ q: 'The ventral abdominal vein sits directly under your midline cut. How did you avoid it?',
          a: 'By keeping the first stroke shallow and lifting the wall rather than pressing into it.' });
      qs.push({ q: 'Why can you not see the stomach until the liver is moved?',
        a: 'The liver is three large lobes filling the anterior cavity; the stomach lies behind and to the animal\'s left.' });
      qs.push({ q: 'The kidneys stayed put when you lifted the gut. Why?',
        a: 'They are retroperitoneal — attached to the dorsal body wall rather than suspended in mesentery.' });
    } else {
      qs.push({ q: 'You opened the left ventricle. What tells you it is the left and not the right?',
        a: 'Wall thickness and compliance — the left is markedly thicker because it drives the systemic circuit.' });
      qs.push({ q: 'What do the chordae tendineae actually do?',
        a: 'They anchor the valve leaflets to the papillary muscles so the valve cannot invert under ventricular pressure.' });
    }
    if (dmg.length)
      qs.push({ q: 'You damaged ' + dmg.length + ' structure' + (dmg.length > 1 ? 's' : '') + '. Does that change your findings?',
        a: 'It changes what you can still demonstrate. Damage is a property of the specimen, not of the biology — the skill is telling the two apart: ' + dmg.map((d) => d.text).join(' ') });

    viva.querySelector('#vq').innerHTML = qs.map((x) =>
      `<div class="qa"><div class="q">${x.q}</div><div class="a">${x.a}</div></div>`).join('');
    viva.querySelector('#vbtns').innerHTML =
      '<button class="btn" id="vclose">Back to the specimen</button>' +
      '<button class="btn" id="vnew">New specimen</button>';
    viva.querySelector('#vclose').onclick = () => viva.classList.remove('on');
    viva.querySelector('#vnew').onclick = () => location.reload();
    viva.classList.add('on');
  }

  /* ── the console ───────────────────────────────────────────────────────
     Blood, level, imaging, cases and depth, in that order: the blood control
     is first because it is the one a squeamish fourteen-year-old needs to
     find in a hurry, and its current setting is mirrored on the always-visible
     chip in the rail foot so it is one click away with the drawer shut. */
  const drawBody = drawer.querySelector('#drawbody');
  const railFoot = drawer.querySelector('#railfoot');
  const secBlood = drawer.querySelector('#secblood');
  const secImg = drawer.querySelector('#secimg');
  const secCases = drawer.querySelector('#seccases');
  const secDepth = drawer.querySelector('#secdepth');
  const bleedSeg = drawer.querySelector('#bleedseg');
  const bleedNote = drawer.querySelector('#bleednote');
  const levelSeg = drawer.querySelector('#levelseg');
  const imgSeg = drawer.querySelector('#imgseg');
  const sliceIn = drawer.querySelector('#imgslice');
  const posEl = drawer.querySelector('#imgpos');
  const radEl = drawer.querySelector('#imgrad');
  const caseList = drawer.querySelector('#caselist');
  const ladder = drawer.querySelector('#ladder');
  const askIn = ask.querySelector('#askin');
  const kgrps = keysEl.querySelector('#kgrps');

  const bloodChip = el(`<button class="bchip" data-k="2"><i></i><span>Blood · Moderate</span></button>`);
  const xrBtn = el(`<button class="minibtn vr">Enter VR</button>`);
  const drawBtn = el(`<button class="minibtn">Console</button>`);
  xrBtn.style.display = 'none';
  [bloodChip, xrBtn, drawBtn].forEach((b) => railFoot.appendChild(b));

  let bleedIdx = 2, level = 'alevel', imgMode = 'off';
  let activeCase = null, caseCb = null, askCb = null, keyRows = SHELL_KEYMAP_DEF;

  function setDrawer(open) {
    drawer.classList.toggle('open', !!open);
    drawBtn.classList.toggle('on', !!open);
    drawBtn.textContent = open ? 'Close' : 'Console';
  }
  drawBtn.onclick = () => setDrawer(!drawer.classList.contains('open'));
  function revealBlood() {
    setDrawer(true);
    drawBody.scrollTop = 0;
    secBlood.classList.remove('flash');
    void secBlood.offsetWidth;
    secBlood.classList.add('flash');
  }
  bloodChip.onclick = revealBlood;

  /* blood */
  SHELL_BLEED.forEach((b, i) => {
    const btn = el(`<button data-i="${i}">${b.label}</button>`);
    btn.onclick = () => applyBleed(i, true);
    bleedSeg.appendChild(btn);
  });
  function applyBleed(i, emit) {
    bleedIdx = Math.max(0, Math.min(SHELL_BLEED.length - 1, i | 0));
    const b = SHELL_BLEED[bleedIdx];
    bleedSeg.querySelectorAll('button').forEach((x, n) => x.classList.toggle('on', n === bleedIdx));
    bleedNote.textContent = b.note;
    bloodChip.dataset.k = String(bleedIdx);
    bloodChip.querySelector('span').textContent = 'Blood · ' + b.label;
    if (emit) fire('bleeding', b.k);
  }
  function setBleeding(s) {
    s = s || {};
    if (s.enabled === false) { applyBleed(0, false); return; }
    if (typeof s.intensity === 'number') {
      let best = bleedIdx, bd = Infinity;
      SHELL_BLEED.forEach((b, i) => {
        const d = Math.abs(b.k - s.intensity);
        if (d < bd) { bd = d; best = i; }
      });
      applyBleed(best, false);
      return;
    }
    applyBleed(bleedIdx, false);
  }

  /* level */
  SHELL_LEVELS.forEach((L) => {
    const btn = el(`<button data-id="${L.id}">${L.label}</button>`);
    btn.onclick = () => { setLevel(L.id); fire('level', level); };
    levelSeg.appendChild(btn);
  });
  function setLevel(l) {
    if (SHELL_LEVELS.some((x) => x.id === l)) level = l;
    levelSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === level));
  }

  /* imaging */
  SHELL_IMG_MODES.forEach((m) => {
    const btn = el(`<button data-id="${m.id}">${m.label}</button>`);
    btn.onclick = () => { setImaging({ mode: m.id }); fire('imaging', m.id); };
    imgSeg.appendChild(btn);
  });
  sliceIn.addEventListener('input', () => { fire('slice', Number(sliceIn.value) / 1000); });
  function setImaging(s) {
    s = s || {};
    if (typeof s.mode === 'string') imgMode = s.mode;
    imgSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === imgMode));
    const live = !!imgMode && imgMode !== 'off';
    secImg.classList.toggle('off', !live);
    // Never fight the student's thumb: leave the slider alone while it has focus.
    if (typeof s.slice === 'number' && document.activeElement !== sliceIn)
      sliceIn.value = String(Math.round(Math.max(0, Math.min(1, s.slice)) * 1000));
    posEl.textContent = typeof s.sliceMm === 'number'
      ? (s.sliceMm >= 0 ? '+' : '') + s.sliceMm.toFixed(1) + ' mm' : '—';
    const m = SHELL_IMG_MODES.find((x) => x.id === imgMode);
    const rows = ['<i>MOD</i>' + SH_esc(live && m ? m.label : 'standby')];
    const w = s.window;
    if (live && w && typeof w.level === 'number' && typeof w.width === 'number')
      rows.push('<i>WL</i>' + Math.round(w.level) + ' &nbsp; <i>WW</i>' + Math.round(w.width));
    if (imgMode === 'mri' && s.weighting)
      rows.push('<i>SEQ</i>' + SH_esc(String(s.weighting)) + '-weighted');
    radEl.innerHTML = rows.join('<br>');
  }

  /* pathology cases — the label only. list() never carries the diagnosis and
     this must never invent one; the picker is a chooser, not an answer key. */
  function markCase(id) {
    activeCase = id || null;
    caseList.querySelectorAll('.caseb').forEach((b) => {
      const bid = b.classList.contains('none') ? null : (b.dataset.id || null);
      b.classList.toggle('on', bid === activeCase);
    });
  }
  function setCases(list, cb) {
    if (typeof cb === 'function') caseCb = cb;
    const app = (Array.isArray(list) ? list : []).filter((c) => c && c.applicable);
    caseList.innerHTML = '';
    if (!app.length) { secCases.classList.add('hide'); activeCase = null; return; }
    secCases.classList.remove('hide');
    const none = el(`<button class="caseb none">Healthy specimen</button>`);
    none.onclick = () => { markCase(null); if (caseCb) caseCb(null); };
    caseList.appendChild(none);
    app.forEach((c) => {
      const b = el(`<button class="caseb" data-id="${SH_esc(c.id)}">${SH_esc(c.label || c.id)}</button>`);
      b.onclick = () => { markCase(c.id); if (caseCb) caseCb(c.id); };
      caseList.appendChild(b);
    });
    markCase(activeCase);
  }

  /* depth ladder */
  function setStrata(stack, depth) {
    const list = (Array.isArray(stack) ? stack : []).filter((s) => s);
    if (!list.length) { secDepth.classList.add('hide'); ladder.innerHTML = ''; return; }
    secDepth.classList.remove('hide');
    const d = typeof depth === 'number' ? depth : 0;
    ladder.innerHTML = list.map((s) => {
      const L = typeof s.layer === 'number' ? s.layer : 0;
      const cls = L < d ? ' past' : (L === d ? ' now' : '');
      return '<div class="rung' + cls + '"><i></i><span class="d">'
        + String(L).padStart(2, '0') + '</span><span class="t">'
        + SH_esc(s.name || s.id || ('Layer ' + L)) + '</span></div>';
    }).join('');
  }

  /* ── case note ─────────────────────────────────────────────────────────
     A chart entry: who, what happened, what was found, what you are asked to
     do. Deliberately NOT the diagnosis — only the named history fields are
     read, so a vignette that happens to carry one still cannot leak it. */
  function setVignette(v) {
    if (!v || !(v.label || v.presentation)) { vig.classList.remove('on'); vig.innerHTML = ''; return; }
    const who = [
      typeof v.age === 'number' ? v.age + ' yr' : (v.age ? String(v.age) : ''),
      v.sex ? String(v.sex) : '',
    ].filter(Boolean).join(' · ');
    const rows = [['Presentation', v.presentation], ['History', v.history],
                  ['On examination', v.examination]].filter((r) => r[1]);
    vig.innerHTML =
      '<div class="vhead"><span class="lbl em">Case note</span>'
      + (who ? '<span class="vwho">' + SH_esc(who) + '</span>' : '') + '</div>'
      + (v.label ? '<div class="vlab">' + SH_esc(v.label) + '</div>' : '')
      + (rows.length ? '<dl>' + rows.map((r) =>
          '<dt>' + r[0] + '</dt><dd>' + SH_esc(r[1]) + '</dd>').join('') + '</dl>' : '')
      + (v.prompt ? '<dl><dt>You are asked to</dt><dd class="ask">'
          + SH_esc(v.prompt) + '</dd></dl>' : '')
      + '<div class="vfoot">No diagnosis is given. Work it out from the specimen.</div>';
    vig.classList.add('on');
    vig.scrollTop = 0;
  }

  /* ── physiology presence ───────────────────────────────────────────────
     physio.js mounts its own monitor at top-left. This is a presence line,
     not a second monitor, and it lives at the top of the rail so it cannot
     land anywhere near #phy-mon. */
  function setPhysio(s) {
    s = s || {};
    if (!s.running) { physline.classList.remove('on'); return; }
    const bits = ['<b>Physiology live</b>'];
    if (typeof s.hr === 'number') bits.push('HR ' + Math.round(s.hr));
    if (s.bp != null) {
      const bp = typeof s.bp === 'string' ? s.bp
        : Array.isArray(s.bp) ? Math.round(s.bp[0] || 0) + '/' + Math.round(s.bp[1] || 0)
        : Math.round(s.bp.sys || 0) + '/' + Math.round(s.bp.dia || 0);
      bits.push('BP ' + bp);
    }
    if (typeof s.spo2 === 'number') bits.push('SpO2 ' + Math.round(s.spo2) + '%');
    physline.querySelector('.v').innerHTML = bits.join(' · ');
    physline.classList.add('on');
  }

  /* ── XR ────────────────────────────────────────────────────────────────
     fire() runs its handlers synchronously inside this click, which is the
     whole point: requestSession() needs an unconsumed user gesture, and an
     await anywhere between the click and the call throws SecurityError. */
  xrBtn.onclick = () => { fire('xr'); };
  function setXR(s) {
    s = s || {};
    xrBtn.style.display = s.available ? '' : 'none';
    xrBtn.textContent = s.presenting ? 'Exit VR' : 'Enter VR';
    xrBtn.classList.toggle('live', !!s.presenting);
  }

  /* ── the tutor's question line ─────────────────────────────────────────
     The input eats its own keydowns before they reach document or window, so
     typing "probe the vein" cannot fire p/r/o/b/e as tool shortcuts. main.js
     can also ask via inputOpen(), but does not have to: the stopPropagation
     below already protects a handler that never checks. */
  function inputOpen() { return ask.classList.contains('on'); }
  function closeAsk(val) {
    if (!inputOpen()) return;
    ask.classList.remove('on');
    root.classList.remove('asking');
    const cb = askCb; askCb = null;
    try { askIn.blur(); } catch (e) { /* detached */ }
    if (cb) cb(val);
  }
  function askInput(promptText, cb) {
    askCb = typeof cb === 'function' ? cb : null;
    ask.querySelector('.q').textContent = promptText || '';
    askIn.value = '';
    ask.classList.add('on');
    root.classList.add('asking');
    // Focus after the class lands, or the element is still display:none.
    setTimeout(() => { try { askIn.focus(); } catch (e) { /* detached */ } }, 0);
  }
  askIn.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); closeAsk(askIn.value.trim()); }
    else if (e.key === 'Escape') { e.preventDefault(); closeAsk(null); }
  });

  /* ── keyboard reference ────────────────────────────────────────────────── */
  function setKeymap(rows) {
    const list = (Array.isArray(rows) ? rows : []).filter((r) => r && r.key);
    keyRows = list.length ? list : SHELL_KEYMAP_DEF;
    const groups = [];
    keyRows.forEach((r) => {
      const g = r.group || 'General';
      let e = groups.find((x) => x.g === g);
      if (!e) { e = { g: g, rows: [] }; groups.push(e); }
      e.rows.push(r);
    });
    kgrps.innerHTML = groups.map((e) =>
      '<div class="kgrp"><span class="lbl">' + SH_esc(e.g) + '</span>'
      + e.rows.map((r) => '<div class="krow"><kbd>' + SH_esc(r.key) + '</kbd><s>'
          + SH_esc(r.label || '') + '</s></div>').join('')
      + '</div>').join('');
  }
  keysEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  keysEl.addEventListener('click', (e) => { if (e.target === keysEl) keysEl.classList.remove('on'); });

  /* console defaults. Nothing fires on load — the drawer is shut and silent. */
  applyBleed(2, false);
  setLevel('alevel');
  setImaging({ mode: 'off' });
  setKeymap(null);
  setDrawer(false);

  document.addEventListener('keydown', (e) => {
    // While the student is typing prose, the app has no shortcuts at all.
    // Stopping here also stops main.js, whose listener is on window and so
    // runs after document in the bubble phase.
    const t = e.target;
    if (inputOpen() || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) {
      e.stopPropagation();
      return;
    }
    const k = (e.key || '').toLowerCase();
    if (e.key === '?') { e.preventDefault(); keysEl.classList.toggle('on'); return; }
    if (k === 'l') rec.classList.toggle('on');
    if (k === '\\') setDrawer(!drawer.classList.contains('open'));
    if (k === 'b') revealBlood();
    if (k === 'escape') {
      rec.classList.remove('on'); viva.classList.remove('on');
      keysEl.classList.remove('on'); setDrawer(false);
    }
    if (k === 'v') fire('viva');
  });

  /* ── hand cockpit ─────────────────────────────────────────────────────── */
  let handOn = false;
  handBtn.onclick = () => { handOn = !handOn; fire('hands', handOn); };

  /* ── show-camera preference ────────────────────────────────────────────
     Hand tracking and the camera PICTURE are two different things: the tracker
     needs the frames, the student does not need to watch themselves. This
     switch turns off the picture in both places it appears — the full-viewport
     ambient plate behind the scene (main.js hands it to handviz) and the
     thumbnail in this panel — and changes nothing else. A control called "Show
     camera" that left a live video of your face in the corner would be a lie.

     Wrapped in try/catch because localStorage throws in private mode and when
     storage is blocked, and a preference is never worth taking the app down for. */
  const CAM_KEY = 'bioq_show_camera';
  let camOn = true;
  try { camOn = window.localStorage.getItem(CAM_KEY) !== '0'; } catch (e) { /* default on */ }

  function renderCam() {
    camBtn.setAttribute('aria-checked', camOn ? 'true' : 'false');
    selfwrap.classList.toggle('nocam', !camOn);
    // The label is a claim about what you are looking at, so it has to change too.
    selflabel.textContent = camOn ? 'You · live' : 'Tracking · live';
  }
  function setCam(v) {
    camOn = !!v;
    try { window.localStorage.setItem(CAM_KEY, camOn ? '1' : '0'); } catch (e) { /* fine */ }
    renderCam();
    fire('camera', camOn);
  }
  camBtn.onclick = () => setCam(!camOn);
  renderCam();

  // What the panel is showing right now. setHandState writes the lifecycle bits
  // (on/status/health/reason) and the poll loop, when the live tracker snapshot
  // is reachable, writes the fast-moving bits (gesture/grip/count) and the
  // skeleton. Both drive one render — there is no second source of truth.
  const H = { on: false, status: 'off', health: 3, gesture: 'none', grip: 0, count: 0, reason: '' };
  let coachShown = false;

  // The tracker publishes its snapshot on window.__LAB (the app's introspection
  // surface). Reading it is optional: if it is absent the panel still works from
  // whatever setHandState passes — it just won't draw the live skeleton.
  function getSnap() {
    try { const l = typeof window !== 'undefined' && window.__LAB; return l && l.handsApi && l.handsApi.snapshot; }
    catch (e) { return null; }
  }

  function clearSkel() { if (skelCtx) skelCtx.clearRect(0, 0, skel.width, skel.height); }

  function drawSkel(snap) {
    if (!skelCtx) return;
    const w = skel.width, h = skel.height;
    skelCtx.clearRect(0, 0, w, h);
    const hs = snap.hands || [];
    for (let n = 0; n < hs.length; n++) {
      const hnd = hs[n];
      if (!hnd || !hnd.present || !hnd.landmarks) continue;
      const lm = hnd.landmarks;
      const pinch = hnd.isPinching;
      const line = pinch ? 'rgba(56,224,216,.95)' : 'rgba(52,211,153,.9)';
      const glow = pinch ? 'rgba(56,224,216,.85)' : 'rgba(52,211,153,.6)';
      // bones
      skelCtx.lineCap = 'round'; skelCtx.lineJoin = 'round';
      skelCtx.lineWidth = 2; skelCtx.strokeStyle = line;
      skelCtx.shadowBlur = 7; skelCtx.shadowColor = glow;
      skelCtx.beginPath();
      for (let c = 0; c < HAND_CONN.length; c++) {
        const a = lm[HAND_CONN[c][0]], b = lm[HAND_CONN[c][1]];
        skelCtx.moveTo(a.x * w, a.y * h); skelCtx.lineTo(b.x * w, b.y * h);
      }
      skelCtx.stroke();
      // joints
      skelCtx.shadowBlur = 0; skelCtx.fillStyle = line;
      for (let k = 0; k < 21; k++) {
        skelCtx.beginPath(); skelCtx.arc(lm[k].x * w, lm[k].y * h, 1.7, 0, 6.2832); skelCtx.fill();
      }
      // fingertips — the reference's "glowing tips"
      skelCtx.shadowBlur = 8; skelCtx.shadowColor = 'rgba(56,224,216,.95)';
      skelCtx.fillStyle = 'rgba(56,224,216,1)';
      for (let k = 0; k < HAND_TIPS.length; k++) {
        const p = lm[HAND_TIPS[k]];
        skelCtx.beginPath(); skelCtx.arc(p.x * w, p.y * h, 2.6, 0, 6.2832); skelCtx.fill();
      }
    }
    skelCtx.shadowBlur = 0;
  }

  let pollRAF = 0;
  function pollHands() {
    pollRAF = requestAnimationFrame(pollHands);
    const snap = getSnap();
    if (snap && snap.active) {
      const hs = snap.hands || [];
      let present = 0, anyPinch = false;
      for (let i = 0; i < hs.length; i++) {
        if (hs[i] && hs[i].present) { present++; if (hs[i].isPinching) anyPinch = true; }
      }
      // The input router and main.js both report the FIRST slot as the driving
      // hand — mirror that so the meter reflects what is actually moving the tool.
      const driver = hs[0] && hs[0].present ? hs[0] : null;
      H.count = present;
      H.health = snap.health;
      if (H.status !== 'failed') H.status = 'tracking';
      if (driver) { H.gesture = driver.gesture; H.grip = driver.pinchStrength; }
      else { H.gesture = 'none'; H.grip = 0; }
      drawSkel(snap);
      if (anyPinch) hideCoach();
    } else {
      clearSkel();
    }
    renderHand();
  }
  function startPoll() { if (!pollRAF) pollRAF = requestAnimationFrame(pollHands); }
  function stopPoll() { if (pollRAF) { cancelAnimationFrame(pollRAF); pollRAF = 0; } clearSkel(); }

  function showCoach() {
    coach.classList.add('on');
    clearTimeout(showCoach._t);
    showCoach._t = setTimeout(hideCoach, 7000);
  }
  function hideCoach() { coach.classList.remove('on'); clearTimeout(showCoach._t); }
  coachOk.onclick = hideCoach;

  function renderHand() {
    const tracking = H.on && H.status === 'tracking';
    handBox.classList.toggle('live', H.on && H.status !== 'failed');
    handBtn.textContent = H.on ? 'Stop camera' : 'Use my hands';
    handBtn.classList.toggle('off', !H.on);

    // status dot + text
    let cls = '', txt;
    if (!H.on) { txt = H.reason || 'Camera off'; }
    else if (H.status === 'starting') { cls = 'warm'; txt = 'Starting camera…'; }
    else if (H.status === 'failed') { cls = 'lost'; txt = H.reason || 'Could not start'; }
    else if (H.health >= 3) { cls = 'lost'; txt = 'Hand lost — show your hand'; }
    else if (H.health === 2) { cls = 'deg'; txt = 'Tracking degraded'; }
    else { cls = 'ok'; txt = 'Tracking'; }
    handStat.className = cls;
    handStat.querySelector('.stxt').textContent = txt;

    // hand count
    handCount.textContent = !tracking ? '—'
      : H.count >= 2 ? '2 hands' : H.count === 1 ? '1 hand' : 'No hand';

    // gesture chip
    const g = GST[H.gesture] || GST.none;
    const chipLive = tracking && H.count > 0;
    gchip.textContent = chipLive ? g.t : '—';
    gchip.dataset.k = chipLive ? g.k : 'dim';

    // grip meter
    const grip = tracking ? Math.max(0, Math.min(1, H.grip || 0)) : 0;
    gripfill.style.transform = 'scaleX(' + grip.toFixed(3) + ')';
    gripfill.dataset.on = grip > 0.55 ? '1' : '0';

    // note
    handNote.textContent = H.on
      ? 'Nothing is recorded. Keyboard 1–5 and the mouse still work.'
      : 'Drive the instruments with a pinch. Runs on-device — nothing is recorded.';
  }

  function setHandState(s) {
    s = s || {};
    H.on = !!s.on;
    handOn = H.on;
    H.status = !s.on ? 'off' : (s.status || 'tracking');
    H.reason = s.reason || '';
    if (typeof s.health === 'number') H.health = s.health;
    // Optional extensions — used only if a caller passes them; the live poll
    // overrides these whenever the tracker snapshot is reachable.
    if (typeof s.grip === 'number') H.grip = s.grip;
    if (typeof s.gesture === 'string') H.gesture = s.gesture;
    if (typeof s.hands === 'number') H.count = s.hands;

    // Bind the mirrored self-view to the tracker's camera stream.
    if (s.video && selfview.srcObject !== s.video.srcObject) {
      selfview.srcObject = s.video.srcObject;
      selfview.play().catch(() => {});
    }
    if (!s.on) { selfview.srcObject = null; H.count = 0; H.grip = 0; H.gesture = 'none'; }

    if (s.on && s.status !== 'failed') startPoll(); else stopPoll();

    // First time hands come alive: the one-off coach card.
    if (s.on && (s.status === undefined || s.status === 'tracking') && !coachShown) {
      coachShown = true;
      showCoach();
    }
    renderHand();
  }

  /* ── the phone ─────────────────────────────────────────────────────────
     Nearly all of the phone layout is CSS (the body.bioq-phone block in
     SHELL_CSS). This is the part that cannot be: three surfaces that on a
     desktop are reachable only because there is a keyboard or a spare corner,
     and one that is honestly withdrawn.

     Guarded by SH_PHONE, which is false on every desktop, so none of this can
     reach one. */
  if (SH_PHONE) {
    document.body.classList.add('bioq-phone');

    // The systems toggles floated at the top centre. Down here that is the
    // objective bar's row, and anywhere else on a 390px screen is the specimen.
    // The console is where the other rarely-touched switches already live.
    const secSys = el(`<div class="dsec" id="secsys"><span class="lbl">Systems</span></div>`);
    secSys.appendChild(systems);
    drawBody.appendChild(secSys);

    // Hand tracking, honestly. The camera is on the same side of the phone as
    // your face; you are holding the thing you would have to gesture at; and
    // the landmark detector would be competing for the GPU with the specimen it
    // is meant to be pointing at. Offering a switch that started a camera and
    // then tracked badly would be worse than not offering one. Nothing is
    // really lost either: tracking was only ever an approximation of touching
    // the specimen, and this screen does that directly. So the cockpit is gone
    // (CSS) and this says why, where the settings are.
    const secHand = el(`<div class="dsec" id="sechand"><span class="lbl">Hand tracking</span>
        <div class="dnote">Hand tracking is a desktop feature. It wants a camera you are not
        holding, and running the detector alongside the specimen costs the frame rate of
        both. Here your finger is the instrument: touch a structure to use the instrument
        you have selected, drag anywhere else to turn the specimen, pinch to zoom.</div></div>`);
    drawBody.appendChild(secHand);

    // The attempt record and the viva are the L and V keys on a desktop. Without
    // these two buttons a student's own record of what they did would simply be
    // unreachable on a phone.
    const recBtn = el(`<button class="minibtn mobonly" id="recbtn">Record</button>`);
    recBtn.onclick = () => rec.classList.toggle('on');
    const vivaBtn = el(`<button class="minibtn mobonly" id="vivabtn">Viva</button>`);
    vivaBtn.onclick = () => fire('viva');
    railFoot.appendChild(recBtn);
    railFoot.appendChild(vivaBtn);

    // ...and the record covers the whole screen once it is open, so it needs a
    // way out that is not Escape.
    const recClose = el(`<button class="minibtn mobonly" id="recclose">Close</button>`);
    recClose.onclick = () => rec.classList.remove('on');
    rec.appendChild(recClose);
  }

  return {
    on, setTool, setStructure, setSpecimen, setHandState, showViva,
    say: sayMsg,
    // The stored show-camera choice, so main.js can apply it to the overlay the
    // moment tracking starts rather than waiting for the first toggle.
    cameraVisible: () => camOn,
    pushEvent,
    // Phase 2–4 surfaces. Every one is safe to call with null/undefined, and
    // the app boots identically if main.js never calls any of them.
    setVignette, askInput, inputOpen, setCases, setLevel, setXR,
    setImaging, setBleeding, setStrata, setPhysio, setKeymap, setActions,
    // Reopen the specimen chooser. The cold open auto-loads the frog and hides
    // the picker, so this is how the heart (and any future specimen) stays
    // reachable without a menu bar cluttering the workspace.
    showPicker: () => pick.classList.remove('gone'),
    // The drawer and the help sheet, for anything that wants to open them.
    setConsoleOpen: (o) => setDrawer(!!o),
    showKeymap: (o) => keysEl.classList.toggle('on', o === undefined ? true : !!o),
    checkObjectives: (state) => refreshObjective(state),
    setObjective: () => {},
    setHint: (h) => { hint.innerHTML = h; if (objHint) objHint.innerHTML = h; },
    // Whether this is running the phone layout. main.js uses it for the
    // pixel-ratio cap and the post-processing tier.
    isPhone: () => SH_PHONE,
    setCameraPreview: () => {},
    mountCards: (specs, cb) => {
      const c = pick.querySelector('#cards');
      c.innerHTML = '';
      Object.values(specs).forEach((s) => {
        const card = el(`<div class="card"><span class="lbl">Specimen</span>
          <h2>${s.name}</h2><p>${s.blurb}</p></div>`);
        card.onclick = () => cb(s.id);
        c.appendChild(card);
      });
    },
  };
}
