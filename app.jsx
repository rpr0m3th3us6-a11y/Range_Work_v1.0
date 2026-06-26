/* RANGEWORK — range day planner & drill tracker
   Dry-fire, live-fire, and PT-integrated (hybrid) drills. Shot/par timer,
   hit-factor + B-8 scoring, range-day builder with round count, score logging.
   React bundled in (esbuild); offline PWA. */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";

const C = {
  bg: "#0A0A0A", panel: "#141414", panel2: "#191919", line: "#262626",
  text: "#F0E6D3", muted: "#8C8472", gold: "#D4A017", red: "#E0503A", green: "#36C46A", blue: "#5AA9E6",
  display: "'Outfit', system-ui, sans-serif", mono: "'JetBrains Mono', ui-monospace, monospace",
};
const MODE = {
  dry:    { label: "Dry",    color: C.blue,  tag: "DRY" },
  live:   { label: "Live",   color: C.red,   tag: "LIVE" },
  hybrid: { label: "Hybrid", color: C.green, tag: "PT+GUN" },
};
const SCORING = { hitfactor: "Hit Factor", points: "Points", time: "Time / par", passfail: "Pass / Fail" };

/* drill builder */
const d = (id, name, cat, mode, x) => ({ id, name, cat, mode, ...x });

/* ── drill library ─────────────────────────────────────────────────────────
   Standards are the commonly published benchmarks — adjust to your level.   */
