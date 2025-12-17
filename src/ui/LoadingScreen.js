// loading screen overlay with progress bar
export class LoadingScreen {
    constructor() {
        this.overlay = null;
        this.progressBar = null;
        this.progressText = null;
        this.createUI();
    }

    // builds teh loading UI elements
    createUI() {
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      transition: opacity 0.5s;
    `;

        const title = document.createElement('h1');
        title.textContent = 'LOADING...';
        title.style.cssText = `
      color: #fff;
      font-family: 'Impact', sans-serif;
      font-size: 48px;
      margin-bottom: 20px;
      letter-spacing: 5px;
    `;

        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
      width: 300px;
      height: 20px;
      background: #333;
      border: 2px solid #555;
      border-radius: 10px;
      overflow: hidden;
    `;

        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #ff0000, #ff5500);
      transition: width 0.2s;
    `;

        this.progressText = document.createElement('div');
        this.progressText.textContent = 'Initializing...';
        this.progressText.style.cssText = `
      color: #888;
      font-family: monospace;
      margin-top: 10px;
      font-size: 14px;
    `;

        progressContainer.appendChild(this.progressBar);
        this.overlay.appendChild(title);
        this.overlay.appendChild(progressContainer);
        this.overlay.appendChild(this.progressText);
        document.body.appendChild(this.overlay);
    }

    // update progress bar and text
    updateProgress(percent, text) {
        if (this.progressBar) {
            this.progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
        if (this.progressText && text) {
            this.progressText.textContent = text;
        }
    }

    // fade out and remove the loading screen
    hide() {
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
            }, 500);
        }
    }
}
