import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from '../config/constants.js';
import { ZombiePool } from '../entities/ZombiePool.js';
import { WaveManager } from './WaveManager.js';
import { PathfindingSystem } from '../ai/PathfindingSystem.js';
import { LoadingScreen } from '../ui/LoadingScreen.js';

/**
 * Class that handles loading and managing the game world
 */
export class WorldManager {
  constructor(scene, camera, collisionSystem) {
    this.scene = scene;
    this.camera = camera;
    this.loader = new GLTFLoader();
    this.world = null;
    this.worldBounds = null;
    this.collisionSystem = collisionSystem; // Recieved from Game.js

    // ZombiePool for recycling zombies
    this.zombiePool = null;

    // OPTIMIZATION: Distribute updates between frames (1 entity per frame at 60 FPS)
    this.currentEntityIndex = 0; // Index of next entity to update

    this.spawnTimer = 0;
    this.spawnInterval = 2.0; // Spawn every 2 seconds
    this.maxZombies = 20; // Max active zombies at once

    // Wall health system
    this.wallHealth = 100;
    this.wallMaxHealth = 100;
    this.wallIsDead = false;
    this.portalHealthBar = null;

    this.waveManager = null;
    this.pathfindingSystem = null;

    // Navigation meshes (only 'path' for pathfinding)
    this.navMeshes = [];
    // Spawn-only meshes (zombies appear here)
    this.spawnMeshes = [];
    this.wallMesh = null;

    // Audio Manager
    this.audioManager = null;
    
    // UI Manager for game over
    this.uiManager = null;
    
    // Stats for game over
    this.zombiesKilled = 0;

    this.loadingScreen = new LoadingScreen();
  }

  /**
   * Set the AudioManager for spatial sounds
   */
  setAudioManager(audioManager) {
    this.audioManager = audioManager;
    
    // Start portal sound if already loaded
    if (this.wallMesh && this.audioManager) {
      this.audioManager.startPortalSound(this.wallMesh);
    }
    
    // Pass to zombie pool
    if (this.zombiePool) {
      this.zombiePool.setAudioManager(audioManager);
    }
  }