const DRILLS = [
  // ── PISTOL · DRY ──
  d("draw1", "Draw to first shot", "Pistol", "dry", {
    rounds: 0, distance: "any", scoring: "time", target: "any",
    cof: ["From holster, hands relaxed at sides (or concealment).", "On the beep, draw and deliver one clean dry press, front-sight/dot tracked.", "Reset, repeat. Record par."],
    trains: "Drawstroke economy, grip consistency, first-shot accountability.",
    standard: "Concealment to acceptable hit: ~1.5s working goal; sub-1.2s advanced.",
    par: 1.5, demoQ: "pistol draw to first shot dry fire modern samurai project",
  }),
  d("wall", "Wall drill / trigger control", "Pistol", "dry", {
    rounds: 0, distance: "muzzle to wall", scoring: "passfail", target: "blank wall",
    cof: ["Muzzle ~1\" from a blank wall, perfect grip and sights.", "Press the trigger straight to the rear without disturbing the sights.", "10 perfect presses; any sight movement = restart the count."],
    trains: "Isolated trigger press, the foundation of everything.",
    standard: "10 consecutive presses with zero sight movement.",
    demoQ: "wall drill trigger control dry fire",
  }),
  d("reload-d", "Reload (dry)", "Pistol", "dry", {
    rounds: 0, distance: "any", scoring: "time", target: "any",
    cof: ["Slide-lock reload from a dummy/empty mag to a loaded (dummy) mag.", "Eyes stay on target, gun in workspace, seat firmly.", "Record par for slide-lock and for speed (in-battery) reloads."],
    trains: "Reload mechanics under a clock without ammo cost.",
    standard: "Slide-lock reload ~2.0s; speed reload ~1.5s working goals.",
    par: 2.0, demoQ: "pistol reload dry fire technique sage dynamics",
  }),
  d("malf-d", "Malfunction clearance (dry)", "Pistol", "dry", {
    rounds: 0, distance: "any", scoring: "passfail", target: "any",
    cof: ["Set up dummy rounds / induced stoppage.", "Tap-rack-reassess for type 1/2; lock-rip-work-reload for type 3.", "Run on a par beep once smooth."],
    trains: "Immediate and remedial action by feel.",
    standard: "Clean tap-rack under ~2s; type-3 recognized and cleared without looking the gun into a knot.",
    demoQ: "pistol malfunction clearance tap rack dry fire",
  }),
  d("trans-d", "Target transitions (dry)", "Pistol", "dry", {
    rounds: 0, distance: "any", scoring: "time", target: "2–3 marks",
    cof: ["Place 2–3 aim marks on the wall.", "Drive eyes first, gun follows; one dry press per mark.", "Vary order; record par for the sequence."],
    trains: "Eyes-lead-gun transitions, recoil-to-next economy.",
    standard: "Snappy, no overrun; sights settle before the press.",
    par: 2.5, demoQ: "pistol target transitions dry fire ben stoeger",
  }),

  // ── PISTOL · LIVE ──
  d("dottorture", "Dot Torture", "Pistol", "live", {
    rounds: 50, distance: "3–7 yd", scoring: "passfail", target: "Dot Torture (10 dots)",
    cof: ["10 dots, mix of draws, strings, strong-/weak-hand only, and reloads per the target legend.", "Slow and perfect — accuracy over speed.", "Start at 3 yd; only move back a yard once you shoot it clean."],
    trains: "All pistol fundamentals in one diagnostic.",
    standard: "Clean 50/50. Distance is your score — most people live at 3–5 yd for a long time.",
    demoQ: "dot torture drill pistol explained",
  }),
  d("billdrill", "Bill Drill", "Pistol", "live", {
    rounds: 6, distance: "7 yd", scoring: "hitfactor", target: "USPSA / IPSC",
    cof: ["From the holster on the beep.", "Six rounds into the A-zone as fast as you can run the sights.", "Score hits; record time."],
    trains: "Recoil control, splits, grip under speed.",
    standard: "All A's. ~3s solid; sub-2s is advanced.",
    par: 3.0, demoQ: "bill drill pistol ben stoeger",
  }),
  d("thetest", "The Test", "Pistol", "live", {
    rounds: 10, distance: "10 yd", scoring: "points", target: "B-8 repair center", max: 100,
    cof: ["10 rounds, 10 yards, 10 seconds, freestyle.", "Score the B-8 rings.", "One string."],
    trains: "Accuracy on a clock — the classic balance test.",
    standard: "90+/100 to pass; 100 (all in the black, in time) is the goal.",
    par: 10.0, demoQ: "the test drill hackathorn 10 rounds 10 yards b8",
  }),
  d("fast", "F.A.S.T.", "Pistol", "live", {
    rounds: 6, distance: "7 yd", scoring: "time", target: "3x5 card + 8\" circle",
    cof: ["From concealment: 2 rounds to the 3x5 card.", "Slide-lock reload.", "4 rounds to the 8\" circle.", "Time it; add penalties: +1s per card miss, +0.5s per circle miss."],
    trains: "Precision, transitions, and a reload against the clock.",
    standard: "Sub-7s intermediate, sub-5s clean = advanced (FAST coin).",
    par: 7.0, demoQ: "FAST drill todd green pistol",
  }),
  d("failure", "Failure to Stop", "Pistol", "live", {
    rounds: 3, distance: "7 yd", scoring: "time", target: "body + head box",
    cof: ["From holster: 2 rounds to the body.", "1 round to the head box.", "Record time; all hits must count."],
    trains: "Accountable cadence change, body-to-head transition.",
    standard: "Clean under ~2.5s working goal.",
    par: 2.5, demoQ: "failure to stop drill mozambique pistol",
  }),
  d("super", "Super Test", "Pistol", "live", {
    rounds: 30, distance: "25 yd", scoring: "points", target: "B-8", max: 300,
    cof: ["3 strings of 10 at 25 yd on a B-8 (or scaled).", "Freestyle, no time pressure first; add a par as you improve.", "Sum the rings across 30 rounds."],
    trains: "Distance accuracy and consistency.",
    standard: "270+/300 strong; 285+ excellent.",
    demoQ: "super test pistol drill 25 yards hackathorn",
  }),
  d("elpres", "El Presidente", "Pistol", "live", {
    rounds: 12, distance: "10 yd", scoring: "hitfactor", target: "3 USPSA targets",
    cof: ["Start facing uprange, hands relaxed.", "Turn, draw, 2 rounds each on 3 targets.", "Slide-lock reload, 2 rounds each again.", "Score hits, record time, compute hit factor."],
    trains: "Turn-and-engage, transitions, reload, all under one HF.",
    standard: "Clean ~10s classic par; competitive HF well above that.",
    par: 10.0, demoQ: "el presidente drill pistol explained",
  }),

  // ── RIFLE · DRY ──
  d("rdraw", "Rifle ready-up (dry)", "Rifle", "dry", {
    rounds: 0, distance: "any", scoring: "time", target: "any",
    cof: ["From low/high ready or slung.", "On the beep, mount and deliver one clean dry press.", "Record par from each ready position."],
    trains: "Mount consistency, cheek weld, first-shot speed.",
    standard: "Low ready to acceptable hit ~0.8–1.2s.",
    par: 1.2, demoQ: "rifle ready up dry fire carbine",
  }),
  d("rtrans", "Position transitions (dry)", "Rifle", "dry", {
    rounds: 0, distance: "any", scoring: "passfail", target: "any",
    cof: ["Standing → kneeling → prone, dry press from each.", "Stable, repeatable, no fumbling the support.", "Run on a par once smooth."],
    trains: "Getting low fast and stable — the durability + skill overlap.",
    standard: "Smooth down and up, sights confirmed at each level.",
    demoQ: "carbine positional shooting transitions dry",
  }),

  // ── RIFLE · LIVE ──
  d("zero", "Zero confirmation", "Rifle", "live", {
    rounds: 15, distance: "50 / 100 yd", scoring: "passfail", target: "1\" grid / zero target",
    cof: ["Confirm your zero (50/200 or 100).", "3–5 round groups, adjust, re-confirm.", "Record group size and DOPE."],
    trains: "Knowing where the gun hits — everything else is built on this.",
    standard: "Tight, centered group at your chosen zero distance.",
    demoQ: "rifle 50 yard zero confirmation carbine",
  }),
  d("vtac15", "VTAC 1-5 Drill", "Rifle", "live", {
    rounds: 15, distance: "7–10 yd", scoring: "time", target: "5 targets",
    cof: ["5 targets left to right.", "1 round on T1, 2 on T2, 3 on T3, 4 on T4, 5 on T5 (15 total).", "All hits must count; record time."],
    trains: "Transitions, trigger control, recoil management across targets.",
    standard: "Clean, smooth transitions; chase time only after hits are solid.",
    par: 8.0, demoQ: "VTAC 1-5 drill carbine",
  }),
  d("boxdrill", "Box Drill", "Rifle", "live", {
    rounds: 8, distance: "7–15 yd", scoring: "time", target: "2 targets",
    cof: ["2 targets.", "2 rounds body each, then 1 round head each (box pattern).", "Record time; head hits must count."],
    trains: "Body-to-head transitions and accountability.",
    standard: "Clean head box hits under control.",
    par: 6.0, demoQ: "box drill carbine rifle",
  }),

  // ── HYBRID · PT + GUN ──
  d("sprint-shoot", "Sprint to shoot", "Hybrid", "hybrid", {
    rounds: 6, distance: "shoot at 7–10 yd", scoring: "time", target: "USPSA / B-8",
    cof: ["Sprint 25–50 m to the firing point.", "On arrival, engage: 6 rounds A-zone (or a Bill Drill).", "Note how much the group opens vs. your cold score."],
    trains: "Precision on a spiked heart rate — the gap that matters.",
    standard: "Minimize group degradation under load.",
    safety: "Build this DRY first. Live only on a flat range, muzzle downrange the entire approach, finger off until sights are on. A buddy/RO is strongly recommended.",
    par: 0, demoQ: "tactical games sprint to shoot drill",
  }),
  d("carry-shoot", "Carry to shoot", "Hybrid", "hybrid", {
    rounds: 10, distance: "varies", scoring: "time", target: "steel / USPSA",
    cof: ["Farmer or sandbag carry 30–50 m to the line.", "Set the load down safely, engage the drill.", "Repeat for rounds."],
    trains: "Grip and platform stability after loaded carries.",
    standard: "Stable hits despite forearm/grip fatigue.",
    safety: "Stage the firearm safely; never carry weight and a hot gun together. Set load down, then handle the gun.",
    par: 0, demoQ: "tactical fitness carry to shoot drill",
  }),
  d("burpee-bill", "Burpee Bill Drill", "Hybrid", "hybrid", {
    rounds: 6, distance: "7 yd", scoring: "time", target: "USPSA",
    cof: ["5–10 burpees at the line.", "Stand, draw (or low ready), run a Bill Drill — 6 A-zone.", "Compare time + hits to your fresh Bill Drill."],
    trains: "Recoil control and trigger discipline while gassed.",
    standard: "Keep the A's; accept a slower split.",
    safety: "Dry-fire version first. For live, holster only if you have a solid drawstroke; otherwise start from the bench/low ready, muzzle downrange.",
    par: 0, demoQ: "burpee bill drill stress shoot",
  }),
  d("drag-shoot", "Drag to positional", "Hybrid", "hybrid", {
    rounds: 8, distance: "7–15 yd", scoring: "time", target: "2 targets",
    cof: ["Sled or dummy drag 20–30 m.", "Drop into kneeling or prone behind cover.", "Engage box drill or 2x2 from position."],
    trains: "Posterior-chain output then a stable low position under a shooting task.",
    standard: "Stable position, clean hits after the drag.",
    safety: "Muzzle awareness through the drag and the drop — this is the highest-discipline drill here. Dry it cold; live only when the movement is automatic.",
    par: 0, demoQ: "drag to shooting position tactical drill",
  }),
  d("kb-downshift", "KB swing → down-shift (dry)", "Hybrid", "hybrid", {
    rounds: 0, distance: "any", scoring: "passfail", target: "wall / dry target",
    cof: ["20 kettlebell swings or 30s jump rope.", "2 physiological sighs to start the down-shift.", "5 dry presses prioritizing a clean trigger as the HR falls."],
    trains: "Deliberately recovering precision after exertion — fully dry, zero risk.",
    standard: "Sight picture steadies and trigger stays clean by rep 3–5.",
    demoQ: "breathing down shift dry fire after exertion",
  }),
  d("getup-present", "Get-up to ready (dry)", "Hybrid", "hybrid", {
    rounds: 0, distance: "any", scoring: "time", target: "any",
    cof: ["From supine: Turkish get-up to standing (no bell or light).", "On standing, mount/present and deliver one dry press.", "Record time get-up → acceptable sight picture."],
    trains: "Get-off-the-X mechanics into a shooting platform.",
    standard: "Smooth rise into a stable, fast present.",
    demoQ: "turkish get up to shooting position",
  }),
];

