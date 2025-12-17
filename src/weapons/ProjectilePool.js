import * as THREE from 'three';

/**
 * Reusable projectile pool (Object Pooling)
 * Instead of creating/destroying, we reuse objects
 */
export class ProjectilePool {
  constructor(scene, poolSize = 3) {
    this.scene = scene;
    this.poolSize = poolSize;
    this.pool = [];
    this.activeProjectiles = [];
    
    // Shared material for all projectiles (very efficent)
    this.sharedMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    });
    
    // Shared geometry for all projectiles (very efficent)
    this.sharedGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    
    // Pre-create all projectiles
    this.initializePool();
  }
  
  /**
   * Creates teh reusable projectile pool
   */
  initializePool() {
    for (let i = 0; i < this.poolSize; i++) {
      const mesh = new THREE.Mesh(this.sharedGeometry, this.sharedMaterial);
      mesh.visible = false; // Hidden by default
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
      
      this.scene.add(mesh);
      
      const projectile = {
        mesh: mesh,
        active: false,
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 2
      };
      
      this.pool.push(projectile);
    }
    
    console.log(`Projectile pool created: ${this.poolSize} projectiles pre-allocated`);
  }
  
  /**
   * Gets a projectile from pool (or null if all in use)
   */
  getProjectile(position, direction, speed = 20) {
    // Find an inactive projectile
    const projectile = this.pool.find(p => !p.active);
    
    if (!projectile) {
      return null; // Pool exhausted
    }
    
    // Activate and configure projectile
    projectile.active = true;
    projectile.mesh.visible = true;
    projectile.mesh.position.copy(position);
    projectile.velocity.copy(direction).normalize().multiplyScalar(speed);
    projectile.lifetime = 0;
    
    this.activeProjectiles.push(projectile);
    
    return projectile;
  }
  
  /**
   * Returns projectile to pool
   */
  releaseProjectile(projectile, createImpact = false) {
    // Create impact effect if needed
    if (createImpact) {
      this.createImpactEffect(projectile.mesh.position);
    }
    
    projectile.active = false;
    projectile.mesh.visible = false;
    projectile.velocity.set(0, 0, 0);
    
    // Remove from active list
    const index = this.activeProjectiles.indexOf(projectile);
    if (index !== -1) {
      this.activeProjectiles.splice(index, 1);
    }
  }
  
  /**
   * Creates simple visual impact effect
   */
  createImpactEffect(position) {
    // Create small sphere that expands and fades
    const impactGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const impactMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8
    });
    const impactMesh = new THREE.Mesh(impactGeo, impactMat);
    impactMesh.position.copy(position);
    this.scene.add(impactMesh);
    
    // Animate and destroy after a moment
    let life = 0;
    const maxLife = 0.2; // 0.2 seconds
    const animate = () => {
      life += 0.016; // ~60fps
      if (life >= maxLife) {
        this.scene.remove(impactMesh);
        impactGeo.dispose();
        impactMat.dispose();
        return;
      }
      
      const progress = life / maxLife;
      impactMesh.scale.setScalar(1 + progress * 2);
      impactMat.opacity = 0.8 * (1 - progress);
      
      requestAnimationFrame(animate);
    };
    animate();
  }
  
  /**
   * Updates all active projectiles
   * OPTIMIZED: Only check colision every X frames
   */
  update(delta, collisionSystem) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      
      // Update lifetime
      projectile.lifetime += delta;
      if (projectile.lifetime >= projectile.maxLifetime) {
        this.releaseProjectile(projectile, false); // No effect on expire
        continue;
      }
      
      // Calculate new movement
      const movement = projectile.velocity.clone().multiplyScalar(delta);
      const distance = movement.length();
      
      // OPTIMIZATION: Only check colision if movement is significant
      if (distance > 0.01 && collisionSystem) {
        const direction = movement.clone().normalize();
        
        // Check colision against world
        const collision = collisionSystem.checkWorldCollision(
          projectile.mesh.position,
          direction,
          distance + 0.1
        );
        
        if (collision && collision.distance <= distance + 0.02) {
          // Colision detected - return to pool WITH impact effect
          this.releaseProjectile(projectile, true);
          continue;
        }
        
        // Check colision against entities (zombies, etc) using broad-phase
        if (collisionSystem && typeof collisionSystem.queryNearbyEntities === 'function') {
          const queryRadius = 1.5; // small radius around projectile path
          const nearEntities = collisionSystem.queryNearbyEntities(projectile.mesh.position, queryRadius, ['enemy']);

          let hitEntity = false;
          if (nearEntities && nearEntities.length) {
            // Narrow-phase: test Box3 contains current or next position
            const nextPos = projectile.mesh.position.clone().add(movement);
            for (const entity of nearEntities) {
              if (!entity || !entity.colliderBox) continue;
              if (entity.colliderBox.containsPoint(nextPos) || entity.colliderBox.containsPoint(projectile.mesh.position)) {
                this.releaseProjectile(projectile, true);
                hitEntity = true;
                if (typeof entity.onHit === 'function') {
                  entity.onHit({ damage: 20, position: projectile.mesh.position.clone() });
                }
                break;
              }
            }
          }
          if (hitEntity) continue;
        }
      }
      
      // Move projectile
      projectile.mesh.position.add(movement);
    }
  }
  
  /**
   * Gets how many projectiles are available
   */
  getAvailableCount() {
    return this.poolSize - this.activeProjectiles.length;
  }
  
  /**
   * Checks if can shoot
   */
  canShoot() {
    return this.activeProjectiles.length < this.poolSize;
  }
  
  /**
   * Cleans up all resources
   */
  cleanup() {
    this.pool.forEach(projectile => {
      this.scene.remove(projectile.mesh);
    });
    
    this.sharedGeometry.dispose();
    this.sharedMaterial.dispose();
    
    this.pool = [];
    this.activeProjectiles = [];
  }
}
