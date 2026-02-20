export function eggSprite({ phase, warmStartAt }, nowMs, clamp, HATCH_WAIT_SEC) {
  const p = (phase !== "warming") ? 0 : clamp(Math.floor((nowMs() - warmStartAt) / 1000) / HATCH_WAIT_SEC, 0, 1);
  const bar = Math.floor(p * 10);
  const gauge = "■".repeat(bar).padEnd(10, "·");

  const crack1 = p > 0.33 ? "  /\\  " : "      ";
  const crack2 = p > 0.66 ? " /__\\ " : "      ";

  const remain = (phase === "warming")
    ? Math.max(0, HATCH_WAIT_SEC - Math.floor((nowMs() - warmStartAt)/1000))
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
    "",
    "  ボタン: あたためる",
  ].join("\n");
}

function eyesMouth(mood, form){
  const baseEyes =
    form === "おとな" ? "˘  ˘" :
    form === "せいねん" ? "•  ˘" :
    "•  •";

  if (mood === "るんるん") return { eyes: baseEyes, mouth: "ᴗ", cheek:"˶" };
  if (mood === "しょんぼり") return { eyes: baseEyes, mouth: "︵", cheek:" " };
  if (mood === "きたない") return { eyes: baseEyes, mouth: "…", cheek:" " };
  if (mood === "くるしい") return { eyes: baseEyes, mouth: "︵", cheek:"°" };
  if (mood === "おなかすいた") return { eyes: baseEyes, mouth: "︵", cheek:" " };
  if (mood === "しぼう") return { eyes: "×  ×", mouth: "︵", cheek:" " };
  return { eyes: baseEyes, mouth: "ᴥ", cheek:"˶" };
}

export function badgeLine(s, clamp){
  const f = "■".repeat(clamp(s.full,0,14)).padEnd(14,"·");
  const h = "■".repeat(clamp(s.happy,0,10)).padEnd(10,"·");
  const d = "■".repeat(clamp(s.dirty,0,10)).padEnd(10,"·");
  return `FULL[${f}]  HAPPY[${h}]  DIRTY[${d}]`;
}

export function spriteDead(){
  return [
    "            ",
    "   .-''''-. ",
    "  /  ×  × \\",
    " |    ︵    |",
    " |  .____.  |",
    "  \\________/ ",
    "    _||_     ",
    "   /____\\    ",
    "",
    "  しんだ…",
  ].join("\n");
}

export function spritePet(size, form, mood, s, clamp){
  if (!s.alive) return spriteDead();

  const em = eyesMouth(mood, form);
  const poop = "※".repeat(clamp(Math.floor(s.dirty/2),0,6));
  const food = "o".repeat(clamp(Math.floor(s.full/2),0,6));

  const top =
    form === "こども" ? "   ૮₍ ˶• ༝ •˶ ₎ა  " :
    form === "せいねん" ? "     ✧  ✦        " :
    "       /^\\        ";

  const ribbon = (form === "こども") ? "  ( ) ( )  " : "          ";
  const collar = (form === "おとな") ? "   ──┬──   " : "          ";

  if (size === "小") {
    return [
      top,
      "   .-''-.   ",
      "  / .--.\\  ",
      ` | ( ${em.eyes} ) | `,
      ` |   ${em.cheek}${em.mouth}${em.cheek}   | `,
      ribbon,
      "  \\ '~~' /  ",
      "   '.__.'   ",
      collar,
      `  food:${food.padEnd(6,"·")} dirt:${poop.padEnd(6,"·")}`,
    ].join("\n");
  }

  if (size === "中") {
    return [
      top,
      "   .-''''-.      ",
      "  /  .--.  \\     ",
      ` |  ( ${em.eyes} )  |    `,
      ` |     ${em.cheek}${em.mouth}${em.cheek}     |    `,
      " |   .----.   |  ",
      "  \\  '----'  /   ",
      "   '._    _.'    ",
      "      '---'      ",
      collar,
      `   food:${food.padEnd(6,"·")}  dirt:${poop.padEnd(6,"·")}`,
    ].join("\n");
  }

  const bodyMark = (form === "おとな") ? ".========." : ".--------.";
  return [
    top,
    "  .-''''''''-.   ",
    " /  .------.  \\  ",
    `|  (  ${em.eyes}  )  | `,
    `|      ${em.cheek}${em.mouth}${em.cheek}      | `,
    `|   ${bodyMark}  |`,
    "|  /  ____   \\ |",
    " \\ \\ '----'  / /",
    "  '._      _.'  ",
    "     '----'     ",
    collar,
    `  food:${food.padEnd(6,"·")}  dirt:${poop.padEnd(6,"·")}`,
  ].join("\n");
}

export function spritePlayFrame(frame, form){
  const em = eyesMouth("るんるん", form);
  const hands = frame % 2 === 0 ? "/\\  /\\" : "\\/  \\/";
  const jump  = frame % 2 === 0 ? "   " : " ";
  return [
    "            ",
    `${jump} .-''''-.   `,
    `${jump}/  .--.  \\  `,
    `${jump}| ( ${em.eyes} ) |  `,
    `${jump}|   ${em.cheek}${em.mouth}${em.cheek}   |  `,
    `${jump}|  ${hands}  |  `,
    `${jump}\\  '----' /  `,
    `${jump} '._  _.'   `,
    `${jump}   '---'    `,
    "    ♪  ♪     ",
    "",
    "   あそぶ！   ",
  ].join("\n");
}

export function spriteFeedFlash(frame, form){
  const munch = frame % 2 === 0 ? "もぐもぐ" : "もっもっ";
  const em = eyesMouth("るんるん", form);
  return [
    "            ",
    "   .-''''-. ",
    "  /  .--.  \\",
    ` |  ( ${em.eyes} ) |`,
    " |     ᴗ     |",
    " |   (___)   |",
    "  \\  '---'  / ",
    "   '._  _.'   ",
    "      '---'   ",
    "",
    `   ${munch}…`,
  ].join("\n");
}
