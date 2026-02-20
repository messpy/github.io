import {
  eggSprite,
  badgeLine,
  spriteDead,
  spritePet,
  spritePlayFrame,
  spriteFeedFlash,
} from "./sprites.js";

(() => {
  const KEY = "tama_dot_balance_state_v1";
  const SESSION_KEY = "tama_dot_balance_counted_session_v1";

  const nowMs = () => Date.now();
  const clamp = (n,a,b) => Math.max(a, Math.min(b, n));

  // ---- 基本（あなたの編集に合わせて 15秒）
  const HATCH_WAIT_SEC = 15;

  // ---- 自然変化（孵化後のみ）
  const FULL_DECAY_SEC = 18;
  const DIRTY_INC_SEC = 35;
  const HAPPY_DECAY_SEC = 25;

  // ---- サイズ（孵化後経過）
  const SIZE_MEDIUM_SEC = 90;
  const SIZE_LARGE_SEC = 240;

  // ---- 進化（レベル）
  const FORM_CHILD_MAX = 2;
  const FORM_TEEN_MAX = 4;

  // ---- バランス死亡ルール
  const DANGER_HOLD_SEC = 20;
  const FULL_WARN_LOW = 1;
  const FULL_DANGER_LOW = 0;
  const FULL_WARN_HIGH = 11;
  const FULL_DANGER_HIGH = 14;

  const HAPPY_WARN_LOW = 1;
  const HAPPY_DANGER_LOW = 0;
  const HAPPY_WARN_HIGH = 10;
  const HAPPY_DANGER_HIGH = 10;

  const DIRTY_WARN_HIGH = 8;
  const DIRTY_DANGER_HIGH = 10;

  function loadState(){
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {
        createdAt: nowMs(),
        visits: 0,
        watchedSec: 0,

        phase: "egg",
        warmStartAt: 0,
        hatchedAt: 0,

        alive: true,
        deadReason: "",

        full: 0,
        happy: 0,
        dirty: 0,

        feedCount: 0,
        playCount: 0,
        cleanCount: 0,

        dangerHold: { starving:0, overeat:0, stress:0, overexcite:0, sickness:0 },
        anim: { mode: "idle", frame: 0, untilMs: 0 },
      };
    }
    try { return JSON.parse(raw); }
    catch {
      localStorage.removeItem(KEY);
      return loadState();
    }
  }
  function saveState(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  function calcPoints(s){
    if (!s.alive) return 0;
    const hatchBonus = (s.phase === "live") ? 1 : 0;
    const base = s.visits * 10 + Math.floor(s.watchedSec / 10);
    const care = s.feedCount * 2 + s.playCount * 3 + s.cleanCount * 2;
    const health = Math.max(0, (10 - s.dirty)) + s.happy;
    return Math.max(0, base + (care + health) * hatchBonus);
  }
  function calcLevel(pt){
    if (pt >= 240) return 6;
    if (pt >= 170) return 5;
    if (pt >= 110) return 4;
    if (pt >= 60)  return 3;
    if (pt >= 25)  return 2;
    return 1;
  }

  function phaseLabel(phase){
    if (phase === "egg") return "卵";
    if (phase === "warming") return "孵化待ち";
    if (phase === "live") return "育成中";
    return phase;
  }

  function sizeLabel(s){
    if (s.phase !== "live") return "-";
    const ageSec = Math.max(0, Math.floor((nowMs() - s.hatchedAt) / 1000));
    if (ageSec >= SIZE_LARGE_SEC) return "大";
    if (ageSec >= SIZE_MEDIUM_SEC) return "中";
    return "小";
  }

  function formLabel(lv, phase){
    if (phase !== "live") return "-";
    if (lv <= FORM_CHILD_MAX) return "こども";
    if (lv <= FORM_TEEN_MAX) return "せいねん";
    return "おとな";
  }

  function moodName(s){
    if (!s.alive) return "しぼう";
    if (s.phase === "egg") return "まだ卵";
    if (s.phase === "warming") return "あたため中";

    if (s.full <= FULL_WARN_LOW) return "おなかすいた";
    if (s.full >= FULL_WARN_HIGH) return "くるしい";
    if (s.dirty >= DIRTY_WARN_HIGH) return "きたない";
    if (s.happy <= HAPPY_WARN_LOW) return "しょんぼり";
    if (s.happy >= 8) return "るんるん";
    return "ふつう";
  }

  function dangerFlags(s){
    if (!s.alive || s.phase !== "live") return { warn: [], danger: [] };

    const warn = [];
    const danger = [];

    if (s.full <= FULL_WARN_LOW) warn.push("空腹ぎみ");
    if (s.full <= FULL_DANGER_LOW) danger.push("餓死危険");

    if (s.full >= FULL_WARN_HIGH) warn.push("食べすぎ注意");
    if (s.full >= FULL_DANGER_HIGH) danger.push("過食危険");

    if (s.happy <= HAPPY_WARN_LOW) warn.push("遊び不足");
    if (s.happy <= HAPPY_DANGER_LOW) danger.push("ストレス危険");

    if (s.happy >= HAPPY_WARN_HIGH) warn.push("興奮しすぎ注意");
    if (s.happy >= HAPPY_DANGER_HIGH) danger.push("興奮しすぎ危険");

    if (s.dirty >= DIRTY_WARN_HIGH) warn.push("汚れ注意");
    if (s.dirty >= DIRTY_DANGER_HIGH) danger.push("病気危険");

    return { warn, danger };
  }

  function updateDangerHoldAndMaybeDie(s){
    if (!s.alive || s.phase !== "live") return;

    const starving = (s.full <= FULL_DANGER_LOW);
    const overeat  = (s.full >= FULL_DANGER_HIGH);
    const stress   = (s.happy <= HAPPY_DANGER_LOW);
    const overexc  = (s.happy >= HAPPY_DANGER_HIGH);
    const sick     = (s.dirty >= DIRTY_DANGER_HIGH);

    s.dangerHold.starving   = starving ? s.dangerHold.starving + 1 : 0;
    s.dangerHold.overeat    = overeat  ? s.dangerHold.overeat + 1 : 0;
    s.dangerHold.stress     = stress   ? s.dangerHold.stress + 1 : 0;
    s.dangerHold.overexcite = overexc  ? s.dangerHold.overexcite + 1 : 0;
    s.dangerHold.sickness   = sick     ? s.dangerHold.sickness + 1 : 0;

    if (s.dangerHold.starving >= DANGER_HOLD_SEC) { s.alive=false; s.deadReason="空腹が続いた（餓死）"; return; }
    if (s.dangerHold.overeat >= DANGER_HOLD_SEC)  { s.alive=false; s.deadReason="食べすぎが続いた（過食）"; return; }
    if (s.dangerHold.stress >= DANGER_HOLD_SEC)   { s.alive=false; s.deadReason="遊び不足が続いた（ストレス）"; return; }
    if (s.dangerHold.overexcite >= DANGER_HOLD_SEC){ s.alive=false; s.deadReason="遊びすぎが続いた（興奮）"; return; }
    if (s.dangerHold.sickness >= DANGER_HOLD_SEC) { s.alive=false; s.deadReason="汚れが続いた（病気）"; return; }
  }

  function computeAlert(s){
    if (!s.alive) return { show:true, level:"danger", text:`死亡: ${s.deadReason || "不明"}` };
    if (s.phase === "egg") return { show:true, level:"warn", text:"卵: あたためると孵化準備開始" };
    if (s.phase === "warming") return { show:true, level:"warn", text:`孵化待ち: ${HATCH_WAIT_SEC}秒で孵化` };

    const df = dangerFlags(s);
    if (df.danger.length) return { show:true, level:"danger", text:`危険: ${df.danger.join(" / ")}` };
    if (df.warn.length) return { show:true, level:"warn", text:`注意: ${df.warn.join(" / ")}` };
    return { show:false, level:"", text:"" };
  }

  // ---- UI
  const elVisits  = document.getElementById("visits");
  const elWatched = document.getElementById("watched");
  const elPhase   = document.getElementById("phase");
  const elSize    = document.getElementById("size");
  const elForm    = document.getElementById("form");
  const elLv      = document.getElementById("lv");
  const elState   = document.getElementById("state");
  const elHappy   = document.getElementById("happy");
  const elDirty   = document.getElementById("dirty");
  const elFull    = document.getElementById("full");
  const elScreen  = document.getElementById("screen");
  const elAlertPill = document.getElementById("alertPill");
  const elAlertText = document.getElementById("alertText");

  const btnWarm  = document.getElementById("warm");
  const btnFeed  = document.getElementById("feed");
  const btnPlay  = document.getElementById("play");
  const btnClean = document.getElementById("clean");
  const btnReset = document.getElementById("reset");

  let state = loadState();

  // 訪問：1セッション1回
  if (!sessionStorage.getItem(SESSION_KEY)) {
    state.visits += 1;
    sessionStorage.setItem(SESSION_KEY, "1");
    saveState(state);
  }

  function startAnim(mode, durationMs){
    state.anim.mode = mode;
    state.anim.frame = 0;
    state.anim.untilMs = nowMs() + durationMs;
  }

  function tryHatch(){
    if (state.phase !== "warming") return;
    const elapsed = Math.floor((nowMs() - state.warmStartAt) / 1000);
    if (elapsed >= HATCH_WAIT_SEC) {
      state.phase = "live";
      state.hatchedAt = nowMs();

      state.alive = true;
      state.deadReason = "";
      state.full = 3;
      state.happy = 3;
      state.dirty = 0;

      state.dangerHold = { starving:0, overeat:0, stress:0, overexcite:0, sickness:0 };
      startAnim("feed", 900);
    }
  }

  // タイマー（表示中のみ）
  let timer = null;

  function startTimer(){
    if (timer) return;
    timer = setInterval(() => tick(), 200);
  }

  let lastTickMs = nowMs();
  function tick(){
    const now = nowMs();
    const deltaSec = Math.floor((now - lastTickMs) / 1000);

    if (deltaSec <= 0) {
      if (state.anim.mode !== "idle") {
        if (now >= state.anim.untilMs) state.anim = { mode:"idle", frame:0, untilMs:0 };
        else state.anim.frame += 1;
        saveState(state);
        render();
      }
      return;
    }

    lastTickMs += deltaSec * 1000;

    for (let i = 0; i < deltaSec; i++) {
      state.watchedSec += 1;

      if (state.phase === "warming") tryHatch();

      if (state.alive && state.phase === "live") {
        if (state.watchedSec % FULL_DECAY_SEC === 0) state.full = Math.max(0, state.full - 1);
        if (state.watchedSec % DIRTY_INC_SEC === 0) state.dirty = Math.min(10, state.dirty + 1);
        if (state.watchedSec % HAPPY_DECAY_SEC === 0 && state.happy > 0) state.happy -= 1;

        updateDangerHoldAndMaybeDie(state);
      }
    }

    if (state.anim.mode !== "idle") {
      if (now >= state.anim.untilMs) state.anim = { mode:"idle", frame:0, untilMs:0 };
      else state.anim.frame += 1;
    }

    state.full = clamp(state.full, 0, 99);
    state.happy = clamp(state.happy, 0, 10);
    state.dirty = clamp(state.dirty, 0, 10);

    saveState(state);
    render();
  }

  function stopTimer(){
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTimer();
    else {
      lastTickMs = nowMs();
      startTimer();
    }
  });

  // ボタン
  btnWarm.addEventListener("click", () => {
    if (!state.alive) return;
    if (state.phase === "egg") {
      state.phase = "warming";
      state.warmStartAt = nowMs();
      saveState(state);
      render();
    }
  });

  btnFeed.addEventListener("click", () => {
    if (!state.alive) return;
    if (state.phase !== "live") return;

    state.feedCount += 1;
    state.full += 2;
    state.happy = Math.min(10, state.happy + 1);
    state.dirty = Math.min(10, state.dirty + 1);

    startAnim("feed", 1200);
    saveState(state);
    render();
  });

  btnPlay.addEventListener("click", () => {
    if (!state.alive) return;
    if (state.phase !== "live") return;

    state.playCount += 1;
    state.happy = Math.min(10, state.happy + 3);
    state.full = Math.max(0, state.full - 1);
    state.dirty = Math.min(10, state.dirty + 1);

    startAnim("play", 2600);
    saveState(state);
    render();
  });

  btnClean.addEventListener("click", () => {
    if (!state.alive) return;
    if (state.phase !== "live") return;

    state.cleanCount += 1;
    state.dirty = Math.max(0, state.dirty - 3);
    state.happy = Math.min(10, state.happy + 1);

    saveState(state);
    render();
  });

  btnReset.addEventListener("click", () => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(SESSION_KEY);
    state = loadState();
    lastTickMs = nowMs();
    saveState(state);
    render();
  });

  function render(){
    const pt = calcPoints(state);
    const lv = calcLevel(pt);

    const phase = state.phase;
    const size = sizeLabel(state);
    const form = formLabel(lv, phase);
    const mood = moodName(state);

    elVisits.textContent = String(state.visits);
    elWatched.textContent = String(state.watchedSec);
    elPhase.textContent = phaseLabel(phase);
    elSize.textContent = size;
    elForm.textContent = form;
    elLv.textContent = String(lv);
    elState.textContent = mood;
    elHappy.textContent = String(state.happy);
    elDirty.textContent = String(state.dirty);
    elFull.textContent = String(state.full);

    const alert = computeAlert(state);
    if (alert.show) {
      elAlertPill.style.display = "inline-block";
      elAlertText.textContent = alert.text;
      elAlertPill.classList.remove("warn","danger");
      if (alert.level) elAlertPill.classList.add(alert.level);
    } else {
      elAlertPill.style.display = "none";
    }

    // ---- ここが今回の要件：見た目も消す（egg 以外は非表示）
    btnWarm.style.display = (state.phase === "egg") ? "" : "none";

    // 世話ボタン
    const canCare = state.alive && (state.phase === "live");
    btnFeed.disabled  = !canCare;
    btnPlay.disabled  = !canCare;
    btnClean.disabled = !canCare;

    // 描画
    let sprite = "";
    if (state.phase === "egg" || state.phase === "warming") {
      sprite = eggSprite(state, nowMs, clamp, HATCH_WAIT_SEC);
    } else if (!state.alive) {
      sprite = spriteDead();
    } else if (state.anim.mode === "play") {
      sprite = spritePlayFrame(state.anim.frame, form);
    } else if (state.anim.mode === "feed") {
      sprite = spriteFeedFlash(state.anim.frame, form);
    } else {
      sprite = spritePet(size, form, mood, state, clamp);
    }

    const df = dangerFlags(state);
    const warnLine = df.warn.length ? `WARN: ${df.warn.join(" / ")}` : "";
    const dangLine = df.danger.length ? `DANGER: ${df.danger.join(" / ")}` : "";
    const holdLine = (state.phase === "live")
      ? `HOLD(s): starving=${state.dangerHold.starving} overeat=${state.dangerHold.overeat} stress=${state.dangerHold.stress} overexcite=${state.dangerHold.overexcite} sick=${state.dangerHold.sickness}`
      : "";

    elScreen.textContent =
      sprite +
      "\n\n" +
      (state.phase === "live" ? (badgeLine(state, clamp) + "\n") : "") +
      `pt=${pt} feed=${state.feedCount} play=${state.playCount} clean=${state.cleanCount}` +
      (warnLine ? `\n${warnLine}` : "") +
      (dangLine ? `\n${dangLine}` : "") +
      (holdLine ? `\n${holdLine}` : "") +
      (!state.alive ? `\n理由: ${state.deadReason}` : "");
  }

  // 初期描画
  lastTickMs = nowMs();
  startTimer();
  render();
})();
