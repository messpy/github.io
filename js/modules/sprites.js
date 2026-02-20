import {
  PHASE_EGG, PHASE_WARMING, PHASE_LIVE, HATCH_WAIT_SEC,
  SIZE_MEDIUM_SEC, SIZE_LARGE_SEC,
  FORM_CHILD_MAX, FORM_TEEN_MAX
} from "./constants.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function calcPoints(s) {
  return (s.feedCount * 2) + (s.playCount * 5) + (s.cleanCount * 3) + Math.floor(s.watchedSec / 10);
}

export function calcLevel(pt) {
  if (pt < 10) return 1;
  if (pt < 30) return 2;
  if (pt < 60) return 3;
  if (pt < 100) return 4;
  return 5;
}

export function phaseLabel(p) {
  if (p === PHASE_EGG) return "卵";
  if (p === PHASE_WARMING) return "あたため中";
  if (p === PHASE_LIVE) return "活動中";
  return p;
}

export function sizeLabel(s) {
  if (s.phase !== PHASE_LIVE) return "---";
  const age = Math.floor((Date.now() - s.hatchedAt) / 1000);
  if (age < SIZE_MEDIUM_SEC) return "小型";
  if (age < SIZE_LARGE_SEC) return "中型";
  return "大型";
}

export function formLabel(lv, phase) {
  if (phase !== PHASE_LIVE) return "---";
  if (lv === 1) return "あかちゃん";
  if (lv === 2) return "つぎ";
  if (lv === 3) return "こども";
  if (lv === 4) return "おとな";
  return "おやじ";
}

export function moodName(s) {
  if (!s.alive) return "しぼう";
  if (s.phase !== PHASE_LIVE) return "じゅんび";
  if (s.happy >= 8) return "ごきげん";
  if (s.happy >= 4) return "ふつう";
  return "かなしい";
}

export function eggSprite(s) {
  const p = (s.phase !== PHASE_WARMING) ? 0 : clamp((Date.now() - s.warmStartAt) / 1000 / HATCH_WAIT_SEC, 0, 1);
  const bar = Math.floor(p * 10);
  const gauge = "■".repeat(bar).padEnd(10, "·");
  const crack1 = p > 0.33 ? "  /\\  " : "      ";
  const crack2 = p > 0.66 ? " /__\\ " : "      ";
  const remain = (s.phase === PHASE_WARMING)
    ? Math.max(0, HATCH_WAIT_SEC - Math.floor((Date.now() - s.warmStartAt) / 1000))
    : HATCH_WAIT_SEC;

  return [
    "      ____      ",
    "    .-    -.    ",
    "   /  .--.  \\   ",
    "  |  /    \\  |  ",
    `  |  |${crack1}|  |  `,
    `  |  |${crack2}|  |  `,
    "   \\  '--'  /   ",
    "    '-.__.-'    ",
    "",
    `  あたため: [${gauge}]`,
    `  残り: ${remain} 秒`,
  ].join("\n");
}

export function spriteDead() {
  return [
    "            ",
    "   .-''''-. ",
    "  /  ×  × \\",
    " |    ︵    |",
    " |  .____.  |",
    "  \\________/ ",
    "",
    "  (しんでしまった)",
  ].join("\n");
}

