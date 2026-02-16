editor.addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    const start = editor.selectionStart;
    const value = editor.value;
    const before = value.slice(0, start);
    const after = value.slice(start);

    const lines = before.split("\n");
    const prevLine = lines[lines.length - 1];

    // 自動リスト補完
    const matchBullet = /^(\s*)[-*+] /.exec(prevLine);
    const matchNumber = /^(\s*)(\d+)\. /.exec(prevLine);

    let insertText = "\n";
    if (matchBullet) {
      insertText += matchBullet[1] + "- ";
    } else if (matchNumber) {
      const indent = matchNumber[1];
      const nextNum = parseInt(matchNumber[2], 10) + 1;
      insertText += `${indent}${nextNum}. `;
    }

    e.preventDefault();
    editor.value = before + insertText + after;
    const cursor = start + insertText.length;
    editor.selectionStart = editor.selectionEnd = cursor;

    render();
  }
});
