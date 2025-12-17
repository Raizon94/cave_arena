import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HealthBar3D } from '../ui/HealthBar3D.js';

// zombie enemy entity
// loads model, does pathfinding, attacks wall
export class Zombie {
  constructor(scene, opts = {}) {
    const { position = [0, 0, 0], onLoad = null, layer = 'enemy', modelPath = 'zombie1.glb' } = opts;
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.model = null;
    this.root = new THREE.Group();
    this.root.name = 'ZombieRoot';
    this.scene.add(this.root);

    // position and movement
    this.position = this.root.position;
    this.position.set(position[0], position[1], position[2]);
    this.velocity = new THREE.Vector3();
    this.speed = 3.5;
    this.radius = 0.35;
    this.height = 1.7;
    this.active = true;
    this.layer = layer;

    // health stuff
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.dead = false;
    this.isBig = false;

    // collision
    this.collisionSystem = null;
    this.collider = null;
    this.colliderBox = new THREE.Box3();
    this._tempVec = new THREE.Vector3();
    this._slided = new THREE.Vector3();
    this._groundCheck = new THREE.Vector3();
    
    // targets
    this.player = opts.player || null;
    this.wall = opts.wall || null;
    this.wallBounds = null;
    this.pathfindingSystem = null;
    this.currentPath = null;
    this.pathIndex = 0;
    this.pathUpdateTimer = 0;
    this.pathRecalcInterval = 3.0;
    this._lastPathStartPos = new THREE.Vector3();

    // audio
    this.audioManager = null;
    this.nextSoundTime = 0;

    // health bar above head
    this.healthBar = new HealthBar3D(this.scene, this.root, {
      yOffset: 2.0,
      width: 1.0,
      height: 0.15,
      color: '#00ff00',
      bgColor: '#550000'
    });

    this.hitboxHelper = null;

    // animation
    this.mixer = null;
    this.walkAction = null;

    // smooth movement interpolation
    this.targetPosition = new THREE.Vector3(position[0], position[1], position[2]);
    this.visualPosition = new THREE.Vector3(position[0], position[1], position[2]);
    this.interpolationSpeed = 5.0;
    this._lastGroundY = position[1];
    this._lastGroundCheckTime = 0;

    this._loadGLB(onLoad, modelPath);
  }

  _loadGLB(onLoad, modelPath) {
    this.loader.load(
      modelPath,
      (gltf) => {
        this.model = gltf.scene;
        this.model.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
          if (o.isMesh && !o.isSkinnedMesh) {
            o.matrixAutoUpdate = false;
          }
        });
        this.root.add(this.model);

        // setup animations
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          const walkClip = THREE.AnimationClip.findByName(gltf.animations, 'Zombie|ZombieWalk');
          if (walkClip) {
            this.walkAction = this.mixer.clipAction(walkClip);
            this.walkAction.play();
            console.log('Zombie walk anim loaded');
          } else {
            console.warn('Walk animation not found');
          }
        }

        // find colision mesh
        this.collider = this.model.getObjectByName('colision') || this.model;
        if (this.collider && this.collider.isMesh) this.collider.visible = false;

        this.updateCollider(true);
        const size = this.colliderBox.getSize(new THREE.Vector3());
        this.radius = Math.max(size.x, size.z) * 0.5;
        this.height = size.y;

