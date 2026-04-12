import { loadState, saveState, clearState } from "./modules/storage.js";
import { bindUI, renderUI } from "./modules/ui.js";
import { tickGame } from "./modules/game.js";

let state = loadState();
let lastTickMs = Date.now();
let timer = null;

const ui = bindUI({
  onWarm: () => {
    if (!state.alive) return;
    if (state.phase === "egg") {
      state.phase = "warming";
      state.warmStartAt = Date.now();
      saveState(state);
      renderUI(state);
    }
  },
  onFeed: () => {
    if (!state.alive || state.phase !== "live") return;
    state.feedCount += 1;
    state.full += 2;
    state.happy = Math.min(10, state.happy + 1);
    state.dirty = Math.min(10, state.dirty + 1);
    const msg = state.full < 5 ? "ばくばく！" : "もぐもぐ";
    state.anim = { mode: "feed", frame: 0, untilMs: Date.now() + 1200, message: msg };
    saveState(state);
    renderUI(state);
  },
  onPlay: () => {
    if (!state.alive || state.phase !== "live") return;
    state.playCount += 1;
    state.happy = Math.min(10, state.happy + 3);
    state.full = Math.max(0, state.full - 1);
    state.dirty = Math.min(10, state.dirty + 1);
    const msg = state.happy < 5 ? "うれしい！" : "たのしいー";
    state.anim = { mode: "play", frame: 0, untilMs: Date.now() + 2600, message: msg };
    saveState(state);
    renderUI(state);
  },
  onClean: () => {
    if (!state.alive || state.phase !== "live") return;
    state.cleanCount += 1;
    state.dirty = Math.max(0, state.dirty - 3);
    const msg = state.dirty > 5 ? "ごしごし！" : "ピカピカ！";
    state.anim = { mode: "clean", frame: 0, untilMs: Date.now() + 1500, message: msg };
    saveState(state);
    renderUI(state);
  },
  onReset: () => {
    if (confirm("最初からやり直しますか？")) {
      clearState();
      state = loadState();
      lastTickMs = Date.now();
      saveState(state);
      renderUI(state);
    }
  },
});

// 訪問：1セッション1回（storage.jsで扱うKEYとは別）
if (!sessionStorage.getItem("roragotchi_counted_session_v1")) {
  state.visits += 1;
  sessionStorage.setItem("roragotchi_counted_session_v1", "1");
  saveState(state);
}

function startTimer(){
  if (timer) return;
  timer = setInterval(() => {
    const now = Date.now();
    let hasChanged = false;

    // アニメ更新 (1200msや2600msなどの一定時間の間)
    if (state.anim?.mode && state.anim.mode !== "idle") {
      if (now >= state.anim.untilMs) {
        state.anim = { mode: "idle", frame: 0, untilMs: 0 };
      } else {
        state.anim.frame += 1;
      }
      hasChanged = true;
    }

    const deltaSec = Math.floor((now - lastTickMs) / 1000);
    if (deltaSec > 0) {
      lastTickMs += deltaSec * 1000;
      for (let i = 0; i < deltaSec; i++) {
        state = tickGame(state);
      }
      hasChanged = true;
    }

    if (hasChanged) {
      saveState(state);
      renderUI(state);
    }
  }, 200);
}

function stopTimer(){
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopTimer();
  else {
    lastTickMs = Date.now();
    startTimer();
  }
});

// 初期
renderUI(state);
startTimer();