const CATS = ["Pistol", "Rifle", "Hybrid"];
const MODES = ["dry", "live", "hybrid"];

const SAFETY_TEXT = "Cold range by default. Four rules always: treat every gun as loaded; never let the muzzle cover anything you're not willing to destroy; finger off the trigger until your sights are on target and you've decided to fire; know your target, its backstop, and beyond. Eyes and ears on. For PT-integrated drills: build every drill DRY first, run live only on a flat range with the muzzle downrange throughout, finger indexed during all movement, and ideally with a buddy or RO. Stage weight and firearms separately — never move under load with a hot gun.";

/* ── persistence ─────────────────────────────────────────────────────────── */
const KEY = "rangework-v1";
const loadStore = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saveStore = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

/* ── audio beep (shot/par timer) ───────────────────────────────────────────── */
let _actx = null;
function beep(freq = 880, ms = 180) {
  try {
    _actx = _actx || new (window.AudioContext || window.webkitAudioContext)();
    if (_actx.state === "suspended") _actx.resume();
    const o = _actx.createOscillator(), g = _actx.createGain();
    o.frequency.value = freq; o.type = "sine"; o.connect(g); g.connect(_actx.destination);
    g.gain.setValueAtTime(0.001, _actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, _actx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, _actx.currentTime + ms / 1000);
    o.start(); o.stop(_actx.currentTime + ms / 1000);
  } catch {}
}

/* ── scoring ───────────────────────────────────────────────────────────────── */
function hitFactor({ a, c, dd, miss, ns, time, major }) {
  if (!time || time <= 0) return 0;
  const pts = a * 5 + c * (major ? 4 : 3) + dd * (major ? 2 : 1) - miss * 10 - ns * 10;
  return Math.max(0, pts) / time;
}

/* ── App ─────────────────────────────────────────────────────────────────── */
function useViewport() {
  const get = () => (typeof window !== "undefined" && window.innerWidth >= 700 && window.innerHeight >= 560);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const on = () => setWide(get());
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return wide;
}

