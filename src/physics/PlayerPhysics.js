import * as THREE from 'three';
import { GAME_CONFIG, CONTROLS } from '../config/constants.js';

// handles player movement with physics
export class PlayerPhysics {
  constructor(camera, playerControls, collisionSystem) {
    this.camera = camera;
    this.playerControls = playerControls;
    this.velocity = new THREE.Vector3();
    this.canJump = false;
    this.collisionSystem = collisionSystem; // recieved from Game.js
    this.sceneMesh = null;
    
    // player sphere collider
    this.playerSphere = new THREE.Sphere(
      camera.position.clone(),
      GAME_CONFIG.PLAYER_RADIUS
    );
  }
  
  setWorld(sceneMesh) {
    this.sceneMesh = sceneMesh;
  }
  
  // get colision system (for projectiles, etc)
  getCollisionSystem() {
    return this.collisionSystem;
  }
  
  // handles player jump
  jump() {
    if (this.canJump && this.playerControls.isKeyPressed(CONTROLS.JUMP)) {
      // simple check: is there something above us?
      const upwardCheck = this.collisionSystem.checkWorldCollision(
        this.camera.position,
        new THREE.Vector3(0, 1, 0),
        1.2 // check 1.2m above (head clearance)
      );
      
      // only jump if theres enough space above
      if (!upwardCheck || upwardCheck.distance > 0.8) {
        this.velocity.y = GAME_CONFIG.JUMP_FORCE;
        this.canJump = false;
      }
    }
  }
  
  // update player physics each frame
  update(delta) {
    if (!this.playerControls.isControlsLocked()) return;
    
    // debug fly mode
    if (GAME_CONFIG.DEBUG_FLY_MODE) {
      this.updateFlyMode(delta);
      return;
    }
    
    // normal mode (with physics)
    // check jump
    this.jump();
    
    // calculate horizontal movement
    const moveVector = this.calculateMovement(delta);
    
    // apply gravity
    this.velocity.y += GAME_CONFIG.GRAVITY * delta;
    
    // simple ceiling check: if moving up and theres something above, stop
    if (this.velocity.y > 0) {
      const ceilingCheck = this.collisionSystem.checkWorldCollision(
        this.camera.position,
        new THREE.Vector3(0, 1, 0),
        0.5 // check 50cm above head
      );
      
      if (ceilingCheck && ceilingCheck.distance < 0.3) {
        // hit ceiling, stop upward movement
        this.velocity.y = 0;
      }
    }
    
    // use slide movement for smooth wall sliding
    const slidedMovement = this.collisionSystem.slideMovement(
      this.camera.position,
      moveVector,
      GAME_CONFIG.PLAYER_RADIUS
    );
    
    // proposed new position with sliding
    const newPosition = this.camera.position.clone();
    newPosition.add(slidedMovement);
    newPosition.y += this.velocity.y * delta;
    
    // anti-stuck mechanism: check if were clipping into geometry
    this.pushOutOfWalls(newPosition, GAME_CONFIG.PLAYER_RADIUS);
    
    // update player sphere center
    this.playerSphere.center.copy(newPosition);
    
    // apply movement (sliding along walls automatically)
    this.camera.position.x = newPosition.x;
    this.camera.position.z = newPosition.z;
    this.camera.position.y = newPosition.y;
    
    // check floor colision
    const floorHeight = this.collisionSystem.checkFloorCollision(
      this.camera.position,
      GAME_CONFIG.PLAYER_RADIUS,
      GAME_CONFIG.PLAYER_HEIGHT
    );
    
    if (floorHeight !== null) {
      // check if were actually touching or below the floor
      const distanceToFloor = this.camera.position.y - floorHeight;
      const tolerance = 0.05; // small tolerance for floating point errors
      
      if (distanceToFloor <= tolerance && this.velocity.y <= 0) {
        // were on the ground and falling/stationary, snap to floor
        this.camera.position.y = floorHeight;
        this.velocity.y = 0;
        this.canJump = true;
      } else if (distanceToFloor < -tolerance) {
        // were below the floor (clipped through), push up
        this.camera.position.y = floorHeight;
        this.velocity.y = 0;
        this.canJump = true;
      } else {
        // were above the floor (jumping or falling from height)
        this.canJump = false;
      }
    } else {
      // no floor detected, were in the air
      this.canJump = false;
    }
    
    // update player sphere final position
    this.playerSphere.center.copy(this.camera.position);
  }
  
