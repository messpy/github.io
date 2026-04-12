import {
  PHASE_WARMING, PHASE_LIVE,
  HATCH_WAIT_SEC,
  FULL_DECAY_SEC, DIRTY_INC_SEC, HAPPY_DECAY_SEC,
  DANGER_HOLD_SEC,
  FULL_DANGER_LOW, FULL_DANGER_HIGH,
  HAPPY_DANGER_LOW, HAPPY_DANGER_HIGH,
  DIRTY_DANGER_HIGH
} from "./constants.js";

const clamp = (n,a,b) => Math.max(a, Math.min(b, n));

function tryHatch(s){
  if (s.phase !== PHASE_WARMING) return s;
  const elapsed = Math.floor((Date.now() - s.warmStartAt) / 1000);
  if (elapsed < HATCH_WAIT_SEC) return s;

  s.phase = PHASE_LIVE;
  s.hatchedAt = Date.now();

  s.alive = true;
  s.deadReason = "";
  s.full = 3;
  s.happy = 3;
  s.dirty = 0;

  s.dangerHold = { starving:0, overeat:0, stress:0, overexcite:0, sickness:0 };
  s.anim = { mode: "idle", frame: 0, untilMs: 0 };
  return s;
}

function updateDangerHoldAndMaybeDie(s){
  if (!s.alive || s.phase !== PHASE_LIVE) return s;

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

  if (s.dangerHold.starving >= DANGER_HOLD_SEC) { s.alive=false; s.deadReason="空腹が続いた（餓死）"; }
  else if (s.dangerHold.overeat >= DANGER_HOLD_SEC) { s.alive=false; s.deadReason="食べすぎが続いた（過食）"; }
  else if (s.dangerHold.stress >= DANGER_HOLD_SEC) { s.alive=false; s.deadReason="遊び不足が続いた（ストレス）"; }
  else if (s.dangerHold.overexcite >= DANGER_HOLD_SEC) { s.alive=false; s.deadReason="遊びすぎが続いた（興奮）"; }
  else if (s.dangerHold.sickness >= DANGER_HOLD_SEC) { s.alive=false; s.deadReason="汚れが続いた（病気）"; }

  return s;
}

export function tickGame(s){
  s.watchedSec += 1;

  if (s.phase === PHASE_WARMING) s = tryHatch(s);

  if (s.alive && s.phase === PHASE_LIVE) {
    if (s.watchedSec % FULL_DECAY_SEC === 0) s.full = Math.max(0, s.full - 1);
    if (s.watchedSec % DIRTY_INC_SEC === 0) s.dirty = Math.min(10, s.dirty + 1);
    if (s.watchedSec % HAPPY_DECAY_SEC === 0 && s.happy > 0) s.happy -= 1;

    s = updateDangerHoldAndMaybeDie(s);
  }

  s.full = clamp(s.full, 0, 99);
  s.happy = clamp(s.happy, 0, 10);
  s.dirty = clamp(s.dirty, 0, 10);

  return s;
}