function App() {
  const [store, setStore] = useState(loadStore);
  useEffect(() => saveStore(store), [store]);
  const set = (patch) => setStore((s) => ({ ...s, ...patch }));

  const [view, setView] = useState("drills");
  const [openDrill, setOpenDrill] = useState(null);
  const [safety, setSafety] = useState(false);

  const log = store.log || [];
  const plan = store.plan || [];

  const addLog = (entry) => set({ log: [{ ...entry, ts: Date.now() }, ...log].slice(0, 500) });
  const togglePlan = (id) => set({ plan: plan.includes(id) ? plan.filter((x) => x !== id) : [...plan, id] });

  const wide = useViewport();
  const openFromList = wide ? (d) => { setOpenDrill(d); setView("drills"); } : setOpenDrill;
  const body = (
    <>
      {view === "drills" && (wide
        ? <DrillsWide openDrill={openDrill} setOpenDrill={setOpenDrill} plan={plan} togglePlan={togglePlan} addLog={addLog} />
        : <Drills onOpen={setOpenDrill} plan={plan} togglePlan={togglePlan} />)}
      {view === "plan" && <Planner plan={plan} togglePlan={togglePlan} onOpen={openFromList} />}
      {view === "timer" && <TimerTab />}
      {view === "score" && <ScoreTab addLog={addLog} />}
      {view === "log" && <LogTab log={log} clear={() => set({ log: [] })} />}
    </>
  );

  if (wide) {
    const capped = view !== "drills";
    return (
      <div style={{ display: "flex", background: C.bg, color: C.text, minHeight: "100dvh", fontFamily: C.display }}>
        <Sidebar view={view} setView={setView} onSafety={() => setSafety(true)} />
        <div style={{ flex: 1, height: "100dvh", overflowY: "auto" }}>
          <div style={{ padding: "22px 26px 48px", maxWidth: capped ? 680 : "none", margin: capped ? "0 auto" : 0 }}>{body}</div>
        </div>
        {safety && <Sheet border={C.red} onClose={() => setSafety(false)} title="Range Safety" tag="MANDATORY"><p style={{ fontSize: 14, lineHeight: 1.6 }}>{SAFETY_TEXT}</p></Sheet>}
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100dvh", fontFamily: C.display, paddingBottom: 78 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: C.bg, borderBottom: "1px solid " + C.line }}>
        <div style={{ maxWidth: 540, margin: "0 auto", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: C.mono, fontSize: 13, letterSpacing: 2, color: C.gold, fontWeight: 700 }}>RANGEWORK</span>
          <button className="tf-tap" onClick={() => setSafety(true)} style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 1, color: C.red, background: "transparent", border: "1px solid " + C.line, borderRadius: 999, padding: "5px 10px", cursor: "pointer" }}>⚠ SAFETY</button>
        </div>
      </div>
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "0 16px" }}>{body}</div>
      {openDrill && <DrillDetail drill={openDrill} onClose={() => setOpenDrill(null)} addLog={addLog} inPlan={plan.includes(openDrill.id)} togglePlan={() => togglePlan(openDrill.id)} />}
      {safety && <Sheet border={C.red} onClose={() => setSafety(false)} title="Range Safety" tag="MANDATORY"><p style={{ fontSize: 14, lineHeight: 1.6 }}>{SAFETY_TEXT}</p></Sheet>}
      <Nav view={view} setView={setView} />
    </div>
  );
}

/* ── Drills tab ───────────────────────────────────────────────────────────── */
function Drills({ onOpen, plan, togglePlan }) {
  const [cat, setCat] = useState("Pistol");
  const [mode, setMode] = useState("all");
  const list = DRILLS.filter((x) => x.cat === cat && (mode === "all" || x.mode === mode));
  return (
    <div className="tf-fade" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Drills</h1>
      <Seg options={CATS.map((x) => [x, x])} value={cat} onChange={setCat} />
      <div style={{ height: 8 }} />
      <Seg options={[["all", "All"], ["dry", "Dry"], ["live", "Live"], ["hybrid", "Hybrid"]]} value={mode} onChange={setMode} small />
      <div style={{ marginTop: 14 }}>
        {list.map((x) => <DrillCard key={x.id} drill={x} onOpen={onOpen} inPlan={plan.includes(x.id)} togglePlan={() => togglePlan(x.id)} />)}
        {!list.length && <p style={{ color: C.muted, fontSize: 14, marginTop: 20 }}>No drills in this filter.</p>}
      </div>
    </div>
  );
}
function DrillCard({ drill, onOpen, inPlan, togglePlan }) {
  const m = MODE[drill.mode];
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 10, background: C.panel, border: "1px solid " + C.line, borderRadius: 12, padding: 13, marginBottom: 8 }}>
      <button className="tf-tap" onClick={() => onOpen(drill)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", color: C.text }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{drill.name}</span>
          <span style={{ fontFamily: C.mono, fontSize: 9, color: m.color, border: "1px solid " + m.color, borderRadius: 4, padding: "1px 5px" }}>{m.tag}</span>
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginTop: 4 }}>
          {drill.distance} · {drill.rounds > 0 ? drill.rounds + " rds" : "no ammo"} · {SCORING[drill.scoring]}
        </div>
      </button>
      <button className="tf-tap" onClick={togglePlan} aria-label="add to plan" style={{ width: 38, flexShrink: 0, borderRadius: 9, cursor: "pointer", border: "1px solid " + (inPlan ? C.gold : C.line), background: inPlan ? C.gold : "transparent", color: inPlan ? "#000" : C.muted, fontFamily: C.mono, fontSize: 18, fontWeight: 700 }}>{inPlan ? "✓" : "+"}</button>
    </div>
  );
}

