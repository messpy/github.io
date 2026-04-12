import {
  FULL_WARN_LOW, FULL_DANGER_LOW, FULL_WARN_HIGH, FULL_DANGER_HIGH,
  HAPPY_WARN_LOW, HAPPY_DANGER_LOW, HAPPY_WARN_HIGH, HAPPY_DANGER_HIGH,
  DIRTY_WARN_HIGH, DIRTY_DANGER_HIGH,
  HATCH_WAIT_SEC
} from "./constants.js";

import {
  calcPoints, calcLevel,
  phaseLabel, sizeLabel, formLabel, moodName,
  eggSprite, spriteDead, spritePet,
  badgeLine, renderGauges
} from "./sprites.js";

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

function computeAlert(s){
  if (!s.alive) return { show:true, level:"danger", text:`死亡: ${s.deadReason || "不明"}` };
  if (s.phase === "egg") return { show:true, level:"warn", text:"卵: あたためると孵化準備開始" };
  if (s.phase === "warming") return { show:true, level:"warn", text:`孵化待ち: ${HATCH_WAIT_SEC}秒で孵化` };
  const df = dangerFlags(s);
  if (df.danger.length) return { show:true, level:"danger", text:`危険: ${df.danger.join(" / ")}` };
  if (df.warn.length) return { show:true, level:"warn", text:`注意: ${df.warn.join(" / ")}` };
  return { show:false, level:"", text:"" };
}

export function bindUI(handlers){
  const $ = (id) => document.getElementById(id);
  const ui = {
    visits: $("visits"), watched: $("watched"), phase: $("phase"), size: $("size"),
    form: $("form"), lv: $("lv"), state: $("state"), happy: $("happy"),
    dirty: $("dirty"), full: $("full"), screen: $("screen"),
    alertPill: $("alertPill"), alertText: $("alertText"),
    btnWarm: $("warm"), btnFeed: $("feed"), btnPlay: $("play"), btnClean: $("clean"), btnReset: $("reset"),
  };
  ui.btnWarm.addEventListener("click", handlers.onWarm);
  ui.btnFeed.addEventListener("click", handlers.onFeed);
  ui.btnPlay.addEventListener("click", handlers.onPlay);
  ui.btnClean.addEventListener("click", handlers.onClean);
  ui.btnReset.addEventListener("click", handlers.onReset);
  window.__roragotchi_ui = ui;
  return ui;
}

export function renderUI(state){
  const ui = window.__roragotchi_ui;
  if (!ui) return;
  const pt = calcPoints(state);
  const lv = calcLevel(pt);
  const phase = state.phase;
  const size = sizeLabel(state);
  const form = formLabel(lv, phase);
  const mood = moodName(state);

  ui.visits.textContent = String(state.visits);
  ui.watched.textContent = String(state.watchedSec);
  ui.phase.textContent = phaseLabel(phase);
  ui.size.textContent = size;
  ui.form.textContent = form;
  ui.lv.textContent = String(lv);
  ui.state.textContent = mood;
  ui.happy.textContent = String(state.happy);
  ui.dirty.textContent = String(state.dirty);
  ui.full.textContent = String(state.full);

  const alert = computeAlert(state);
  if (alert.show) {
    ui.alertPill.style.display = "inline-block";
    ui.alertText.textContent = alert.text;
    ui.alertPill.classList.remove("warn","danger");
    if (alert.level) ui.alertPill.classList.add(alert.level);
  } else {
    ui.alertPill.style.display = "none";
  }

  ui.btnWarm.style.display = (state.phase === "egg") ? "" : "none";
  const canCare = state.alive && (state.phase === "live");
  ui.btnFeed.disabled  = !canCare;
  ui.btnPlay.disabled  = !canCare;
  ui.btnClean.disabled = !canCare;

  let sprite = "";
  if (state.phase === "egg" || state.phase === "warming") {
    sprite = eggSprite(state);
  } else if (!state.alive) {
    sprite = spriteDead();
  } else {
    // 常に spritePet を使用（アニメーション状態 state を渡す）
    sprite = spritePet(size, form, mood, state);
  }

  const df = dangerFlags(state);
  const warnLine = df.warn.length ? `WARN: ${df.warn.join(" / ")}` : "";
  const dangLine = df.danger.length ? `DANGER: ${df.danger.join(" / ")}` : "";

  ui.screen.textContent =
    sprite + "\n\n" +
    (state.phase === "live" ? (badgeLine(state) + "\n" + renderGauges(state)) : "") +
    (warnLine ? `\n${warnLine}` : "") +
    (dangLine ? `\n${dangLine}` : "") +
    (!state.alive ? `\n理由: ${state.deadReason}` : "");
}
