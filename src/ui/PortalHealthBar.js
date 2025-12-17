// HUD health bar for the portal - always visible on screen
export class PortalHealthBar {
    constructor() {
        this.container = null;
        this.barFill = null;
        this.healthText = null;
        this.createUI();
    }

    // creates the portal health bar UI
    createUI() {
        // main container
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: none;
            user-select: none;
            z-index: 100;
        `;

        // label text
        const label = document.createElement('div');
        label.style.cssText = `
            font-family: 'Impact', sans-serif;
            font-size: 24px;
            color: #aa66ff;
            text-shadow: 2px 2px 0 #000, 0 0 10px #8800ff;
            margin-bottom: 8px;
            letter-spacing: 3px;
        `;
        label.textContent = 'PORTAL';

        // bar background
        const barBg = document.createElement('div');
        barBg.style.cssText = `
            width: 400px;
            height: 30px;
            background: linear-gradient(180deg, #1a0033 0%, #330066 100%);
            border: 3px solid #8800ff;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(136, 0, 255, 0.5), inset 0 2px 10px rgba(0,0,0,0.5);
        `;

        // bar fill
        this.barFill = document.createElement('div');
        this.barFill.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, #cc88ff 0%, #8800ff 50%, #6600cc 100%);
            border-radius: 12px;
            transition: width 0.3s ease-out;
            box-shadow: 0 0 15px rgba(136, 0, 255, 0.8);
        `;

        // health text percentage
        this.healthText = document.createElement('div');
        this.healthText.style.cssText = `
            font-family: 'Impact', sans-serif;
            font-size: 18px;
            color: #ffffff;
            text-shadow: 1px 1px 0 #000;
            margin-top: 5px;
        `;
        this.healthText.textContent = '100%';

        barBg.appendChild(this.barFill);
        this.container.appendChild(label);
        this.container.appendChild(barBg);
        this.container.appendChild(this.healthText);
        document.body.appendChild(this.container);
    }

    // update bar width and color based on health
    update(current, max) {
        const pct = Math.max(0, Math.min(1, current / max));
        this.barFill.style.width = `${pct * 100}%`;
        this.healthText.textContent = `${Math.ceil(pct * 100)}%`;

        // change color based on health level
        if (pct > 0.5) {
            this.barFill.style.background = 'linear-gradient(180deg, #cc88ff 0%, #8800ff 50%, #6600cc 100%)';
        } else if (pct > 0.25) {
            this.barFill.style.background = 'linear-gradient(180deg, #ffcc00 0%, #ff8800 50%, #cc6600 100%)';
        } else {
            this.barFill.style.background = 'linear-gradient(180deg, #ff6666 0%, #ff0000 50%, #cc0000 100%)';
        }
    }

    // flash effect when taking damage
    flash() {
        this.container.style.animation = 'none';
        this.container.offsetHeight; // trigger reflow
        this.container.style.animation = 'portalDamageFlash 0.3s ease-out';
    }

    // cleanup
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// add CSS animation for damage flash
const style = document.createElement('style');
style.textContent = `
    @keyframes portalDamageFlash {
        0% { filter: brightness(2) saturate(0); }
        100% { filter: brightness(1) saturate(1); }
    }
`;
document.head.appendChild(style);
