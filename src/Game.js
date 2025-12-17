import * as THREE from 'three';
import { Renderer } from './core/Renderer.js';
import { LightingManager } from './core/LightingManager.js';
import { PlayerControls } from './controls/PlayerControls.js';
import { PlayerPhysics } from './physics/PlayerPhysics.js';
import { CollisionSystem } from './physics/CollisionSystem.js';
import { WorldManager } from './world/WorldManager.js';
import { SpawnManager } from './utils/SpawnManager.js';
import { FPSCounter } from './utils/FPSCounter.js';
import { Weapon } from './utils/Weapon.js';
import { ProjectilePool } from './weapons/ProjectilePool.js';
import { AmmoDisplay } from './ui/AmmoDisplay.js';
import { AudioManager } from './audio/AudioManager.js';
import { UIManager } from './ui/UIManager.js';

// main game class coordiantes everything
export class Game {
  constructor() {
    this.clock = null;
    this.renderer = null;
    this.lightingManager = null;
    this.playerControls = null;
    this.playerPhysics = null;
    this.collisionSystem = null;
    this.worldManager = null;
    this.spawnManager = null;
    this.fpsCounter = null;
    this.isRunning = false;
    this.weapon = null;
    this.projectilePool = null;
    this.ammoDisplay = null;
    this.audioManager = null;
    this.uiManager = null;
  }
  
  async init() {
    console.log('Initializing game...');
    
    this.renderer = new Renderer();
    const scene = this.renderer.getScene();
    const camera = this.renderer.getCamera();
    const canvas = this.renderer.getCanvas();
    
    this.lightingManager = new LightingManager(scene);
    this.playerControls = new PlayerControls(camera, canvas);
    this.collisionSystem = new CollisionSystem();
    console.log('Collision system created');
    
    this.playerPhysics = new PlayerPhysics(camera, this.playerControls, this.collisionSystem);
    this.spawnManager = new SpawnManager(camera);
    this.worldManager = new WorldManager(scene, camera, this.collisionSystem);
    this.weapon = new Weapon(scene, camera);
    this.projectilePool = new ProjectilePool(scene, 3);
    this.ammoDisplay = new AmmoDisplay();
    this.audioManager = new AudioManager(camera);
    
    // shoot callback conection
    this.playerControls.onShoot(() => {
      if (this.weapon && this.projectilePool.canShoot() && this.weapon.shoot()) {
        const muzzlePos = this.weapon.getMuzzlePosition();
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        
        const projectile = this.projectilePool.getProjectile(muzzlePos, direction, 25);
        if (projectile) {
          this.ammoDisplay.update(this.projectilePool.getAvailableCount());
          this.audioManager.playShot();
        }
      } else if (!this.projectilePool.canShoot()) {
        this.ammoDisplay.showEmptyFeedback();
      }
    });
    
    await this.worldManager.loadWorld((sceneMesh, worldBounds) => {
      this.collisionSystem.setSceneMesh(sceneMesh);
      this.playerPhysics.setWorld(sceneMesh);
      console.log('World loaded');
      
      this.spawnManager.spawnPlayer(sceneMesh, worldBounds);
      this.lightingManager.adjustShadowCameraForWorld(worldBounds);
      
      const center = worldBounds.getCenter(new THREE.Vector3());
      const sunPos = new THREE.Vector3(-410, 217, -29);
      this.lightingManager.setSunPosition(sunPos);
      this.lightingManager.setSunTarget(center);
      
      this.worldManager.setAudioManager(this.audioManager);
    });
    
    this.clock = new THREE.Clock();
    this.fpsCounter = new FPSCounter();
    this.uiManager = new UIManager(this);
    this.worldManager.setUIManager(this.uiManager);
    
    console.log('Game initialized');
  }
  
  start() {
    this.isRunning = true;
    this.animate();
  }
  
  stop() { this.isRunning = false; }
  
  update(delta) {
    if (this.collisionSystem && typeof this.collisionSystem.clearRaycastCache === 'function') {
      this.collisionSystem.clearRaycastCache();
    }
    this.playerPhysics.update(delta);
    if (this.worldManager && typeof this.worldManager.updateEntities === 'function') {
      this.worldManager.updateEntities(delta);
    }
    if (this.collisionSystem && typeof this.collisionSystem.updateDynamicGrid === 'function') {
      this.collisionSystem.updateDynamicGrid();
    }
    if (this.projectilePool) {
      this.projectilePool.update(delta, this.collisionSystem);
      if (this.ammoDisplay) this.ammoDisplay.update(this.projectilePool.getAvailableCount());
    }
  }
  
  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta();
    this.update(delta);
    
    const weaponRoot = this.weapon ? this.weapon.getRoot() : null;
    this.renderer.render(weaponRoot);
    
    if (this.lightingManager && typeof this.lightingManager.update === 'function') this.lightingManager.update();
    if (this.fpsCounter) this.fpsCounter.update();
    if (this.weapon) this.weapon.update(delta);
  }
}
