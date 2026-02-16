const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const fileInput = document.getElementById("fileInput");
const exportBtn = document.getElementById("exportBtn");

function render() {
  const raw = marked.parse(editor.value || "");
  preview.innerHTML = DOMPurify.sanitize(raw);
}

editor.addEventListener("input", render);

fileInput.addEventListener("change", function(e){
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = function(ev){
    editor.value = ev.target.result;
    render();
  };
  reader.readAsText(file);
});

exportBtn.addEventListener("click", function(){
  const html = preview.innerHTML;
  const blob = new Blob([md], {type:"text/md"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "export.md";
  a.click();

  URL.revokeObjectURL(url);
});

render();