/* ── Drill detail (shared body, used by phone sheet + wide pane) ──────────── */
function DrillBody({ drill, addLog, inPlan, togglePlan, onSaved, big }) {
  const demoUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(drill.demoQ);
  return (
    <>
      <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 14 }}>{drill.cat} · {drill.distance} · {drill.rounds > 0 ? drill.rounds + " rounds" : "dry / no ammo"} · {SCORING[drill.scoring]}{drill.target ? " · " + drill.target : ""}</div>

      {drill.par > 0 && <><Label>RUN IT</Label><div style={{ marginTop: 8, marginBottom: 16 }}><ParTimer initialPar={drill.par} compact={!big} /></div></>}

      <Label>COURSE OF FIRE</Label>
      <ol style={{ margin: "6px 0 14px", paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>{drill.cof.map((s, i) => <li key={i}>{s}</li>)}</ol>

      <Label>TRAINS</Label>
      <p style={{ fontSize: 14, lineHeight: 1.5, margin: "6px 0 14px", color: C.muted }}>{drill.trains}</p>

      <Label>STANDARD</Label>
      <p style={{ fontSize: 14, lineHeight: 1.5, margin: "6px 0 14px" }}>{drill.standard}</p>

      {drill.safety && <div style={{ background: "#1C0F0C", border: "1px solid " + C.red, borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.red, fontWeight: 700, marginBottom: 4 }}>⚠ DRILL SAFETY</div>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>{drill.safety}</p>
      </div>}

      <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="tf-tap" style={{ display: "block", textAlign: "center", textDecoration: "none", background: C.panel2, border: "1px solid " + C.line, borderRadius: 10, padding: "11px", color: C.gold, fontFamily: C.mono, fontSize: 13, marginBottom: 14 }}>▶ Watch demo</a>

      <Label>LOG RESULT</Label>
      <ScoreEntry drill={drill} onSave={(v) => { addLog({ drillId: drill.id, drillName: drill.name, scoring: drill.scoring, ...v }); onSaved && onSaved(); }} />

      <button className="tf-tap" onClick={togglePlan} style={{ width: "100%", marginTop: 12, padding: "11px 0", borderRadius: 10, border: "1px solid " + (inPlan ? C.gold : C.line), background: inPlan ? C.gold : "transparent", color: inPlan ? "#000" : C.muted, fontFamily: C.mono, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{inPlan ? "✓ IN RANGE DAY" : "+ ADD TO RANGE DAY"}</button>
    </>
  );
}
function DrillDetail({ drill, onClose, addLog, inPlan, togglePlan }) {
  return (
    <Sheet border={MODE[drill.mode].color} onClose={onClose} title={drill.name} tag={MODE[drill.mode].tag} scroll>
      <DrillBody drill={drill} addLog={addLog} inPlan={inPlan} togglePlan={togglePlan} onSaved={onClose} />
    </Sheet>
  );
}

/* ── wide (tablet / fold-open) master-detail ──────────────────────────────── */
function DrillsWide({ openDrill, setOpenDrill, plan, togglePlan, addLog }) {
  const [cat, setCat] = useState("Pistol");
  const [mode, setMode] = useState("all");
  const list = DRILLS.filter((x) => x.cat === cat && (mode === "all" || x.mode === mode));
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
      <div style={{ width: 330, flexShrink: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Drills</h1>
        <Seg options={CATS.map((x) => [x, x])} value={cat} onChange={setCat} />
        <div style={{ height: 8 }} />
        <Seg options={[["all", "All"], ["dry", "Dry"], ["live", "Live"], ["hybrid", "Hybrid"]]} value={mode} onChange={setMode} small />
        <div style={{ marginTop: 14 }}>
          {list.map((x) => (
            <div key={x.id} style={{ outline: openDrill && openDrill.id === x.id ? "2px solid " + C.gold : "none", borderRadius: 12, marginBottom: 8 }}>
              <DrillCard drill={x} onOpen={setOpenDrill} inPlan={plan.includes(x.id)} togglePlan={() => togglePlan(x.id)} />
            </div>
          ))}
          {!list.length && <p style={{ color: C.muted, fontSize: 14, marginTop: 20 }}>No drills in this filter.</p>}
        </div>
      </div>
      <div style={{ flex: 1, position: "sticky", top: 22, alignSelf: "flex-start", background: C.panel, border: "1px solid " + C.line, borderRadius: 16, padding: 20, minHeight: 420 }}>
        {openDrill ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>{openDrill.name}</h2>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: MODE[openDrill.mode].color, border: "1px solid " + MODE[openDrill.mode].color, borderRadius: 4, padding: "2px 6px" }}>{MODE[openDrill.mode].tag}</span>
            </div>
            <DrillBody drill={openDrill} addLog={addLog} inPlan={plan.includes(openDrill.id)} togglePlan={() => togglePlan(openDrill.id)} big />
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted, marginBottom: 16 }}>SHOT TIMER</div>
            <ParTimer />
            <p style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>Pick a drill on the left to load its course of fire and par.</p>
          </div>
        )}
      </div>
    </div>
  );
}
/* ── sidebar nav (wide) ───────────────────────────────────────────────────── */
function Sidebar({ view, setView, onSafety }) {
  const items = [["drills", "Drills"], ["plan", "Plan"], ["timer", "Timer"], ["score", "Score"], ["log", "Log"]];
  return (
    <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid " + C.line, height: "100dvh", position: "sticky", top: 0, display: "flex", flexDirection: "column", padding: "20px 14px" }}>
      <div style={{ fontFamily: C.mono, fontSize: 14, letterSpacing: 2, color: C.gold, fontWeight: 700, padding: "0 8px 18px" }}>RANGEWORK</div>
      {items.map(([k, l]) => { const on = view === k; return (
        <button key={k} className="tf-tap" onClick={() => setView(k)} style={{ textAlign: "left", padding: "11px 12px", marginBottom: 4, borderRadius: 9, border: "none", cursor: "pointer", background: on ? C.gold : "transparent", color: on ? "#000" : C.muted, fontFamily: C.mono, fontSize: 13, fontWeight: 700 }}>{l}</button>
      ); })}
      <div style={{ flex: 1 }} />
      <button className="tf-tap" onClick={onSafety} style={{ textAlign: "left", padding: "11px 12px", borderRadius: 9, border: "1px solid " + C.line, cursor: "pointer", background: "transparent", color: C.red, fontFamily: C.mono, fontSize: 12, fontWeight: 700 }}>⚠ SAFETY</button>
    </div>
  );
}