  /**
   * Set the UIManager for game over screen
   */
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }
  
  /**
   * Increments killed zombies counter
   */
  addKill() {
    this.zombiesKilled++;
  }

  /**
   * Loads the world model
   * @param {Function} onComplete - Callback when loading is complete
   */
  async loadWorld(onComplete) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        GAME_CONFIG.MODEL_PATH,
        (gltf) => {
          this.loadingScreen.updateProgress(50, 'Processing World...');
          this.world = gltf.scene;
          this.setupWorld();

          if (onComplete) {
            onComplete(this.world, this.worldBounds);
          }

          resolve(this.world);
        },
        (xhr) => {
          if (xhr.total > 0) {
            const percent = (xhr.loaded / xhr.total) * 50;
            this.loadingScreen.updateProgress(percent, `Loading Model: ${Math.floor(percent)}%`);
          }
        },
        (error) => {
          console.error('Error loading world:', error);
          this.loadingScreen.updateProgress(0, 'Error Loading World');
          reject(error);
        }
      );
    });
  }

  /**
   * Sets up the world after loading
   */
  setupWorld() {
    // Calculate world bounds (model scaled to real-world proportions in Blender)
    this.worldBounds = new THREE.Box3().setFromObject(this.world);
    const size = this.worldBounds.getSize(new THREE.Vector3());
    const center = this.worldBounds.getCenter(new THREE.Vector3());

    // Enable shadows for all meshes in the world
    // Ensure meshes cast/recieve shadows and convert unlit/basic materials to MeshStandardMaterial
    let convertedCount = 0;
    let meshCount = 0;
    let collisionMeshCount = 0;
    this.world.traverse((child) => {
      if (child.isMesh) {
        meshCount++;
        const name = child.name.toLowerCase();

        // Check if this is a colision mesh (invisible walls)
        const isCollisionMesh = name.includes('collision');

        // Navigation meshes (spawn, path)
        if (name.includes('spawn') || name.includes('path')) {
          child.visible = false; // Invisible but present for raycasting
          
          // Path meshes - for pathfinding navigation
          if (name.includes('path')) {
            this.navMeshes.push(child);
          }
          // Spawn meshes - zombies can only appear on these
          if (name.includes('spawn')) {
            this.spawnMeshes.push(child);
          }
          // Ensure they are part of colision system for raycasting
          child.castShadow = false;
          child.receiveShadow = false;
          return;
        }

        // Wall target (Portal effect)
        if (name.includes('wall')) {
          this.wallMesh = child;
          child.visible = true; // Visible for effect
          child.castShadow = true;
          child.userData.noCollision = true; // Allow player to pass through
          // Apply Portal Shader/Effect
          this.applyPortalEffect(child);
          return;
        }

        if (isCollisionMesh) {
          // Meshes named 'collision' should NOT render, only collide
          // Keep them raycastable: visible must remain true
          child.visible = true;
          child.castShadow = false;
          child.receiveShadow = false;
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            if (!m) return;
            m.transparent = true;
            m.opacity = 0.0;
            m.depthWrite = false; // dont affect depth buffer
          });
          collisionMeshCount++;
          // Skip any material conversion for colision meshes
          return;
        }

        child.castShadow = true;
        child.receiveShadow = true;

        // Enable frustum culling for better performance
        child.frustumCulled = true;

        // If material is basic/unlit (MeshBasicMaterial) or not standard,
        // replace with MeshStandardMaterial to respond to lights.
        const mat = child.material;

      }
    });
    // Add the world to the scene (cave_scene.glb is the complete world)
    this.scene.add(this.world);

    // Initialize ZombiePool
    this.zombiePool = new ZombiePool(this.scene, this.collisionSystem, this.camera, {
      poolSize: 50,
      modelPath: 'src/models/zombie1.glb'
    });
    
    // Register callback to count kills
    this.zombiePool.onKill(() => {
      this.addKill();
    });

    // Wait for pool to be ready then do initial zombie spawn
    const checkPoolReady = setInterval(() => {
      if (this.zombiePool.isReady) {
        clearInterval(checkPoolReady);

        // Initialize Pathfinding with specific meshes
        this.loadingScreen.updateProgress(80, 'Generating Navigation Graph...');
        this.pathfindingSystem = new PathfindingSystem(this.collisionSystem);
        
        // Pass navMeshes to generate graph only on them
        console.log(`NavMeshes for pathfinding: ${this.navMeshes.length}`);
        if (this.navMeshes.length > 0) {
          this.pathfindingSystem.generateGraph(this.worldBounds, this.scene, this.navMeshes).then(() => {
            this.loadingScreen.updateProgress(100, 'Ready!');
            setTimeout(() => this.loadingScreen.hide(), 500);
          });
        } else {
          console.warn('No path meshes found! Skipping pathfinding generation.');
          this.loadingScreen.updateProgress(100, 'Ready!');
          setTimeout(() => this.loadingScreen.hide(), 500);
        }
        this.zombiePool.setPathfindingSystem(this.pathfindingSystem);

        // Set Wall as target - zombies attack the wall
        if (this.wallMesh) {
          console.log('Wall target found:', this.wallMesh.name);
          
          // Calculate bounding box of wall
          const wallBounds = new THREE.Box3().setFromObject(this.wallMesh);
          const wallPos = new THREE.Vector3();
          wallBounds.getCenter(wallPos);
          
          console.log('Wall bounds:', 
            `min(${wallBounds.min.x.toFixed(1)}, ${wallBounds.min.y.toFixed(1)}, ${wallBounds.min.z.toFixed(1)})`,
            `max(${wallBounds.max.x.toFixed(1)}, ${wallBounds.max.y.toFixed(1)}, ${wallBounds.max.z.toFixed(1)})`
          );
          
          // Configure wall health system
          this.wallHealth = 100;
          this.wallMaxHealth = 100;
          this.wallIsDead = false;
          
          // Damage function in mesh userData
          this.wallMesh.userData.takeDamage = (amount) => {
            if (this.wallIsDead) return;
            this.wallHealth -= amount;
            console.log(`Wall took ${amount}% damage! Health: ${this.wallHealth}%`);
            
            // Update HUD
            if (this.portalHealthBar) {
              this.portalHealthBar.update(this.wallHealth, this.wallMaxHealth);
              this.portalHealthBar.flash();
            }
            
            if (this.wallHealth <= 0) {
              this.wallIsDead = true;
              console.log('Wall destroyed! GAME OVER');
              
              // Trigger game over
              if (this.uiManager) {
                const currentWave = this.waveManager ? this.waveManager.currentWave : 0;
                this.uiManager.triggerGameOver(false, currentWave, this.zombiesKilled);
              }
            }
          };
          
          // Create wall health HUD
          import('../ui/PortalHealthBar.js').then(module => {
            this.portalHealthBar = new module.PortalHealthBar();
          });
          
          // Pass wall data to zombies
          const wallData = {
            mesh: this.wallMesh,
            bounds: wallBounds,
            position: wallPos
          };
          this.zombiePool.setWall(wallData);
        } else {
          console.warn('No Wall mesh found! Zombies will target player.');
        }

        // Initialize Wave Manager
        this.waveManager = new WaveManager(this, this.zombiePool);

        console.log(`Zombie pool ready. Spawning will start soon.`);
      }
    }, 100);

    // Add axes helper if enabled
    if (GAME_CONFIG.SHOW_AXES_HELPER) {
      const axesHelper = new THREE.AxesHelper(GAME_CONFIG.AXES_HELPER_SIZE);
      this.scene.add(axesHelper);
    }
  }

  /**
   * Call per-frame to update entities. World manager doesnt own the game loop,
   * but exposes this helper so Game.js or similar can call it.
   * OPTIMIZED: Only update AI of 1 zombie per frame, but interpolate ALL visually
   * @param {number} delta - seconds since last frame
   */
  applyPortalEffect(mesh) {
    // Simple portal effect using emissive pulse
    if (!mesh.material) return;

    // Clone material to avoid affecting others
    mesh.material = mesh.material.clone();
    mesh.material.transparent = true;
    mesh.material.opacity = 0.8;
    mesh.material.emissive = new THREE.Color(0x8800ff); // Purple
    mesh.material.emissiveIntensity = 2.0;

    // Get portal bounds for particles
    const portalBounds = new THREE.Box3().setFromObject(mesh);
    const portalSize = new THREE.Vector3();
    portalBounds.getSize(portalSize);
    const portalCenter = new THREE.Vector3();
    portalBounds.getCenter(portalCenter);

    // Nether-style particle system
    this.portalParticles = [];
    this.createPortalParticleSystem(mesh, portalBounds, portalCenter, portalSize);

    // Add update function to mesh userData to be called in update loop
    mesh.userData.update = (time) => {
      const pulse = (Math.sin(time * 0.005) + 1) * 0.5; // 0 to 1
      mesh.material.emissiveIntensity = 1.0 + pulse * 2.0;
      mesh.material.opacity = 0.6 + pulse * 0.4;
      
      // Update portal particles
      this.updatePortalParticles(time, portalBounds, portalCenter, portalSize);
    };

    // Register to update loop
    this.portalMesh = mesh;
  }

  createPortalParticleSystem(mesh, bounds, center, size) {
    // Create initial particles
    const particleCount = 30;
    const colors = [0x8800ff, 0xaa00ff, 0x6600cc, 0xff00ff, 0x4400aa];
    
    for (let i = 0; i < particleCount; i++) {
      this.spawnPortalParticle(bounds, center, size, colors);
    }
  }

  spawnPortalParticle(bounds, center, size, colors) {
    const geometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const particle = new THREE.Mesh(geometry, material);
    
    // Random position within portal area
    particle.position.set(
      center.x + (Math.random() - 0.5) * size.x,
      center.y + (Math.random() - 0.5) * size.y,
      center.z + (Math.random() - 0.5) * Math.max(0.5, size.z)
    );
    
    // Animation data
    particle.userData = {
      baseY: particle.position.y,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.0,
      amplitude: 0.3 + Math.random() * 0.5,
      lifetime: 2000 + Math.random() * 3000,
      birthTime: performance.now(),
      driftX: (Math.random() - 0.5) * 0.5,
      driftZ: (Math.random() - 0.5) * 0.5
    };
    
    this.scene.add(particle);
    this.portalParticles.push({ mesh: particle, geometry, material, bounds, center, size, colors });
  }

  updatePortalParticles(time, bounds, center, size) {
    const colors = [0x8800ff, 0xaa00ff, 0x6600cc, 0xff00ff, 0x4400aa];
    
    for (let i = this.portalParticles.length - 1; i >= 0; i--) {
      const p = this.portalParticles[i];
      const data = p.mesh.userData;
      const age = time - data.birthTime;
      const lifeProgress = age / data.lifetime;
      
      if (lifeProgress >= 1) {
        // Respawn particle
        this.scene.remove(p.mesh);
        p.geometry.dispose();
        p.material.dispose();
        this.portalParticles.splice(i, 1);
        this.spawnPortalParticle(bounds, center, size, colors);
        continue;
      }
      
      // Floating nether-style movement
      p.mesh.position.y = data.baseY + Math.sin(time * 0.001 * data.speed + data.phase) * data.amplitude;
      p.mesh.position.x += data.driftX * 0.01;
      p.mesh.position.z += data.driftZ * 0.01;
      
      // Fade in/out
      const fadeIn = Math.min(1, lifeProgress * 5);
      const fadeOut = Math.max(0, 1 - (lifeProgress - 0.7) / 0.3);
      p.material.opacity = 0.8 * fadeIn * fadeOut;
      
      // Pulsating scale
      const pulseScale = 1 + Math.sin(time * 0.003 + data.phase) * 0.3;
      p.mesh.scale.set(pulseScale, pulseScale, pulseScale);
    }
  }

  updateEntities(delta) {
    // Update portal effect
    if (this.portalMesh && this.portalMesh.userData.update) {
      this.portalMesh.userData.update(performance.now());
    }

    if (!this.zombiePool) return;

    // Update Wave Manager (handles spawning)
    if (this.waveManager) {
      this.waveManager.update(delta);
    }

    // STEP 1: Interpolate ALL zombies visually (smooth movement at 60fps)
    this.zombiePool.interpolateAll(delta);

    // STEP 2: Update AI of only ONE zombie per frame (distribution)
    const activeZombies = this.zombiePool.active;
    if (activeZombies.length > 0) {
      const zombie = activeZombies[this.currentEntityIndex % activeZombies.length];

      if (zombie && zombie.active) {
        zombie.update(delta);
      }

      // Move to next index (circular)
      this.currentEntityIndex = (this.currentEntityIndex + 1) % activeZombies.length;
    }
  }

  spawnRandomZombie() {
    if (!this.worldBounds) return;

    const size = new THREE.Vector3();
    this.worldBounds.getSize(size);
    const center = new THREE.Vector3();
    this.worldBounds.getCenter(center);

    // Try to find a valid spawn point
    let attempts = 0;
    const start = new THREE.Vector3();
    while (attempts < 10) {
      attempts++;
      const x = (Math.random() - 0.5) * size.x + center.x;
      const z = (Math.random() - 0.5) * size.z + center.z;

      // Raycast down to find ground
      // Zombies can ONLY spawn on 'spawn' meshes
      if (this.spawnMeshes.length > 0) {
        // Pick random spawn mesh
        const mesh = this.spawnMeshes[Math.floor(Math.random() * this.spawnMeshes.length)];
        if (mesh.geometry) {
          // Pick random vertex (simple approximation)
          // Better: Get bounding box of this specific mesh
          const box = new THREE.Box3().setFromObject(mesh);
          const sz = new THREE.Vector3();
          box.getSize(sz);
          const ctr = new THREE.Vector3();
          box.getCenter(ctr);

          const rx = (Math.random() - 0.5) * sz.x + ctr.x;
          const rz = (Math.random() - 0.5) * sz.z + ctr.z;

          start.set(rx, ctr.y + 5, rz);
        }
      } else {
        // No spawn meshes found - dont spawn randomly in world
        console.warn('No spawn meshes found, cannot spawn zombie');
        return null;
      }

      const ground = this.collisionSystem.findGround(start, size.y * 2);

      if (ground) {
        // Spawn slightly above ground - use start.x and start.z (from spawn mesh)
        const zombie = this.zombiePool.spawn([start.x, ground.point.y + 0.1, start.z]);
        return zombie;
      }
    }
    return null;
  }

  /**
   * Gets the world object
   * @returns {THREE.Object3D}
   */
  getWorld() {
    return this.world;
  }

  /**
   * Gets the world bounds
   * @returns {THREE.Box3}
   */
  getWorldBounds() {
    return this.worldBounds;
  }
}