export function spritePet(size, form, mood, s) {
  const isPlay = s.anim?.mode === "play";
  const isFeed = s.anim?.mode === "feed";
  const isClean = s.anim?.mode === "clean";
  const jump = (isPlay && s.anim.frame % 2 !== 0) ? "\n" : "";

  // 表情決定
  let eye = (mood === "ごきげん") ? "●" : "▪";
  let mouth = (mood === "ごきげん") ? "v" : (mood === "かなしい" ? "^" : "▄▄▄");
  if (isPlay) { eye = (s.anim.frame % 2 === 0) ? "^" : "◡"; mouth = "ω"; }
  else if (isFeed) { eye = "◡"; mouth = "◡"; }
  else if (isClean) { eye = "·"; mouth = "o"; }

  // メッセージ（吹き出し）
  const balloon = (s.anim?.message) ? `  ＼ ${s.anim.message} ／\n` : "\n";

  // 1. あかちゃん (lv1) - 幅を厳密に固定
  if (form === "あかちゃん") {
    const m = (mouth === "▄▄▄") ? "▄▄▄" : ` ${mouth} `;
    return balloon + jump + [
      "      ▄▄▄▄▄",
      "    ▄█     █▄",
      `   █   ${eye}   ${eye}  █`,
      `   █      ${m}  █`,
      "    ▀█     █▀",
      "      ▀▀▀▀▀",
    ].join("\n");
  }

  // 2. つぎ (lv2)
  if (form === "つぎ") {
    const m = (mouth === "▄▄▄") ? "▄▄▄" : ` ${mouth} `;
    return balloon + jump + [
      "      ▄▄▄▄▄",
      "    ▄█     █▄",
      `   █   ${eye}   ${eye}  █`,
      `   █      ${m}  █`,
      "    ▀█     █▀",
      "      █   █",
      "     ▀▀   ▀▀",
    ].join("\n");
  }

  // 3. こども (lv3)
  if (form === "こども") {
    const m = (mouth === "▄▄▄") ? "▄▄▄" : ` ${mouth} `;
    return balloon + jump + [
      "        ▄▄▄",
      "      ▄█   █▄",
      `     █   ${eye}   ${eye}  █`,
      `     █     ${m}    █`,
      "      ▀█          █▀",
      "        █          █",
      "        █          █",
      "       ▀▀    ▀▀",
    ].join("\n");
  }

  // 4. おとな (lv4)
  if (form === "おとな") {
    const m = (mouth === "▄▄▄") ? "▄▄▄" : ` ${mouth} `;
    return balloon + jump + [
      "        ▄▄▄▄▄",
      "      ▄█     █▄",
      `     █    ${eye}   ${eye}   █`,
      `     █       ${m}      █`,
      "      ▀█          █▀",
      "        █          █",
      "        █          █",
      "       ▄█          █▄",
      "      ▀▀    ▀▀    ▀▀",
    ].join("\n");
  }

  // 5. おやじ (lv5)
  return balloon + jump + [
    "        ▄▄▄▄▄",
    "      ▄█     █▄",
    `     █    ${eye}   ${eye}   █`,
    `     █       ${(isPlay || isFeed || isClean) ? mouth : "▀ ▀"}      █`,
    "      ▀█          █▀",
    "        █          █",
    "        █          █",
    "       ▄█          █▄",
    "     ▄█              █▄",
    "    ▀▀   ▀▀      ▀▀   ▀▀",
  ].join("\n");
}

export function badgeLine(s) {
  const items = [];
  if (s.full > 8) items.push("🍴満腹");
  if (s.happy > 8) items.push("✨満足");
  if (s.dirty === 0) items.push("🧼清潔");
  return items.length ? `[ ${items.join(" ")} ]` : "";
}

function makeBar(val, max, len = 10) {
  const p = Math.floor(clamp(val / max, 0, 1) * len);
  return "[" + "■".repeat(p).padEnd(len, "·") + "]";
}

export function renderGauges(s) {
  if (s.phase !== PHASE_LIVE) return "";

  const pt = calcPoints(s);
  const lv = calcLevel(pt);
  
  // 次のレベルまでの目標値
  const nextGoals = [0, 10, 30, 60, 100, 999];
  const currentGoal = nextGoals[lv];
  const prevGoal = nextGoals[lv - 1];
  const progress = pt - prevGoal;
  const needed = currentGoal - prevGoal;

  // 危険度 (HOLD秒数の最大値)
  const maxHold = Math.max(
    s.dangerHold.starving, s.dangerHold.overeat,
    s.dangerHold.stress, s.dangerHold.overexcite, s.dangerHold.sickness
  );

  const lines = [
    `  まんぷく: ${makeBar(s.full, 10)}`,
    `  きげん　: ${makeBar(s.happy, 10)}`,
    `  よごれ　: ${makeBar(s.dirty, 10)}`,
    `  しんか　: ${makeBar(progress, needed)} (Lv.${lv})`,
  ];

  if (maxHold > 0) {
    lines.push(`  ※キケン: ${makeBar(maxHold, 20)}`);
  }

  return lines.join("\n");
}
