import { Zombie } from './Zombie.js';

// object pool for zombies
// recycles dead ones instead of making new
export class ZombiePool {
  constructor(scene, collisionSystem, player, opts = {}) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.player = player;
    this.bonfire = null;
    this.poolSize = opts.poolSize || 50;
    this.modelPath = opts.modelPath || 'src/models/zombie1.glb';

    this.pool = [];
    this.active = [];
    this.loadedCount = 0;
    this.isReady = false;
    
    this.onKillCallback = null;

    console.log('Creating zombie pool with ' + this.poolSize + ' zombies');
    this._initializePool();
  }
  
  // callback when zombie dies from being shot
  onKill(callback) {
    this.onKillCallback = callback;
    for (const zombie of this.pool) {
      zombie.onKillCallback = callback;
    }
  }

  _initializePool() {
    for (let i = 0; i < this.poolSize; i++) {
      const zombie = new Zombie(this.scene, {
        position: [0, -1000, 0], // spawn off map
        modelPath: this.modelPath,
        onLoad: () => {
          this.loadedCount++;
          if (this.loadedCount === this.poolSize) {
            this.isReady = true;
            console.log('Zombie pool ready: ' + this.poolSize + ' loaded');
          }
        }
      });

      zombie.setCollisionSystem(this.collisionSystem);
      zombie.setPlayer(this.player);
      if (this.wallData) zombie.setWall(this.wallData);
      zombie.despawn();

      this.pool.push(zombie);
    }
  }

  setPathfindingSystem(pathfindingSystem) {
    this.pathfindingSystem = pathfindingSystem;
    for (const zombie of this.pool) {
      zombie.setPathfindingSystem(pathfindingSystem);
    }
  }

  setWall(wallData) {
    this.wallData = wallData;
    for (const zombie of this.pool) {
      zombie.setWall(wallData);
    }
  }

  setAudioManager(audioManager) {
    this.audioManager = audioManager;
    for (const zombie of this.pool) {
      zombie.setAudioManager(audioManager);
    }
  }

  // spawn zombie at position
  spawn(position) {
    const zombie = this.pool.find(z => !z.active);

    if (!zombie) {
      console.warn('Pool full, cant spawn more');
      return null;
    }

    // reset zombie state
    zombie.health = zombie.maxHealth;
    zombie.dead = false;
    zombie.active = true;

    if (Array.isArray(position)) {
      zombie.targetPosition.set(position[0], position[1], position[2]);
      zombie.visualPosition.set(position[0], position[1], position[2]);
      zombie.position.set(position[0], position[1], position[2]);
    } else {
      zombie.targetPosition.copy(position);
      zombie.visualPosition.copy(position);
      zombie.position.copy(position);
    }

    zombie.spawn();

    if (!this.active.includes(zombie)) {
      this.active.push(zombie);
    }

    return zombie;
  }

  // recycle a zombie back to pool
  kill(zombie) {
    if (!zombie) return;

    zombie.die();

    const index = this.active.indexOf(zombie);
    if (index !== -1) {
      this.active.splice(index, 1);
    }
  }

  update(delta) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const zombie = this.active[i];

      if (zombie.dead) {
        this.active.splice(i, 1);
        continue;
      }

      zombie.update(delta);
    }
  }

  // smooth movement for all zombies
  interpolateAll(delta) {
    for (const zombie of this.active) {
      if (zombie.active) {
        zombie.interpolateVisualPosition(delta);
      }
    }
  }

  getActiveCount() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const zombie = this.active[i];
      if (!zombie.active || zombie.dead) {
        this.active.splice(i, 1);
      }
    }
    return this.active.length;
  }

  getAvailableCount() {
    return this.pool.filter(z => !z.active).length;
  }

  killAll() {
    for (const zombie of this.active) {
      zombie.die();
    }
    this.active.length = 0;
  }

  // spawn wave of zombies around a point
  spawnWave(center, count, radius = 10) {
    const spawned = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const x = center.x + Math.cos(angle) * distance;
      const z = center.z + Math.sin(angle) * distance;

      const zombie = this.spawn([x, center.y, z]);
      if (zombie) {
        spawned.push(zombie);
      } else {
        break;
      }
    }

    console.log('Spawned wave: ' + spawned.length + '/' + count);
    return spawned;
  }
}
