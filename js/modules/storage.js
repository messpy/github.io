import { KEY } from "./constants.js";

const nowMs = () => Date.now();

export function loadState(){
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return {
      createdAt: nowMs(),
      visits: 0,
      watchedSec: 0,

      phase: "egg",       // egg -> warming -> live
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

export function saveState(s){
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearState(){
  localStorage.removeItem(KEY);
}