        if (typeof onLoad === 'function') onLoad(this);
      },
      undefined,
      (err) => {
        console.error('Failed loading zombie model', err);
      }
    );
  }

  setCollisionSystem(collisionSystem) {
    this.collisionSystem = collisionSystem;
    if (this.collisionSystem) this.collisionSystem.addEntity(this);
  }

  setPlayer(playerObject3D) {
    this.player = playerObject3D;
  }

  setWall(wallData) {
    this.wall = wallData.mesh;
    this.wallBounds = wallData.bounds;
    this.wallPosition = wallData.position;
  }

  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }

  setPathfindingSystem(pathfindingSystem) {
    this.pathfindingSystem = pathfindingSystem;
  }

  spawn() {
    this.active = true;
    this.root.visible = true;
    this._lastGroundCheckTime = 0;
    this._initialSpawn = true;
    this.nextSoundTime = performance.now() + 2000 + Math.random() * 4000;

    this.isBig = Math.random() < 0.1;
    if (this.isBig) {
      this.maxHealth = 200;
      this.health = 200;
      this.root.scale.set(2, 2, 2);
      if (this.healthBar) this.healthBar.yOffset = 4.0;
    } else {
      this.maxHealth = 100;
      this.health = 100;
      this.root.scale.set(1, 1, 1);
      if (this.healthBar) this.healthBar.yOffset = 2.0;
    }

    console.log('Zombie spawned at ' + this.position.x.toFixed(1) + ', ' + this.position.z.toFixed(1) + (this.isBig ? ' (BIG)' : ''));
  }

  despawn() {
    this.active = false;
    this.root.visible = false;
    if (this.healthBar) this.healthBar.sprite.visible = false;
  }

  addHitboxHelper(color = 0xff0000) {
    if (!this.colliderBox) return;
    const helper = new THREE.Box3Helper(this.colliderBox, color);
    this.scene.add(helper);
    this.hitboxHelper = helper;
  }

  removeHitboxHelper() {
    if (this.hitboxHelper) {
      this.scene.remove(this.hitboxHelper);
      this.hitboxHelper.geometry?.dispose?.();
      this.hitboxHelper.material?.dispose?.();
      this.hitboxHelper = null;
    }
  }

  updateCollider(init = false) {
    if (!this.collider) return;
    if (init || !this._localColliderBox) {
      this._localColliderBox = new THREE.Box3().setFromObject(this.collider);
      this._colliderOffset = new THREE.Vector3();
      this._localColliderBox.getCenter(this._colliderOffset);
      this._localColliderHalfSize = this._localColliderBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    }
    this.root.updateWorldMatrix(true, true);
    const worldCenter = this._colliderOffset.clone().applyMatrix4(this.root.matrixWorld);
    const hs = this._localColliderHalfSize;
    this.colliderBox.min.set(worldCenter.x - hs.x, worldCenter.y - hs.y, worldCenter.z - hs.z);
    this.colliderBox.max.set(worldCenter.x + hs.x, worldCenter.y + hs.y, worldCenter.z + hs.z);
    if (this.hitboxHelper) this.hitboxHelper.box.copy(this.colliderBox);
  }

  onHit({ damage = 10, position = null } = {}) {
    if (!this.active || this.dead) return;
    this.health -= damage;

    if (this.healthBar) this.healthBar.update(this.health, this.maxHealth);

    if (this.health <= 0) {
      this.die();
    } else {
      // flash red when hit
      if (this.model) {
        this.model.traverse(o => {
          if (o.isMesh && o.material && 'emissive' in o.material) {
            const old = o.material.emissive.getHex();
            o.material.emissive.setHex(0x442222);
            setTimeout(() => o.material.emissive.setHex(old), 80);
          }
        });
      }
    }
  }

  die() {
    this.dead = true;
    this.active = false;
    this.root.visible = false;
    if (this.healthBar && this.healthBar.sprite) {
      this.healthBar.sprite.visible = false;
    }
    if (this.onKillCallback) {
      this.onKillCallback();
    }
  }

  _horizontalDirToTarget(out) {
    out.set(0, 0, 0);
    const target = this.wallPosition ? this.wallPosition : (this.player ? this.player.position : null);

    if (!target) return out;

    // if close go direct
    const distToTargetSq = this.position.distanceToSquared(target);
    if (distToTargetSq < 6.0 * 6.0) {
      out.subVectors(target, this.position);
      out.y = 0;
      const len = out.length();
      if (len > 0.0001) out.multiplyScalar(1 / len);
      return out;
    }

    // pathfinding
    if (this.pathfindingSystem && this.currentPath && this.pathIndex < this.currentPath.length) {
      const nextNode = this.currentPath[this.pathIndex];
      const distSq = this.position.distanceToSquared(nextNode);

      if (distSq < 2.0 * 2.0) {
        this.pathIndex++;
        if (this.pathIndex >= this.currentPath.length) {
          out.subVectors(target, this.position);
        } else {
          out.subVectors(this.currentPath[this.pathIndex], this.position);
        }
      } else {
        out.subVectors(nextNode, this.position);
      }
    } else {
      out.subVectors(target, this.position);
    }

    out.y = 0;
    const len = out.length();
    if (len > 0.0001) out.multiplyScalar(1 / len);
    return out;
  }

  update(delta) {
    if (!this.active || this.dead) return;

    // random zombie sounds
    const now = performance.now();
    if (this.audioManager && now >= this.nextSoundTime) {
      this.audioManager.playZombieSound(this.position, this.root);
      this.nextSoundTime = now + 2000 + Math.random() * 4000;
    }

    const cs = this.collisionSystem;
    if (!cs) {
      const dir = this._tempVec;
      this._horizontalDirToTarget(dir);
      this.targetPosition.addScaledVector(dir, this.speed * delta);
      this.updateCollider();
      return;
    }

    // update pathfinding
    this.pathUpdateTimer += delta;
    const needsNewPath = !this.currentPath || this.pathIndex >= this.currentPath.length;
    const isStuck = this._lastPathStartPos.distanceToSquared(this.position) < 1.0;
    const timeToRecalc = this.pathUpdateTimer > this.pathRecalcInterval;
    
    if (needsNewPath || (timeToRecalc && isStuck)) {
      this.pathUpdateTimer = 0;
      this._lastPathStartPos.copy(this.position);
      
      const target = this.bonfire ? this.bonfire.position : (this.player ? this.player.position : null);
      if (target && this.pathfindingSystem) {
        const distToTarget = this.position.distanceToSquared(target);
        if (distToTarget > 5 * 5) {
          const path = this.pathfindingSystem.findPath(this.position, target);
          if (path && path.length > 0) {
            this.currentPath = path;
            let bestIndex = 0;
            let bestDist = Infinity;
            for (let i = 0; i < Math.min(path.length, 3); i++) {
              const d = this.position.distanceToSquared(path[i]);
              if (d < bestDist) {
                bestDist = d;
                bestIndex = i;
              }
            }
            this.pathIndex = bestIndex;
          }
        } else {
          this.currentPath = null;
        }
      }
    } else if (timeToRecalc) {
      this.pathUpdateTimer = 0;
      this._lastPathStartPos.copy(this.position);
    }

    const dir = this._tempVec;
    this._horizontalDirToTarget(dir);

    // check if reached wall
    if (this.wall && this.wallBounds) {
      const dist = this.wallBounds.distanceToPoint(this.position);
      
      if (dist < 0.5) {
        console.log('Zombie reached wall!');
        if (this.wall.userData.takeDamage) {
          this.wall.userData.takeDamage(10);
        }
        this.explodeAndDie();
        return;
      }
    }

    // move towards target
    const movement = dir.multiplyScalar(this.speed * delta);
    this.targetPosition.add(movement);

    // check ground every 300ms
    const shouldCheckGround = this._initialSpawn || !this._lastGroundCheckTime || performance.now() - this._lastGroundCheckTime > 300;

    if (shouldCheckGround) {
      const ground = cs.findGround(this._groundCheck.copy(this.targetPosition).add(new THREE.Vector3(0, 2.0, 0)), 20);

      if (ground) {
        this._lastGroundY = ground.point.y;
        this._lastGroundCheckTime = performance.now();
        this._initialSpawn = false;
      }
    }

    this.targetPosition.y = this._lastGroundY;

    // rotate to face movement dir
    if (dir.lengthSq() > 1e-5) {
      const yaw = Math.atan2(dir.x, dir.z);
      this.root.rotation.set(0, yaw, 0);
    }

    this.updateCollider();
  }

  // smooth visual movement called every frame
  interpolateVisualPosition(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }

    this.visualPosition.lerp(this.targetPosition, this.interpolationSpeed * delta);
    this.root.position.copy(this.visualPosition);
    this.position.copy(this.visualPosition);
    if (this.healthBar) {
      this.healthBar.update(this.health, this.maxHealth);
    }
  }

  explodeAndDie() {
    if (this.audioManager) {
      this.audioManager.playExplosion(this.position);
    }
    
    this.createExplosionParticles();
    
    // main explosion sphere
    const geometry = new THREE.SphereGeometry(0.8, 24, 24);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff44, 
      transparent: true, 
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const explosion = new THREE.Mesh(geometry, material);
    explosion.position.copy(this.position);
    this.scene.add(explosion);

    // bright core
    const coreGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.copy(this.position);
    this.scene.add(core);

    // shockwave ring
    const ringGeometry = new THREE.RingGeometry(0.2, 0.6, 48);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x88ff88, 
      transparent: true, 
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(this.position);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    const ring2 = new THREE.Mesh(ringGeometry.clone(), ringMaterial.clone());
    ring2.position.copy(this.position);
    this.scene.add(ring2);

    // animate
    const startTime = performance.now();
    const duration = 800;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;
      if (progress < 1) {
        const scale = 1 + progress * 8;
        explosion.scale.set(scale, scale, scale);
        explosion.material.opacity = 0.95 * (1 - progress);
        
        const coreScale = 1 + progress * 4;
        core.scale.set(coreScale, coreScale, coreScale);
        core.material.opacity = 1.0 * Math.max(0, 1 - progress * 2);
        
        const ringScale = 1 + progress * 15;
        ring.scale.set(ringScale, ringScale, 1);
        ring.material.opacity = 0.9 * (1 - progress);
        
        ring2.scale.set(ringScale, ringScale, 1);
        ring2.material.opacity = 0.9 * (1 - progress);
        
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(explosion);
        this.scene.remove(core);
        this.scene.remove(ring);
        this.scene.remove(ring2);
        geometry.dispose();
        material.dispose();
        coreGeometry.dispose();
        coreMaterial.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
      }
    };
    animate();

    this.die();
  }

  createExplosionParticles() {
    const particleCount = 40;
    const particles = [];
    
    const colors = [0x00ff00, 0x88ff88, 0xaaff00, 0x00ff88, 0xffff00, 0x44ff44];
    
    for (let i = 0; i < particleCount; i++) {
      const size = 0.08 + Math.random() * 0.25;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const material = new THREE.MeshBasicMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)], 
        transparent: true, 
        opacity: 1,
        blending: THREE.AdditiveBlending
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(this.position);
      
      const speed = 8 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 3,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      particle.userData.gravity = -12;
      particle.userData.rotSpeed = (Math.random() - 0.5) * 10;
      
      this.scene.add(particle);
      particles.push({ mesh: particle, geometry, material });
    }

    const startTime = performance.now();
    const duration = 1200;

    const animateParticles = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;
      const delta = 0.016;

      if (progress < 1) {
        for (const p of particles) {
          p.mesh.position.add(p.mesh.userData.velocity.clone().multiplyScalar(delta));
          p.mesh.userData.velocity.y += p.mesh.userData.gravity * delta;
          p.material.opacity = 1 - progress;
          const scale = 1 - progress * 0.5;
          p.mesh.scale.set(scale, scale, scale);
        }
        requestAnimationFrame(animateParticles);
      } else {
        for (const p of particles) {
          this.scene.remove(p.mesh);
          p.geometry.dispose();
          p.material.dispose();
        }
      }
    };
    animateParticles();
  }
}