  // debug fly mode (no physics, no colisions)
  updateFlyMode(delta) {
    const moveVector = new THREE.Vector3();
    const speed = GAME_CONFIG.FLY_SPEED;
    
    // forward/backward (maintain camera direction including Y)
    if (this.playerControls.isKeyPressed(CONTROLS.MOVE_FORWARD)) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      moveVector.add(forward.multiplyScalar(speed * delta));
    }
    
    if (this.playerControls.isKeyPressed(CONTROLS.MOVE_BACKWARD)) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      moveVector.sub(forward.multiplyScalar(speed * delta));
    }
    
    // left/right strafe
    if (this.playerControls.isKeyPressed(CONTROLS.MOVE_LEFT)) {
      const right = new THREE.Vector3();
      this.camera.getWorldDirection(right);
      right.cross(this.camera.up);
      right.normalize();
      moveVector.sub(right.multiplyScalar(speed * delta));
    }
    
    if (this.playerControls.isKeyPressed(CONTROLS.MOVE_RIGHT)) {
      const right = new THREE.Vector3();
      this.camera.getWorldDirection(right);
      right.cross(this.camera.up);
      right.normalize();
      moveVector.add(right.multiplyScalar(speed * delta));
    }
    
    // fly up/down (absolute vertical movement)
    if (this.playerControls.isKeyPressed(CONTROLS.FLY_UP)) {
      moveVector.y += speed * delta;
    }
    
    if (this.playerControls.isKeyPressed(CONTROLS.FLY_DOWN)) {
      moveVector.y -= speed * delta;
    }
    
    // apply movement (no colisions in fly mode)
    this.camera.position.add(moveVector);
  }
  
  // calculate movement vector based on pressed keys
  calculateMovement(delta) {
    const moveVector = new THREE.Vector3();
    const speed = GAME_CONFIG.MOVE_SPEED;
    
    if (this.playerControls.isKeyPressed(CONTROLS.MOVE_FORWARD)) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      moveVector.add(forward.multiplyScalar(speed * delta));
    }
    
    if (this.playerControls.isKeyPressed(CONTROLS.MOVE_BACKWARD)) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      moveVector.sub(forward.multiplyScalar(speed * delta));
    }
    
    if (this.playerControls.isKeyPressed(CONTROLS.MOVE_LEFT)) {
      const right = new THREE.Vector3();
      this.camera.getWorldDirection(right);
      right.cross(this.camera.up);
      right.normalize();
      moveVector.sub(right.multiplyScalar(speed * delta));
    }
    
    if (this.playerControls.isKeyPressed(CONTROLS.MOVE_RIGHT)) {
      const right = new THREE.Vector3();
      this.camera.getWorldDirection(right);
      right.cross(this.camera.up);
      right.normalize();
      moveVector.add(right.multiplyScalar(speed * delta));
    }
    
    return moveVector;
  }
  
  // push player out of walls if stuck/clipping
  // only affects horizontal position (X, Z) to not mess with jumping
  pushOutOfWalls(position, radius) {
    // reduced from 8 directions to 4 cardinal directions
    const checkDirections = [
      new THREE.Vector3(1, 0, 0),   // right
      new THREE.Vector3(-1, 0, 0),  // left
      new THREE.Vector3(0, 0, 1),   // forward
      new THREE.Vector3(0, 0, -1),  // back
    ];
    
    const maxPushIterations = 2; // reduced from 3 to 2 iterations
    const safetyMargin = 0.02;
    
    for (let iter = 0; iter < maxPushIterations; iter++) {
      let pushedOut = false;
      
      for (const direction of checkDirections) {
        const collision = this.collisionSystem.checkWorldCollision(
          position,
          direction,
          radius + safetyMargin
        );
        
        if (collision && collision.distance < radius) {
          // were too close or inside geometry, push out
          const pushDistance = (radius + safetyMargin) - collision.distance;
          const pushVector = collision.normal.clone().multiplyScalar(pushDistance);
          
          // only apply horizontal push (dont affect Y for jumping)
          position.x += pushVector.x;
          position.z += pushVector.z;
          pushedOut = true;
        }
      }
      
      if (!pushedOut) {
        break; // no more corrections needed
      }
    }
  }
}
