// カラーパレットジェネレーター
class ColorPaletteGenerator {
    constructor() {
        this.paletteSize = 5;
        this.currentPalette = [];
        this.lockedColors = new Set();
        this.savedPalettes = this.loadSavedPalettes();
        
        this.init();
    }
    
    init() {
        this.generatePalette();
        this.renderPalette();
        this.renderSavedPalettes();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 生成ボタン
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generatePalette();
            this.renderPalette();
        });
        
        // 保存ボタン
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.savePalette();
        });
        
        // スペースキーで生成
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
                e.preventDefault();
                this.generatePalette();
                this.renderPalette();
            }
        });
    }
    
    // ランダムな色を生成
    generateRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return { r, g, b };
    }
    
    // RGBをHEXに変換
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }
    
    // 色の明度を計算
    calculateLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    
    // パレットを生成
    generatePalette() {
        const newPalette = [];
        
        for (let i = 0; i < this.paletteSize; i++) {
            if (this.lockedColors.has(i) && this.currentPalette[i]) {
                newPalette.push(this.currentPalette[i]);
            } else {
                const color = this.generateRandomColor();
                newPalette.push({
                    ...color,
                    hex: this.rgbToHex(color.r, color.g, color.b)
                });
            }
        }
        
        this.currentPalette = newPalette;
    }
    
    // パレットを描画
    renderPalette() {
        const paletteElement = document.getElementById('palette');
        paletteElement.innerHTML = '';
        
        this.currentPalette.forEach((color, index) => {
            const colorBox = document.createElement('div');
            colorBox.className = 'color-box';
            
            const isLocked = this.lockedColors.has(index);
            const lockIcon = isLocked ? '🔒' : '🔓';
            
            colorBox.innerHTML = `
                <div class="color-display" style="background-color: ${color.hex}">
                    <button class="lock-btn ${isLocked ? 'locked' : ''}" data-index="${index}">
                        ${lockIcon}
                    </button>
                </div>
                <div class="color-info">
                    <div class="color-code">${color.hex}</div>
                    <div class="color-rgb">RGB(${color.r}, ${color.g}, ${color.b})</div>
                </div>
            `;
            
            // カラーコードをクリックでコピー
            colorBox.addEventListener('click', (e) => {
                if (!e.target.classList.contains('lock-btn')) {
                    this.copyToClipboard(color.hex);
                }
            });
            
            // ロックボタン
            const lockBtn = colorBox.querySelector('.lock-btn');
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLock(index);
            });
            
            paletteElement.appendChild(colorBox);
        });
    }
    
    // ロックを切り替え
    toggleLock(index) {
        if (this.lockedColors.has(index)) {
            this.lockedColors.delete(index);
        } else {
            this.lockedColors.add(index);
        }
        this.renderPalette();
    }
    
    // クリップボードにコピー
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification(`${text} をコピーしました！`);
        }).catch(err => {
            console.error('コピーに失敗しました:', err);
        });
    }
    
    // 通知を表示
    showNotification(message) {
        let notification = document.querySelector('.copy-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'copy-notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }
    
    // パレットを保存
    savePalette() {
        const palette = {
            id: Date.now(),
            colors: this.currentPalette,
            date: new Date().toLocaleString('ja-JP')
        };
        
        this.savedPalettes.unshift(palette);
        
        // 最大20個まで保存
        if (this.savedPalettes.length > 20) {
            this.savedPalettes = this.savedPalettes.slice(0, 20);
        }
        
        this.savePalettesToStorage();
        this.renderSavedPalettes();
        this.showNotification('パレットを保存しました！');
    }
    
    // ローカルストレージに保存
    savePalettesToStorage() {
        localStorage.setItem('colorPalettes', JSON.stringify(this.savedPalettes));
    }
    
    // ローカルストレージから読み込み
    loadSavedPalettes() {
        const saved = localStorage.getItem('colorPalettes');
        return saved ? JSON.parse(saved) : [];
    }
    
    // 保存されたパレットを描画
    renderSavedPalettes() {
        const savedList = document.getElementById('savedList');
        
        if (this.savedPalettes.length === 0) {
            savedList.innerHTML = '<p style="text-align: center; color: #999;">まだ保存されたパレットはありません</p>';
            return;
        }
        
        savedList.innerHTML = '';
        
        this.savedPalettes.forEach(palette => {
            const paletteDiv = document.createElement('div');
            paletteDiv.className = 'saved-palette';
            
            const colorsHtml = palette.colors.map(color => 
                `<div class="saved-color" style="background-color: ${color.hex}" title="${color.hex}"></div>`
            ).join('');
            
            paletteDiv.innerHTML = `
                <div class="saved-colors">${colorsHtml}</div>
                <div class="saved-info">${palette.date}</div>
            `;
            
            paletteDiv.addEventListener('click', () => {
                this.loadPalette(palette);
            });
            
            savedList.appendChild(paletteDiv);
        });
    }
    
    // 保存されたパレットを読み込み
    loadPalette(palette) {
        this.currentPalette = palette.colors;
        this.lockedColors.clear();
        this.renderPalette();
        this.showNotification('パレットを読み込みました！');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// アプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    new ColorPaletteGenerator();
});
