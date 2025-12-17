import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export class Weapon {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.model = null;

    // weapon pivot attached to camera
    this.root = new THREE.Group();
    this.root.name = 'WeaponRoot';
    this.root.position.set(1, -0.8, -2);
    
    // original pos for recoil
    this.originalPosition = new THREE.Vector3(1, -0.8, -2);
    this.recoilAmount = 0; // 0 = no recoil, increases when firing
    this.recoilRecoverySpeed = 5; // recovery speed
    
    // fire rate settings
    this.fireRate = 0.15; // seconds between shots (6.67 shots/sec)
    this.timeSinceLastShot = this.fireRate; // starts ready to fire
    this.canShoot = true;
    
    // no muzzle flash light - using visual effect instead
    // lights affect all layers and cant be easily restricted
    this.muzzleFlash = null;
    this.muzzleFlashIntensity = 0;
    this.muzzleFlashDecay = 20;
    
    // visual flash effect (sprite or simple mesh)
    this.createMuzzleFlashEffect();
    
    // put weapon on layer 1 (seperate from world on layer 0)
    this.root.layers.set(1);

    if (!this.camera.parent) this.scene.add(this.camera);
    this.camera.add(this.root);

    this.loadWeaponModel();
  }
  
  // Creates visual flash effect (no light)
  createMuzzleFlashEffect() {
    // plane with bright texture for muzzle flash
    const flashGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.muzzleFlashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
    this.muzzleFlashMesh.position.set(0, 0.05, -2.5);
    this.muzzleFlashMesh.layers.set(1); // only visible on layer 1
    this.root.add(this.muzzleFlashMesh);
  }

  loadWeaponModel() {
    const loader = new GLTFLoader();
    loader.load(
      'fps.glb',
      (gltf) => {
        let model = gltf.scene;
        this.model = model;

        // freeze hierarchy and original matrices before adding
        model.traverse((o) => {
          o.updateWorldMatrix(true, true);
          o.matrixAutoUpdate = false;
        });

        // optional debug output
        console.log('Model hierarchy:');
        model.traverse((o) => {
          console.log(`${o.type}: "${o.name}" pos:`, o.position, 'rot:', o.rotation);
        });

        // fix model root if wrapped in empty node
        const children = model.children.filter(c => c.type !== 'Camera' && c.type !== 'Light');
        const weaponRoot = (children.length === 1) ? children[0] : model;

        // avoid duplicate transforms (reset local)
        weaponRoot.position.set(0, 0, 0);
        weaponRoot.rotation.set(0, 0, 0);
        weaponRoot.scale.set(1, 1, 1);

        // adjust materials for first person view
        weaponRoot.traverse((o) => {
          // make sure all children are on layer 1
          o.layers.set(1);
        });

        // add fixed model to weapon pivot
        this.root.add(weaponRoot);

        console.log('Weapon model loaded (no animations)');
      },
      (xhr) => {
        const percent = xhr.total ? (xhr.loaded / xhr.total * 100).toFixed(0) : '...';
        console.log(`Loading weapon: ${percent}%`);
      },
      (error) => {
        console.error('Error loading weapon model:', error);
        console.error('Make sure fps.glb is accessible at: /fps.glb');
      }
    );
  }

  update(delta) {
    // update shot timer
    this.timeSinceLastShot += delta;
    this.canShoot = this.timeSinceLastShot >= this.fireRate;
    
    // smooth recoil recovery
    if (this.recoilAmount > 0) {
      this.recoilAmount -= this.recoilRecoverySpeed * delta;
      if (this.recoilAmount < 0) this.recoilAmount = 0;
    }

    // apply recoil to position (push back on Z)
    this.root.position.copy(this.originalPosition);
    this.root.position.z += this.recoilAmount; // pushes back
    this.root.position.y -= this.recoilAmount * 0.3; // also lowers a bit
    
    // update muzzle flash (visual effect, not light)
    if (this.muzzleFlashIntensity > 0) {
      this.muzzleFlashIntensity -= this.muzzleFlashDecay * delta;
      if (this.muzzleFlashIntensity < 0) this.muzzleFlashIntensity = 0;
      
      if (this.muzzleFlashMesh) {
        this.muzzleFlashMesh.material.opacity = Math.min(1, this.muzzleFlashIntensity / 5);
        // rotate randomly for dynamic effect
        this.muzzleFlashMesh.rotation.z += delta * 50;
      }
    }
  }

  // Activates weapon recoil when firing
  // Returns true if fired, false if on cooldown
  shoot() {
    if (!this.canShoot) {
      return false; // cant fire yet
    }
    
    this.recoilAmount = 0.15; // recoil amount (adjustable)
    this.muzzleFlashIntensity = 10; // flash intensity
    this.timeSinceLastShot = 0; // reset timer
    this.canShoot = false;
    
    return true; // shot successful
  }
  
  // Gets world position of barrel for firing projectiles
  getMuzzlePosition() {
    const muzzleWorldPos = new THREE.Vector3();
    if (this.muzzleFlashMesh) {
      this.muzzleFlashMesh.getWorldPosition(muzzleWorldPos);
    } else {
      // fallback if no mesh
      muzzleWorldPos.copy(this.camera.position);
      const forward = new THREE.Vector3(0, 0.5, -2.5);
      forward.applyQuaternion(this.camera.quaternion);
      muzzleWorldPos.add(forward);
    }
    return muzzleWorldPos;
  }

  // Reload simulation (can add position animation later)
  reload() {
    console.log('Reloading weapon...');
    // could add position animation here if needed
  }

  getRoot() {
    return this.root;
  }
}
