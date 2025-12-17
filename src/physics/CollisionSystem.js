import * as THREE from 'three';
import { SpatialGrid } from './SpatialGrid.js';
import { DynamicGrid } from './DynamicGrid.js';

// simple colision system using spheres and raycasting
// optimized with spatial partitioning
export class CollisionSystem {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.worldMeshes = []; // all meshes from teh .glb world
    this.spatialGrid = null; // spatial partitioning for optimization
    this.sceneMesh = null;  // ref to main scene mesh
    this.entities = [];     // all collidable entities (player, enemies, etc)
    this.useOptimization = true; // enable spatial grid optimization
    this.dynamicGrid = new DynamicGrid(3);
    this.dynamicEntities = [];
    this.raycastCache = new Map(); // ray cache with TTL
    this.maxMeshesPerRay = 32; // limit meshes to check per raycast
    this.cacheTTL = 100; // cache time to live in ms
    this._lastEntityCount = 0; // to detect entity count changes
  }

  // clear expired raycast cache entries
  clearRaycastCache() {
    const now = performance.now();
    // only delete old entries (> 100ms)
    for (const [hash, data] of this.raycastCache.entries()) {
      if (now - data.timestamp > this.cacheTTL) {
        this.raycastCache.delete(hash);
      }
    }
  }

  // set scene mesh for colision detection
  setSceneMesh(sceneMesh) {
    this.sceneMesh = sceneMesh;
    this.addWorldGeometry(sceneMesh);
  }

  // add world geometry from loaded glb
  addWorldGeometry(worldModel) {

    const allMeshes = [];
    worldModel.traverse((child) => {
      if (child.isMesh) {
        // skip meshes marked as no-collision
        if (child.userData && child.userData.noCollision) return;

        allMeshes.push(child);
      }
    });

    // use all meshes as collision by default
    this.worldMeshes = allMeshes;
    if (!this.worldMeshes || this.worldMeshes.length === 0) {
      console.warn('CollisionSystem: no meshes available for collision! Raycasts will miss.');
    } else {
      console.log('Collision system: using ALL ' + this.worldMeshes.length + ' meshes for collision');
    }

    // create spatial grid to optimize searches
    if (this.useOptimization && this.worldMeshes.length > 0) {
      const worldBox = new THREE.Box3();
      this.worldMeshes.forEach(mesh => worldBox.expandByObject(mesh));

      // adaptive cell size based on world size
      const worldSize = worldBox.getSize(new THREE.Vector3());
      const avgSize = (worldSize.x + worldSize.y + worldSize.z) / 3;
      const cellSize = Math.max(10, avgSize / 20); // cells ~5% of world

      this.spatialGrid = new SpatialGrid(worldBox, cellSize);

      // add all meshes to grid
      this.worldMeshes.forEach(mesh => this.spatialGrid.addMesh(mesh));

      const stats = this.spatialGrid.getStats();
      console.log('Spatial Grid Stats:');
      console.log('  Total cells: ' + stats.totalCells);
      console.log('  Avg meshes/cell: ' + stats.avgMeshesPerCell);
      console.log('  Max meshes/cell: ' + stats.maxMeshesPerCell);
      console.log('  Optimization: ' + this.worldMeshes.length + ' -> ~' + stats.avgMeshesPerCell + ' meshes per query');
    }

    console.timeEnd('Collision mesh setup');
  }

  // add entity to colision detection
  addEntity(entity) {
    this.entities.push(entity);
    // track also as dynamic by default (most entities move)
    this.addDynamicEntity(entity, entity.layer || 'default');
  }

  // remove entity from colision detection
  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
    this.removeDynamicEntity(entity);
  }

  // check colision with world geometry in a direction
  // returns colision info or null
  checkWorldCollision(position, direction, distance = 1.0) {
    // cache rays with TTL for optimization
    const hash = `${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)}|${direction.x.toFixed(3)},${direction.y.toFixed(3)},${direction.z.toFixed(3)}|${distance.toFixed(2)}`;

    if (this.raycastCache.has(hash)) {
      const cached = this.raycastCache.get(hash);
      // reuse if not expired
      if (performance.now() - cached.timestamp < this.cacheTTL) {
        return cached.result;
      }
    }

    this.raycaster.set(position, direction);
    this.raycaster.far = distance;

    // use spatial grid if available
    let meshesToCheck = this.spatialGrid
      ? this.spatialGrid.getNearbyMeshes(position, distance)
      : this.worldMeshes;

    // limit number of meshes to check
    if (meshesToCheck.length > this.maxMeshesPerRay) {
      // sort by distance to ray origin and take closest
      meshesToCheck = meshesToCheck
        .map(mesh => ({ mesh, dist: mesh.position ? mesh.position.distanceTo(position) : 0 }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, this.maxMeshesPerRay)
        .map(obj => obj.mesh);
    }

    const intersects = this.raycaster.intersectObjects(meshesToCheck, false);

    let result = null;
    if (intersects.length > 0) {
      const hit = intersects[0];
      // get normal in world space
      const normal = hit.face.normal.clone();
      if (hit.object && hit.object.matrixWorld) {
        normal.transformDirection(hit.object.matrixWorld);
      }
      normal.normalize();
      result = {
        hit: true,
        point: hit.point.clone(),
        normal: normal,
        distance: hit.distance,
        object: hit.object
      };
    }

    // save in cache with timestamp
    this.raycastCache.set(hash, {
      result: result,
      timestamp: performance.now()
    });

    return result;
  }

  // check if player can move in direction (multi-ray colision)
  // uses capsule-like approach with rays at diferent heights and angles
  isMovementBlocked(position, direction, radius, distance = 0.5) {
    // normalize direction ONCE
    const dir = direction.clone().normalize();

    // reduced from 2 heights to 1 (camera only)
    const heights = [0]; // camera height only

    for (const heightOffset of heights) {
      const rayOrigin = position.clone();
      rayOrigin.y += heightOffset;

      // 3 rays (center, +/-30 degrees)
      const rays = [
        dir,                                                          // center (already normalized)
        dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6),  // 30 right
        dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6), // 30 left
      ];

      for (const ray of rays) {
        const collision = this.checkWorldCollision(rayOrigin, ray, radius + distance);
        if (collision && collision.distance < radius + distance) {
          return true; // blocked!
        }
      }
    }

    return false; // can move
  }

  // find ground below position
  findGround(position, maxDistance = 10) {
    const downward = new THREE.Vector3(0, -1, 0);
    return this.checkWorldCollision(position, downward, maxDistance);
  }


  // slide along wall when hitting it (smooth wall sliding)
  // handles corners and complex geometry better
  slideMovement(position, movement, radius) {
    const maxIterations = 2; // reduced from 4 to 2 iterations
    const minDistance = 0.001; // minimum movement threshold

    let remainingMovement = movement.clone();
    let finalPosition = position.clone();

    for (let i = 0; i < maxIterations; i++) {
      if (remainingMovement.length() < minDistance) {
        break; // movement too small, stop
      }

      const direction = remainingMovement.clone().normalize();
      const distance = remainingMovement.length();

      // check for colision
      const collision = this.checkWorldCollision(
        finalPosition,
        direction,
        radius + distance
      );

      if (!collision) {
        // no colision, apply remaining movement
        finalPosition.add(remainingMovement);
        break;
      }

      // calculate how far we can move before hitting
      const safeDistance = Math.max(0, collision.distance - radius - 0.01);

      if (safeDistance > minDistance) {
        // move to colision point
        finalPosition.add(direction.clone().multiplyScalar(safeDistance));
      }

      // project remaining movement onto colision surface
      const normal = collision.normal.clone();

      // transform normal to world space if needed
      if (collision.object && collision.object.matrixWorld) {
        normal.transformDirection(collision.object.matrixWorld);
      }
      normal.normalize();

      // calculate remaining movement after sliding
      const slidePlane = remainingMovement.clone().projectOnPlane(normal);

      // reduce remaining movement (we already moved safeDistance)
      const usedDistance = safeDistance;
      const remainingDistance = distance - usedDistance;

      if (remainingDistance > minDistance && slidePlane.length() > minDistance) {
        // continue sliding with projected movement
        remainingMovement = slidePlane.normalize().multiplyScalar(remainingDistance * 0.95);
      } else {
        // stop if movement too small
        break;
      }
    }

    // return actual movement that was applied
    return new THREE.Vector3().subVectors(finalPosition, position);
  }

  // check wall colision for player movement (used by PlayerPhysics)
  checkWallCollision(from, to, radius) {
    if (!this.worldMeshes || this.worldMeshes.length === 0) return false; // no colision if scene not loaded

    const direction = new THREE.Vector3().subVectors(to, from);
    const distance = direction.length();

    if (distance === 0) return false;

    direction.normalize();

    // check if movement is blocked
    return this.isMovementBlocked(from, direction, radius, distance);
  }

  // check floor colision for player (used by PlayerPhysics)
  checkFloorCollision(position, radius, playerHeight) {
    if (!this.worldMeshes || this.worldMeshes.length === 0) return null; // no colision if scene not loaded

    // raycast downward from player position
    const ground = this.findGround(position, playerHeight + 2);

    if (ground) {
      // return Y position where player should stand (floor + eye height)
      return ground.point.y + playerHeight;
    }

    return null; // no floor found (falling)
  }




  /** Dynamic colisions **/
  addDynamicEntity(entity, layer = 'enemy') {
    // maintain entity.layer for filters; store in flat list for grid rebuild
    if (layer) entity.layer = layer;
    this.dynamicEntities.push(entity);
  }
  removeDynamicEntity(entity) {
    this.dynamicEntities = this.dynamicEntities.filter(e => e !== entity);
  }

  // rebuild dynamic spatial grid for broad-phase queries (enemies, projectiles, etc)
  // call once per frame after dynamic entities updated
  // only rebuilds if theres significant changes
  updateDynamicGrid(entities = this.dynamicEntities) {
    // only process active and visible entities
    const activeEntities = entities.filter(e =>
      e && e.active !== false && e.position && e.root && e.root.visible
    );

    // check if we need to rebuild the whole grid
    const needsRebuild = activeEntities.length !== this._lastEntityCount;

    if (needsRebuild) {
      // full rebuild if entity count changed
      this.dynamicGrid.clear();
      for (const e of activeEntities) {
        this.dynamicGrid.insert(e);
      }
      this._lastEntityCount = activeEntities.length;
    } else {
      // incremental update (only entities that moved)
      this.dynamicGrid.clear(); // still clearing everything for now
      // TODO: implement incremental update with hasMoved flags
      for (const e of activeEntities) {
        this.dynamicGrid.insert(e);
      }
    }
  }

  // query nearby dynamic entities using the dynamic grid
  // position: center of query
  // radius: query radius in world units
  // layers: optional layer filter
  queryNearbyEntities(position, radius = 2, layers = null) {
    let candidates = this.dynamicGrid.queryNearby(position, radius);
    if (layers && layers.length) {
      const layerSet = new Set(layers);
      candidates = candidates.filter(e => layerSet.has(e.layer));
    }
    // filter out inactive or missing collider
    return candidates.filter(e => e && e.active !== false && e.colliderBox);
  }

}
