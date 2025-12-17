// displays ammo balls visually in the HUD
export class AmmoDisplay {
  constructor() {
    this.container = null;
    this.ammoBalls = [];
    this.createUI();
  }
  
  // creates the ammo UI container and balls
  createUI() {
    // container for ammo display
    this.container = document.createElement('div');
    this.container.id = 'ammo-display';
    this.container.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    `;
    
    // create 3 ammo balls
    for (let i = 0; i < 3; i++) {
      const ball = document.createElement('div');
      ball.className = 'ammo-ball';
      ball.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffff00 0%, #ffaa00 100%);
        box-shadow: 0 2px 10px rgba(255, 255, 0, 0.5),
                    inset 0 -2px 5px rgba(0, 0, 0, 0.3);
        border: 2px solid #fff;
        transition: all 0.2s ease;
      `;
      this.ammoBalls.push(ball);
      this.container.appendChild(ball);
    }
    
    document.body.appendChild(this.container);
  }
  
  // updates visual state of ammo balls based on remaining count
  update(ammoRemaining) {
    this.ammoBalls.forEach((ball, index) => {
      if (index < ammoRemaining) {
        // available ammo - bright yellow
        ball.style.background = 'linear-gradient(135deg, #ffff00 0%, #ffaa00 100%)';
        ball.style.opacity = '1';
        ball.style.transform = 'scale(1)';
        ball.style.boxShadow = '0 2px 10px rgba(255, 255, 0, 0.5), inset 0 -2px 5px rgba(0, 0, 0, 0.3)';
      } else {
        // spent ammo - dark gray
        ball.style.background = 'linear-gradient(135deg, #333 0%, #111 100%)';
        ball.style.opacity = '0.4';
        ball.style.transform = 'scale(0.8)';
        ball.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.5), inset 0 -1px 3px rgba(0, 0, 0, 0.5)';
      }
    });
  }
  
  // shake animation when out of ammo
  showEmptyFeedback() {
    this.container.style.animation = 'shake 0.3s ease';
    
    // remove animation after its done
    setTimeout(() => {
      this.container.style.animation = '';
    }, 300);
  }
  
  // cleanup
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// add CSS for shake animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  #ammo-display {
    pointer-events: none;
  }
  
  .ammo-ball {
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0); }
    to { opacity: 1; transform: scale(1); }
  }
`;
document.head.appendChild(style);
