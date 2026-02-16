// app.js
const editor = document.getElementById("editor");
const preview = document.getElementById("preview");

function render() {
  const raw = marked.parse(editor.value || "");
  preview.innerHTML = DOMPurify.sanitize(raw);
}

function insert(md) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;
  editor.value = text.slice(0, start) + md + text.slice(end);
  editor.focus();
  editor.selectionStart = editor.selectionEnd = start + md.length;
  render();
}

function downloadMd() {
  const blob = new Blob([editor.value], {type: "text/markdown"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "output.md";
  a.click();
  URL.revokeObjectURL(url);
}

editor.addEventListener("input", render);
render();
