export const KEY = "roragotchi_state_v1";

// 段階
export const PHASE_EGG = "egg";
export const PHASE_WARMING = "warming";
export const PHASE_LIVE = "live";

// 孵化（15秒）
export const HATCH_WAIT_SEC = 15;

// 自然変化（孵化後のみ）
export const FULL_DECAY_SEC = 18;
export const DIRTY_INC_SEC = 35;
export const HAPPY_DECAY_SEC = 25;

// サイズ（孵化後経過）
export const SIZE_MEDIUM_SEC = 90;
export const SIZE_LARGE_SEC = 240;

// 進化（レベル）
export const FORM_CHILD_MAX = 2;
export const FORM_TEEN_MAX = 4;

// バランス死亡（死亡域が連続でこの秒数）
export const DANGER_HOLD_SEC = 20;

// 満腹
export const FULL_WARN_LOW = 1;
export const FULL_DANGER_LOW = 0;
export const FULL_WARN_HIGH = 11;
export const FULL_DANGER_HIGH = 14;

// 機嫌
export const HAPPY_WARN_LOW = 1;
export const HAPPY_DANGER_LOW = 0;
export const HAPPY_WARN_HIGH = 11;
export const HAPPY_DANGER_HIGH = 15;

// 汚れ
export const DIRTY_WARN_HIGH = 8;
export const DIRTY_DANGER_HIGH = 10;