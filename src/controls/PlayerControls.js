import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONTROLS } from '../config/constants.js';

// handles FPS style player controls
export class PlayerControls {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.controls = new PointerLockControls(camera, canvas);
    this.keys = {};
    this.isLocked = false;
    
    // mouse button tracking
    this.mouseButtons = {};
    this.onShootCallback = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // keyboard events
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    
    // mouse buttons
    document.addEventListener('mousedown', (e) => {
      if (!this.isLocked) return;
      
      this.mouseButtons[e.button] = true;
      
      // left click shoots
      if (e.button === 0 && this.onShootCallback) {
        this.onShootCallback();
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
    });
    
    // pointer lock stuff
    this.canvas.addEventListener('click', () => {
      this.controls.lock();
    });
    
    this.controls.addEventListener('lock', () => {
      this.isLocked = true;
    });
    
    this.controls.addEventListener('unlock', () => {
      this.isLocked = false;
    });
  }
  
  isKeyPressed(key) {
    return this.keys[key] || false;
  }
  
  isMouseButtonPressed(button) {
    return this.mouseButtons[button] || false;
  }

  // set shooting callback
  onShoot(callback) {
    this.onShootCallback = callback;
  }
  
  getControls() {
    return this.controls;
  }
  
  isControlsLocked() {
    return this.isLocked;
  }

  // change mouse sensitivty
  setSensitivity(sensitivity) {
    this.controls.pointerSpeed = sensitivity;
  }
}