/* ── score entry (varies by drill scoring) ──────────────────────────────────── */
function ScoreEntry({ drill, onSave }) {
  const [num, setNum] = useState("");
  const [time, setTime] = useState("");
  const [hf, setHf] = useState(null);
  if (drill.scoring === "hitfactor") {
    return <HitFactorForm onSave={onSave} />;
  }
  if (drill.scoring === "points") {
    return (
      <div>
        <Field label={"Points (max " + (drill.max || 100) + ")"} value={num} onChange={setNum} placeholder="e.g. 92" />
        <SaveBtn disabled={num === ""} onClick={() => onSave({ value: parseFloat(num), unit: "pts", max: drill.max || 100 })} />
      </div>
    );
  }
  if (drill.scoring === "time") {
    return (
      <div>
        <Field label="Time (s)" value={time} onChange={setTime} placeholder={drill.par ? "par " + drill.par : "seconds"} />
        <SaveBtn disabled={time === ""} onClick={() => onSave({ value: parseFloat(time), unit: "s" })} />
      </div>
    );
  }
  // passfail
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button className="tf-tap" onClick={() => onSave({ value: 1, unit: "pass" })} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: C.green, color: "#000", fontFamily: C.mono, fontWeight: 700, cursor: "pointer" }}>PASS</button>
      <button className="tf-tap" onClick={() => onSave({ value: 0, unit: "fail" })} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid " + C.line, background: "transparent", color: C.muted, fontFamily: C.mono, fontWeight: 700, cursor: "pointer" }}>NO-GO</button>
    </div>
  );
}
function HitFactorForm({ onSave }) {
  const [v, setV] = useState({ a: "", c: "", dd: "", miss: "", ns: "", time: "", major: false });
  const num = (k) => parseFloat(v[k]) || 0;
  const hf = hitFactor({ a: num("a"), c: num("c"), dd: num("dd"), miss: num("miss"), ns: num("ns"), time: num("time"), major: v.major });
  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["a", "A"], ["c", "C"], ["dd", "D"], ["miss", "M"], ["ns", "NS"]].map(([k, l]) => (
          <div key={k} style={{ flex: 1 }}><div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, textAlign: "center", marginBottom: 3 }}>{l}</div>
            <input inputMode="numeric" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} style={inp} /></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <input inputMode="decimal" placeholder="time (s)" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} style={{ ...inp, flex: 1, textAlign: "left", padding: "10px 12px" }} />
        <button className="tf-tap" onClick={() => setV({ ...v, major: !v.major })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid " + (v.major ? C.gold : C.line), background: v.major ? C.gold : "transparent", color: v.major ? "#000" : C.muted, fontFamily: C.mono, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{v.major ? "MAJOR" : "MINOR"}</button>
      </div>
      <div style={{ textAlign: "center", margin: "12px 0" }}>
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>HIT FACTOR </span>
        <span style={{ fontFamily: C.mono, fontSize: 26, fontWeight: 700, color: C.gold }}>{hf.toFixed(2)}</span>
      </div>
      <SaveBtn disabled={!num("time")} onClick={() => onSave({ value: parseFloat(hf.toFixed(2)), unit: "HF", detail: `${num("a")}A ${num("c")}C ${num("dd")}D ${num("miss")}M / ${num("time")}s` })} />
    </div>
  );
}

