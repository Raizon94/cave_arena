// displays current wave number and zombie count at top of screen
export class WaveDisplay {
    constructor() {
        this.container = null;
        this.waveText = null;
        this.countText = null;
        this.createUI();
    }

    // create the wave display UI elements
    createUI() {
        this.container = document.createElement('div');
        this.container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      color: white;
      font-family: 'Impact', sans-serif;
      text-shadow: 2px 2px 0 #000;
      pointer-events: none;
      user-select: none;
    `;

        this.waveText = document.createElement('div');
        this.waveText.style.cssText = `
      font-size: 48px;
      color: #ff3333;
      letter-spacing: 2px;
    `;
        this.waveText.textContent = 'WAVE 1';

        this.countText = document.createElement('div');
        this.countText.style.cssText = `
      font-size: 24px;
      color: #cccccc;
      margin-top: 5px;
    `;
        this.countText.textContent = 'Zombies: 0';

        this.container.appendChild(this.waveText);
        this.container.appendChild(this.countText);
        document.body.appendChild(this.container);
    }

    // update wave and zombie count text
    update(wave, count) {
        this.waveText.textContent = `WAVE ${wave}`;
        this.countText.textContent = `Zombies: ${count}`;
    }

    // show big wave announcement message
    showWaveMessage(wave) {
        const msg = document.createElement('div');
        msg.textContent = `WAVE ${wave} STARTED`;
        msg.style.cssText = `
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 80px;
      color: #ff0000;
      font-family: 'Impact', sans-serif;
      text-shadow: 4px 4px 0 #000;
      opacity: 0;
      transition: opacity 0.5s;
      pointer-events: none;
      z-index: 2000;
    `;
        document.body.appendChild(msg);

        // animate in and out
        requestAnimationFrame(() => {
            msg.style.opacity = '1';
            setTimeout(() => {
                msg.style.opacity = '0';
                setTimeout(() => document.body.removeChild(msg), 500);
            }, 2000);
        });
    }
}
