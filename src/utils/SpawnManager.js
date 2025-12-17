import * as THREE from 'three';
import { GAME_CONFIG } from '../config/constants.js';

// Handles player initial spawn position
export class SpawnManager {
  constructor(camera) {
    this.camera = camera;
  }
  
  // Positions player at initial spawn point
  spawnPlayer(world, worldBounds) {
    // custom spawn pos for debugging/testing
    const spawnPosition = new THREE.Vector3(-91, 4, -7);
    
    // set camera directly at spawn
    this.camera.position.set(
      spawnPosition.x,
      spawnPosition.y,
      spawnPosition.z
    );
    
    console.log('Player spawned at custom position:', this.camera.position);
  }
}
