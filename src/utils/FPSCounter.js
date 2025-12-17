// FPS counter utility for displaying frame rate
export class FPSCounter {
  constructor() {
    this.fps = 0;
    this.frames = 0;
    this.lastTime = performance.now();
    this.fpsElement = null;
    this.createFPSDisplay();
  }
  
  // Creates the FPS display element
  createFPSDisplay() {
    this.fpsElement = document.createElement('div');
    this.fpsElement.style.position = 'fixed';
    this.fpsElement.style.top = '10px';
    this.fpsElement.style.right = '10px';
    this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.fpsElement.style.color = '#00ff00';
    this.fpsElement.style.padding = '10px 15px';
    this.fpsElement.style.fontFamily = 'monospace';
    this.fpsElement.style.fontSize = '16px';
    this.fpsElement.style.borderRadius = '5px';
    this.fpsElement.style.zIndex = '9999';
    this.fpsElement.style.userSelect = 'none';
    this.fpsElement.style.pointerEvents = 'none';
    this.fpsElement.textContent = 'FPS: 0';
    document.body.appendChild(this.fpsElement);
  }
  
  // Updates fps counter, call every frame
  update() {
    this.frames++;
    const currentTime = performance.now();
    
    // update display every second
    if (currentTime >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
      this.frames = 0;
      this.lastTime = currentTime;
      
      // update with color coding
      this.updateDisplay();
    }
  }
  
  // Updates display with color coding
  updateDisplay() {
    if (!this.fpsElement) return;
    
    // color based on fps value
    let color = '#00ff00'; // green for good fps
    let warning = '';
    
    if (this.fps < 30) {
      color = '#ff0000'; // red for low fps
      warning = ' (LOW!)';
    } else if (this.fps < 50) {
      color = '#ffaa00'; // orange for medium fps
      warning = ' (MEDIUM)';
    } else if (this.fps >= 58 && this.fps <= 62) {
      // likely vsync locked at 60
      warning = ' (VSync?)';
    } else if (this.fps >= 28 && this.fps <= 32) {
      // might be limited to 30 fps
      color = '#ff00ff'; // magenta for suspicious lock
      warning = ' (LOCKED?)';
    }
    
    this.fpsElement.style.color = color;
    this.fpsElement.textContent = `FPS: ${this.fps}${warning}`;
  }
  
  // Gets current fps value
  getFPS() {
    return this.fps;
  }
  
  // Shows fps counter
  show() {
    if (this.fpsElement) {
      this.fpsElement.style.display = 'block';
    }
  }
  
  // Hides fps counter
  hide() {
    if (this.fpsElement) {
      this.fpsElement.style.display = 'none';
    }
  }
  
  // Removes fps counter from DOM
  destroy() {
    if (this.fpsElement && this.fpsElement.parentNode) {
      this.fpsElement.parentNode.removeChild(this.fpsElement);
      this.fpsElement = null;
    }
  }
}