/* ── Planner (build a range day) ───────────────────────────────────────────── */
function Planner({ plan, togglePlan, onOpen }) {
  const items = plan.map((id) => DRILLS.find((x) => x.id === id)).filter(Boolean);
  const rounds = items.reduce((s, x) => s + (x.rounds || 0), 0);
  const byCat = (c) => items.filter((x) => x.cat === c).reduce((s, x) => s + (x.rounds || 0), 0);
  return (
    <div className="tf-fade" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Range Day</h1>
      <p style={{ fontSize: 13.5, color: C.muted, marginBottom: 14 }}>Build your session from the Drills tab. Ammo count totals here so you can pack right.</p>
      {!items.length ? <p style={{ color: C.muted, fontSize: 14, marginTop: 20 }}>Empty. Tap <b style={{ color: C.gold }}>+</b> on any drill to add it.</p> : (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <Stat big={rounds} unit="rounds total" />
            <Stat big={items.length} unit="drills" />
          </div>
          <div style={{ background: C.panel, border: "1px solid " + C.line, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 8 }}>AMMO BREAKDOWN</div>
            {CATS.map((c) => byCat(c) > 0 && <div key={c} style={{ display: "flex", justifyContent: "space-between", fontFamily: C.mono, fontSize: 13, padding: "3px 0" }}><span style={{ color: C.text }}>{c}</span><span style={{ color: C.gold }}>{byCat(c)} rds</span></div>)}
          </div>
          {items.map((x) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.panel, border: "1px solid " + C.line, borderRadius: 12, padding: 13, marginBottom: 8 }}>
              <button className="tf-tap" onClick={() => onOpen(x)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", color: C.text, cursor: "pointer" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{x.name}</div>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginTop: 3 }}>{x.rounds > 0 ? x.rounds + " rds" : "dry"} · {x.distance}</div>
              </button>
              <button className="tf-tap" onClick={() => togglePlan(x.id)} style={{ width: 34, borderRadius: 8, border: "1px solid " + C.line, background: "transparent", color: C.red, fontFamily: C.mono, fontSize: 16, cursor: "pointer" }}>×</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ── Timer tab ─────────────────────────────────────────────────────────────── */
function TimerTab() {
  return (
    <div className="tf-fade" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Shot Timer</h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Random-delay start beep and an optional par beep. Tap once to enable sound.</p>
      <ParTimer />
    </div>
  );
}
function ParTimer({ initialPar = 0, compact }) {
  const [par, setPar] = useState(initialPar);
  const [state, setState] = useState("idle"); // idle | waiting | running
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0); const rafRef = useRef(null); const toRef = useRef(null);
  const stop = () => { cancelAnimationFrame(rafRef.current); clearTimeout(toRef.current); };
  useEffect(() => () => stop(), []);
  function go() {
    stop(); setState("waiting"); setElapsed(0);
    const delay = 1500 + Math.random() * 2500;
    toRef.current = setTimeout(() => {
      beep(880, 200); startRef.current = performance.now(); setState("running");
      if (par > 0) toRef.current = setTimeout(() => beep(1320, 250), par * 1000);
      const tick = () => { setElapsed((performance.now() - startRef.current) / 1000); rafRef.current = requestAnimationFrame(tick); };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
  }
  function halt() { stop(); setState("idle"); }
  const disp = state === "waiting" ? "…" : elapsed.toFixed(2);
  const overPar = par > 0 && state !== "waiting" && elapsed > par;
  return (
    <div style={{ background: C.panel, border: "1px solid " + C.line, borderRadius: 16, padding: compact ? 14 : "26px 16px", textAlign: "center" }}>
      <div style={{ fontFamily: C.mono, fontSize: compact ? 44 : 60, fontWeight: 700, lineHeight: 1, color: state === "waiting" ? C.muted : overPar ? C.red : C.gold }}>{disp}<span style={{ fontSize: 18, color: C.muted }}>{state !== "waiting" ? "s" : ""}</span></div>
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
        {state === "running" ? (
          <button className="tf-tap" onClick={halt} style={btn(C.red)}>STOP</button>
        ) : (
          <button className="tf-tap" onClick={go} style={btn(C.green)}>{state === "waiting" ? "STANDBY…" : "START"}</button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, justifyContent: "center" }}>
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>PAR</span>
        <input inputMode="decimal" value={par || ""} onChange={(e) => setPar(parseFloat(e.target.value) || 0)} placeholder="off" style={{ ...inp, width: 70, padding: "8px 10px" }} />
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>sec</span>
      </div>
    </div>
  );
}

/* ── Score tab (standalone calculators) ────────────────────────────────────── */
function ScoreTab({ addLog }) {
  const [tab, setTab] = useState("hf");
  const [pts, setPts] = useState(""); const [max, setMax] = useState("100");
  return (
    <div className="tf-fade" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Score</h1>
      <Seg options={[["hf", "Hit Factor"], ["b8", "B-8 / Points"]]} value={tab} onChange={setTab} />
      <div style={{ background: C.panel, border: "1px solid " + C.line, borderRadius: 12, padding: 14, marginTop: 14 }}>
        {tab === "hf" ? <HitFactorForm onSave={(v) => addLog({ drillName: "Hit Factor (manual)", scoring: "hitfactor", ...v })} /> : (
          <div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><div style={lbl}>Score</div><input inputMode="numeric" value={pts} onChange={(e) => setPts(e.target.value)} style={{ ...inp, textAlign: "left", padding: "10px 12px" }} /></div>
              <div style={{ flex: 1 }}><div style={lbl}>Possible</div><input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} style={{ ...inp, textAlign: "left", padding: "10px 12px" }} /></div>
            </div>
            <div style={{ textAlign: "center", margin: "12px 0" }}>
              <span style={{ fontFamily: C.mono, fontSize: 26, fontWeight: 700, color: C.gold }}>{pts && max ? Math.round((parseFloat(pts) / parseFloat(max)) * 100) : 0}%</span>
            </div>
            <SaveBtn disabled={!pts || !max} onClick={() => addLog({ drillName: "B-8 / Points (manual)", scoring: "points", value: parseFloat(pts), unit: "pts", max: parseFloat(max) })} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Log tab ───────────────────────────────────────────────────────────────── */
function LogTab({ log, clear }) {
  const prs = useMemo(() => {
    const byDrill = {};
    log.forEach((e) => {
      if (!e.drillId && !e.drillName) return;
      const k = e.drillName;
      const better = (a, b) => e.unit === "s" ? a < b : a > b; // lower time better, else higher
      if (!byDrill[k] || better(e.value, byDrill[k].value)) byDrill[k] = e;
    });
    return Object.values(byDrill);
  }, [log]);
  return (
    <div className="tf-fade" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Log</h1>
      {!log.length ? <p style={{ color: C.muted, fontSize: 14, marginTop: 20 }}>No runs logged yet. Log results from any drill or the Score tab.</p> : (
        <>
          <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted, marginBottom: 8 }}>PERSONAL BESTS</div>
          {prs.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.panel, border: "1px solid " + C.line, borderRadius: 10, padding: "11px 13px", marginBottom: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{e.drillName}</span>
              <span style={{ fontFamily: C.mono, fontSize: 14, color: C.gold, fontWeight: 700 }}>{fmt(e)}</span>
            </div>
          ))}
          <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted, margin: "18px 0 8px" }}>HISTORY</div>
          {log.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 2px", borderBottom: "1px solid " + C.line }}>
              <div><div style={{ fontSize: 13.5 }}>{e.drillName}</div><div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted }}>{new Date(e.ts).toLocaleDateString()}{e.detail ? " · " + e.detail : ""}</div></div>
              <span style={{ fontFamily: C.mono, fontSize: 13, color: C.text }}>{fmt(e)}</span>
            </div>
          ))}
          <button className="tf-tap" onClick={clear} style={{ width: "100%", marginTop: 16, padding: "11px 0", borderRadius: 10, border: "1px solid " + C.line, background: "transparent", color: C.muted, fontFamily: C.mono, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>CLEAR LOG</button>
        </>
      )}
    </div>
  );
}
function fmt(e) {
  if (e.unit === "HF") return e.value.toFixed(2) + " HF";
  if (e.unit === "s") return e.value.toFixed(2) + "s";
  if (e.unit === "pts") return e.value + (e.max ? "/" + e.max : "");
  if (e.unit === "pass") return "PASS";
  if (e.unit === "fail") return "NO-GO";
  return e.value;
}

/* ── shared UI ─────────────────────────────────────────────────────────────── */
function Sheet({ border, onClose, title, tag, children, scroll }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 40, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="tf-fade" style={{ background: C.panel, border: "1px solid " + border, borderRadius: "16px 16px 0 0", padding: 18, width: "100%", maxWidth: 540, maxHeight: scroll ? "86vh" : "auto", overflowY: scroll ? "auto" : "visible" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{title}</h2>
          {tag && <span style={{ fontFamily: C.mono, fontSize: 10, color: border, border: "1px solid " + border, borderRadius: 4, padding: "2px 6px" }}>{tag}</span>}
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
        <button className="tf-tap" onClick={onClose} style={{ width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 10, border: "1px solid " + C.line, background: "transparent", color: C.muted, fontFamily: C.mono, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>CLOSE</button>
      </div>
    </div>
  );
}
function Seg({ options, value, onChange, small }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(([k, l]) => { const on = value === k; return (
        <button key={k} className="tf-tap" onClick={() => onChange(k)} style={{ flex: 1, padding: small ? "8px 0" : "10px 0", borderRadius: 9, border: "1px solid " + (on ? C.gold : C.line), background: on ? C.gold : C.panel, color: on ? "#000" : C.muted, fontFamily: C.mono, fontSize: small ? 11 : 12, fontWeight: 700, cursor: "pointer" }}>{l}</button>
      ); })}
    </div>
  );
}
const Label = ({ children }) => <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 1.5, color: C.gold }}>{children}</div>;
const lbl = { fontFamily: C.mono, fontSize: 10, color: C.muted, marginBottom: 3 };
const inp = { width: "100%", textAlign: "center", background: C.panel2, border: "1px solid " + C.line, borderRadius: 8, color: C.text, fontFamily: C.mono, fontSize: 15, padding: "10px 6px", outline: "none" };
function Field({ label, value, onChange, placeholder }) {
  return <div style={{ marginBottom: 10 }}><div style={lbl}>{label}</div><input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...inp, textAlign: "left", padding: "10px 12px" }} /></div>;
}
function SaveBtn({ onClick, disabled }) {
  return <button className="tf-tap" disabled={disabled} onClick={onClick} style={{ width: "100%", marginTop: 10, padding: "13px 0", borderRadius: 10, border: "none", cursor: disabled ? "not-allowed" : "pointer", background: disabled ? C.panel2 : C.gold, color: disabled ? C.muted : "#000", fontFamily: C.mono, fontWeight: 700, fontSize: 13 }}>SAVE TO LOG</button>;
}
const btn = (bg) => ({ padding: "13px 34px", borderRadius: 10, border: "none", cursor: "pointer", background: bg, color: "#000", fontFamily: C.mono, fontWeight: 700, fontSize: 15 });
function Stat({ big, unit }) {
  return <div style={{ flex: 1, background: C.panel, border: "1px solid " + C.line, borderRadius: 12, padding: "14px 16px" }}><div style={{ fontFamily: C.mono, fontSize: 30, fontWeight: 700, color: C.gold }}>{big}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{unit}</div></div>;
}
function Nav({ view, setView }) {
  const items = [["drills", "Drills"], ["plan", "Plan"], ["timer", "Timer"], ["score", "Score"], ["log", "Log"]];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.bg, borderTop: "1px solid " + C.line, zIndex: 30 }}>
      <div style={{ maxWidth: 540, margin: "0 auto", display: "flex" }}>
        {items.map(([k, l]) => { const on = view === k; return (
          <button key={k} className="tf-tap" onClick={() => setView(k)} style={{ flex: 1, padding: "13px 0", background: "transparent", border: "none", cursor: "pointer", color: on ? C.gold : C.muted, fontFamily: C.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, borderTop: "2px solid " + (on ? C.gold : "transparent") }}>{l.toUpperCase()}</button>
        ); })}
      </div>
    </div>
  );
}

createRoot(document.getElementById("app")).render(<App />);
