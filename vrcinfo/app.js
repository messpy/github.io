(() => {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const results = document.getElementById("results");
    const downloadBtn = document.getElementById("downloadJson");
    const copyBtn = document.getElementById("copyJson");

    const statLoaded = document.getElementById("statLoaded");
    const statXmp = document.getElementById("statXmp");
    const statVrc = document.getElementById("statVrc");
    const statOther = document.getElementById("statOther");

    const parsedData = [];
    const fileRefs = []; // store File objects for preview

    // ── Drag & Drop ──
    dropZone.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
    dropZone.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener("change", () => handleFiles(fileInput.files));

    // ── Actions ──
    downloadBtn.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "vrc_metadata.json";
        a.click();
        URL.revokeObjectURL(a.href);
    });

    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2))
            .then(() => alert("クリップボードにコピーしました"))
            .catch(() => alert("コピーに失敗しました"));
    });

    // ── File Handling ──
    function handleFiles(fileList) {
        for (const file of fileList) {
            if (!file.type.match(/^image\/(png|jpeg)$/)) continue;
            processFile(file);
        }
    }

    async function processFile(file) {
        const buffer = await file.arrayBuffer();
        const array = new Uint8Array(buffer);

        // Store file reference for preview
        const fileIndex = fileRefs.length;
        fileRefs.push(file);

        // Basic info
        const info = {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            sha256: await sha256(buffer),
        };

        // Image dimensions
        const dims = await getImageDimensions(buffer);
        info.width = dims.width;
        info.height = dims.height;

        // Parsers
        info.xmp = null;
        info.vrc = {};
        info.exif = [];
        info.pngText = [];
        info.hasXmp = false;
        info.hasVrc = false;
        info.hasExif = false;
        info.hasPngText = false;

        if (file.type === "image/png") {
            parsePng(array, info);
        } else if (file.type === "image/jpeg") {
            parseJpeg(array, info);
        }

        // Extract VRC fields from XMP
        if (info.xmp) {
            extractVrcFields(info.xmp, info.vrc);
            info.hasVrc = Object.keys(info.vrc).length > 0;
        }

        parsedData.push(info);
        updateStats();
        renderCard(info, fileIndex);
        enableButtons();
    }

    // ── SHA-256 ──
    async function sha256(buffer) {
        const hash = await crypto.subtle.digest("SHA-256", buffer);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    // ── Image Dimensions ──
    function getImageDimensions(buffer) {
        return new Promise((resolve) => {
            const blob = new Blob([buffer]);
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = URL.createObjectURL(blob);
        });
    }

    // ── PNG Parser ──
    function parsePng(array, info) {
        let offset = 8; // skip signature
        while (offset < array.length) {
            const length = readUint32(array, offset);
            const type = readChunkType(array, offset + 4);
            const dataStart = offset + 8;

            if (type === "tEXt") {
                const text = decodeTextChunk(array, dataStart, length, type);
                info.pngText.push(text);
                info.hasPngText = true;
            } else if (type === "iTXt") {
                const text = decodeITxtChunk(array, dataStart, length);
                info.pngText.push(text);
                info.hasPngText = true;
            } else if (type === "zTXt") {
                info.pngText.push({ type: "zTXt", keyword: "(zTXt)", value: "compressed (detected only)" });
                info.hasPngText = true;
            } else if (type === "XMP") {
                info.xmp = decodeXmpChunk(array, dataStart, length);
                info.hasXmp = true;
            }

            offset = dataStart + length + 4; // skip CRC
            if (type === "IEND") break;
        }
    }

    function readUint32(arr, off) {
        return (arr[off] << 24 | arr[off + 1] << 16 | arr[off + 2] << 8 | arr[off + 3]) >>> 0;
    }

    function readChunkType(arr, off) {
        return String.fromCharCode(arr[off], arr[off + 1], arr[off + 2], arr[off + 3]);
    }

    function decodeTextChunk(arr, start, length, type) {
        const sepIndex = arr.indexOf(0, start);
        if (sepIndex === -1 || sepIndex >= start + length) return { type, keyword: "(parse error)", value: "" };
        const keyword = new TextDecoder().decode(arr.slice(start, sepIndex));
        const value = new TextDecoder().decode(arr.slice(sepIndex + 1, start + length));
        return { type, keyword, value };
    }

    function decodeITxtChunk(arr, start, length) {
        const sep1 = arr.indexOf(0, start);
        if (sep1 === -1 || sep1 >= start + length) return { type: "iTXt", keyword: "(parse error)", value: "" };
        const keyword = new TextDecoder().decode(arr.slice(start, sep1));
        let pos = sep1 + 1;
        const sep2 = arr.indexOf(0, pos);
        if (sep2 === -1 || sep2 >= start + length) return { type: "iTXt", keyword, value: "(parse error)" };
        pos = sep2 + 1;
        const sep3 = arr.indexOf(0, pos);
        if (sep3 === -1 || sep3 >= start + length) return { type: "iTXt", keyword, value: "(parse error)" };
        pos = sep3 + 1;
        const value = new TextDecoder().decode(arr.slice(pos, start + length));
        return { type: "iTXt", keyword, value };
    }

    function decodeXmpChunk(arr, start, length) {
        return new TextDecoder().decode(arr.slice(start, start + length));
    }

    // ── JPEG / EXIF Parser ──
    function parseJpeg(array, info) {
        let offset = 0;
        while (offset < array.length - 1) {
            if (array[offset] !== 0xFF) { offset++; continue; }
            const marker = array[offset + 1];
            if (marker === 0xD8 || marker === 0xD9) { offset += 2; continue; } // SOI / EOI
            if (marker < 0xD0 || marker > 0xD7) {
                const segLength = readUint16(array, offset + 2);
                if (marker === 0xE1 && segLength > 8) { // APP1
                    const id = String.fromCharCode(...array.slice(offset + 4, offset + 10));
                    if (id === "Exif\x00\x00") {
                        parseExif(array, offset + 10, segLength - 8, info);
                    } else {
                        // XMP can also be in APP1 with "http://ns.adobe.com/xap/1.0/\x00"
                        const ns = "http://ns.adobe.com/xap/1.0/\x00";
                        const header = array.slice(offset + 4, offset + 4 + ns.length);
                        if (new TextDecoder().decode(header).startsWith("http://ns.adobe.com/xap/1.0/")) {
                            const xmpData = array.slice(offset + 4 + ns.length, offset + 2 + segLength);
                            const str = new TextDecoder().decode(xmpData);
                            if (str.includes("<x:xmpmeta")) {
                                info.xmp = str;
                                info.hasXmp = true;
                            }
                        }
                    }
                }
                offset += 2 + segLength;
            } else {
                offset += 2;
            }
        }
    }

    function readUint16(arr, off) {
        return (arr[off] << 8 | arr[off + 1]) >>> 0;
    }

    function parseExif(array, start, length, info) {
        if (length < 8) return;
        const tiffStart = start;
        const endian = String.fromCharCode(array[tiffStart], array[tiffStart + 1]);
        const isBigEndian = endian === "MM";
        const ifdOffset = readUint32Exif(array, tiffStart + 4, isBigEndian);
        if (ifdOffset >= length) return;
        const ifdStart = tiffStart + ifdOffset;
        const numEntries = readUint16Exif(array, ifdStart, isBigEndian);

        const exifTags = {
            0x010f: "Make",
            0x0110: "Model",
            0x0131: "Software",
            0x9003: "DateTimeOriginal",
            0x0100: "ImageWidth",
            0x0101: "ImageHeight",
        };

        for (let i = 0; i < numEntries; i++) {
            const entryOffset = ifdStart + 2 + i * 12;
            if (entryOffset + 12 > start + length) break;
            const tag = readUint16Exif(array, entryOffset, isBigEndian);
            const tagName = exifTags[tag];
            if (!tagName) continue;

            const value = readExifValue(array, entryOffset + 8, isBigEndian, tiffStart, length);
            if (value !== undefined) {
                info.exif.push({ tag: tagName, value });
                info.hasExif = true;
            }
        }
    }

    function readUint16Exif(arr, off, be) {
        return be ? (arr[off] << 8 | arr[off + 1]) : (arr[off + 1] << 8 | arr[off]);
    }

    function readUint32Exif(arr, off, be) {
        return be
            ? (arr[off] << 24 | arr[off + 1] << 16 | arr[off + 2] << 8 | arr[off + 3]) >>> 0
            : (arr[off + 3] << 24 | arr[off + 2] << 16 | arr[off + 1] << 8 | arr[off]) >>> 0;
    }

    function readExifValue(arr, entryOffset, be, tiffStart, maxLen) {
        const type = readUint16Exif(arr, entryOffset, be);
        const count = readUint32Exif(arr, entryOffset + 2, be);

        if (type === 2) { // ASCII string
            let strStart, strEnd;
            if (count <= 4) {
                strStart = entryOffset + 4;
                strEnd = strStart + count - 1;
            } else {
                const strOffset = readUint32Exif(arr, entryOffset + 4, be);
                strStart = tiffStart + strOffset;
                strEnd = strStart + count - 1;
            }
            if (strEnd > tiffStart + maxLen) strEnd = tiffStart + maxLen;
            let end = strStart;
            while (end < strEnd && arr[end] !== 0) end++;
            if (end === strStart) return undefined;
            return new TextDecoder().decode(arr.slice(strStart, end));
        }
        if (type === 3 && count === 1) { // SHORT
            return readUint16Exif(arr, entryOffset + 4, be);
        }
        return undefined;
    }

    // ── XMP → VRC Fields ──
    function extractVrcFields(xmpStr, vrc) {
        const targets = [
            "vrc:WorldID", "vrc:WorldDisplayName",
            "vrc:AuthorID", "vrc:AuthorDisplayName",
            "xmp:CreatorTool", "xmp:Author",
            "xmp:CreateDate", "xmp:ModifyDate", "xmp:MetadataDate"
        ];
        for (const key of targets) {
            const regex = new RegExp(`<${key}>([^<]*)</${key}>`, "i");
            const m = xmpStr.match(regex);
            if (m) vrc[key] = m[1];
        }
    }

    // ── Parse XMP to key/value ──
    function parseXmpToKv(xmpStr) {
        const kv = [];
        // Match opening and closing tags with content (non-greedy, handles attributes)
        const regex = /<([\w:]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
        let m;
        while ((m = regex.exec(xmpStr)) !== null) {
            const val = m[2].trim();
            if (val) kv.push({ key: m[1], value: val });
        }
        return kv;
    }

    // ── Stats ──
    function updateStats() {
        statLoaded.textContent = parsedData.length;
        statXmp.textContent = parsedData.filter(d => d.hasXmp).length;
        statVrc.textContent = parsedData.filter(d => d.hasVrc).length;
        statOther.textContent = parsedData.filter(d => d.hasExif || d.hasPngText).length;
    }

    function enableButtons() {
        downloadBtn.disabled = false;
        copyBtn.disabled = false;
    }

    // ── Render Card ──
    function renderCard(info, fileIndex) {
        const card = document.createElement("div");
        card.className = "card";

        const file = fileRefs[fileIndex];
        const blobUrl = file ? URL.createObjectURL(file) : "";

        card.innerHTML = `
            <div class="card-preview">
                ${blobUrl ? `<img src="${blobUrl}" alt="">` : "<span>No Preview</span>"}
            </div>
            <div class="card-body">
                <div class="card-title">${escHtml(info.fileName)}</div>
                <div class="card-meta">
                    <span>${formatSize(info.fileSize)}</span>
                    <span>${info.width} × ${info.height}</span>
                </div>
                <div class="badges">
                    <span class="badge ${info.hasXmp ? 'active' : ''}">XMP</span>
                    <span class="badge ${info.hasVrc ? 'vrc' : ''}">VRChat</span>
                    <span class="badge ${info.hasExif ? 'active' : ''}">EXIF</span>
                    <span class="badge ${info.hasPngText ? 'active' : ''}">PNG text</span>
                </div>
                ${info.hasVrc ? renderVrcSection(info.vrc) : ""}
                ${info.xmp ? renderXmpSection(info.xmp) : ""}
                ${info.hasExif ? renderExifSection(info.exif) : ""}
                ${info.hasPngText ? renderPngTextSection(info.pngText) : ""}
            </div>
        `;
        results.appendChild(card);

        // setup collapsible
        card.querySelectorAll(".section-title").forEach(title => {
            title.addEventListener("click", () => {
                title.classList.toggle("collapsed");
                const content = title.nextElementSibling;
                content.classList.toggle("hidden");
            });
        });
    }

    function formatSize(bytes) {
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
        return bytes + " B";
    }

    function renderVrcSection(vrc) {
        const items = Object.entries(vrc).map(([k, v]) =>
            `<div class="vrc-item"><span class="key">${escHtml(k)}:</span> ${escHtml(v)}</div>`
        ).join("");
        return `<div class="section"><div class="section-title">VRChat メタデータ</div><div class="section-content">${items}</div></div>`;
    }

    function renderXmpSection(xmpStr) {
        const kv = parseXmpToKv(xmpStr);
        const rows = kv.map(({ key, value }) =>
            `<tr><td>${escHtml(key)}</td><td>${escHtml(value)}</td></tr>`
        ).join("");
        const raw = escHtml(xmpStr);
        return `
            <div class="section">
                <div class="section-title">XMP 一覧</div>
                <div class="section-content">
                    <table>${rows}</table>
                </div>
            </div>
            <div class="section">
                <div class="section-title collapsed">XMP 生データ</div>
                <div class="section-content hidden">
                    <div class="raw-data">${raw}</div>
                </div>
            </div>
        `;
    }

    function renderExifSection(exif) {
        const rows = exif.map(({ tag, value }) =>
            `<tr><td>${escHtml(tag)}</td><td>${escHtml(String(value))}</td></tr>`
        ).join("");
        return `<div class="section"><div class="section-title">EXIF</div><div class="section-content"><table>${rows}</table></div></div>`;
    }

    function renderPngTextSection(pngText) {
        const rows = pngText.map(item =>
            `<tr><td>${escHtml(item.keyword || item.type)}</td><td>${escHtml(item.value || item.note || "")}</td></tr>`
        ).join("");
        return `<div class="section"><div class="section-title">PNG text</div><div class="section-content"><table>${rows}</table></div></div>`;
    }

    function escHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }
})();
