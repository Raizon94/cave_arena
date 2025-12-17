import * as THREE from 'three';
import { GAME_CONFIG } from '../config/constants.js';

// handles all the lighting in the scene
export class LightingManager {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.campfireLights = [];
    this.setupLights();
    this.setupCampfires();
  }
  
  setupLights() {
    // ambient light
    const hemisphereLight = new THREE.HemisphereLight(
      GAME_CONFIG.HEMISPHERE_LIGHT_COLOR,
      GAME_CONFIG.HEMISPHERE_LIGHT_GROUND_COLOR,
      GAME_CONFIG.HEMISPHERE_LIGHT_INTENSITY
    );
    hemisphereLight.position.set(0, 50, 0);
    hemisphereLight.layers.enableAll();
    this.scene.add(hemisphereLight);
    this.lights.push(hemisphereLight);
    
    // sun light for shadows
    this.sun = new THREE.DirectionalLight(
      GAME_CONFIG.DIRECTIONAL_LIGHT_COLOR,
      GAME_CONFIG.DIRECTIONAL_LIGHT_INTENSITY
    );
    this.sun.position.set(50, 100, 50);
    this.sun.castShadow = true;
    this.sun.layers.enableAll();

    // shadow settings
    const mapSize = GAME_CONFIG.SHADOW_MAP_SIZE || 1024;
    this.sun.shadow.mapSize.width = mapSize;
    this.sun.shadow.mapSize.height = mapSize;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 500;
    
    this.sun.shadow.camera.left = -80;
    this.sun.shadow.camera.right = 80;
    this.sun.shadow.camera.top = 80;
    this.sun.shadow.camera.bottom = -80;
    
    this.sun.shadow.bias = (typeof GAME_CONFIG.SHADOW_BIAS !== 'undefined') ? GAME_CONFIG.SHADOW_BIAS : -0.003;
    this.sun.shadow.normalBias = (typeof GAME_CONFIG.SHADOW_NORMAL_BIAS !== 'undefined') ? GAME_CONFIG.SHADOW_NORMAL_BIAS : 0.05;
    this.sun.shadow.radius = (typeof GAME_CONFIG.SHADOW_RADIUS !== 'undefined') ? GAME_CONFIG.SHADOW_RADIUS : 1;

    this.scene.add(this.sun);
    this.lights.push(this.sun);
    
    this.createVisualSun();

    // debug helpers
    if (GAME_CONFIG.SHOW_SUN_HELPER) {
      this.sunHelper = new THREE.DirectionalLightHelper(this.sun, GAME_CONFIG.SUN_HELPER_SIZE);
      this.scene.add(this.sunHelper);
    }
    if (GAME_CONFIG.SHOW_SHADOW_CAMERA_HELPER) {
      this.shadowCameraHelper = new THREE.CameraHelper(this.sun.shadow.camera);
      this.scene.add(this.shadowCameraHelper);
    }
  }
  
  // makes a sun ball in the sky
  createVisualSun() {
    const sunGeometry = new THREE.SphereGeometry(50, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      fog: false
    });
    
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sunMesh.position.copy(this.sun.position);
    this.scene.add(this.sunMesh);
    
    // glow effect
    const glowGeometry = new THREE.SphereGeometry(70, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.3,
      fog: false
    });
    
    this.sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.sunGlow.position.copy(this.sun.position);
    this.scene.add(this.sunGlow);
    
    console.log('Sun created at:', this.sunMesh.position);
  }
  
  // setup campfire lights
  setupCampfires() {
    this.createCampfire(new THREE.Vector3(-86.35, 3.05, -12.34));
    this.createCampfire(new THREE.Vector3(-86.24, 3.10, -13.87));
  }
  
  // creates fire light with multiple overlaping lights
  createCampfire(firePos) {
    // main fire light
    const campfire1 = new THREE.PointLight(0xff3300, 18.0, 50, 0.8);
    campfire1.position.copy(firePos);
    campfire1.castShadow = true;
    campfire1.layers.enableAll();
    
    campfire1.shadow.mapSize.width = 1024;
    campfire1.shadow.mapSize.height = 1024;
    campfire1.shadow.camera.near = 0.1;
    campfire1.shadow.camera.far = 50;
    campfire1.shadow.bias = -0.001;
    
    this.scene.add(campfire1);
    
    // warm fill light
    const warmGlow = new THREE.PointLight(0xff6600, 12.0, 40, 1.0);
    warmGlow.position.copy(firePos);
    warmGlow.castShadow = false;
    warmGlow.layers.enableAll();
    this.scene.add(warmGlow);
    
    // golden accent light
    const goldenGlow = new THREE.PointLight(0xdd4400, 10.0, 35, 1.0);
    goldenGlow.position.set(firePos.x, firePos.y + 0.3, firePos.z);
    goldenGlow.castShadow = false;
    goldenGlow.layers.enableAll();
    this.scene.add(goldenGlow);
    
    // debug sphere
    if (GAME_CONFIG.SHOW_CAMPFIRE_DEBUG) {
      const fireGlow = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({ 
          color: 0xff3300,
          transparent: true,
          opacity: 0.5
        })
      );
      fireGlow.position.copy(firePos);
      this.scene.add(fireGlow);
    }
    
    // store for flickering
    this.campfireLights.push({
      light: campfire1,
      baseIntensity: 18.0,
      flickerSpeed: 0.05,
      flickerAmount: 0.3,
      time: Math.random() * 100
    });
    
    this.campfireLights.push({
      light: warmGlow,
      baseIntensity: 12.0,
      flickerSpeed: 0.04,
      flickerAmount: 0.25,
      time: Math.random() * 100
    });
    
    this.campfireLights.push({
      light: goldenGlow,
      baseIntensity: 10.0,
      flickerSpeed: 0.06,
      flickerAmount: 0.35,
      time: Math.random() * 100
    });
    
    console.log('Campfire added at:', firePos);
  }
  
  getLights() {
    return this.lights;
  }

  update() {
    if (GAME_CONFIG.SHOW_SUN_HELPER && this.sunHelper) {
      this.sunHelper.update();
    }
    if (GAME_CONFIG.SHOW_SHADOW_CAMERA_HELPER && this.shadowCameraHelper) {
      this.shadowCameraHelper.update();
    }
    
    this.updateCampfires();
  }
  
  // makes fire lights flicker
  updateCampfires() {
    this.campfireLights.forEach(campfire => {
      campfire.time += campfire.flickerSpeed;
      
      // sine waves for flicker effect
      const flicker1 = Math.sin(campfire.time * 3.5) * 0.5 + 0.5;
      const flicker2 = Math.sin(campfire.time * 5.2) * 0.5 + 0.5;
      const flicker3 = Math.sin(campfire.time * 7.1) * 0.5 + 0.5;
      
      const combinedFlicker = (flicker1 + flicker2 + flicker3) / 3;
      const variation = (combinedFlicker - 0.5) * campfire.flickerAmount;
      campfire.light.intensity = campfire.baseIntensity + (campfire.baseIntensity * variation);
    });
  }

  // adjust shadow camera for world size
  adjustShadowCameraForWorld(worldBounds) {
    if (!this.sun) return;
    const size = worldBounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const frustumSize = maxDim * 2;
    
    this.sun.shadow.camera.left = -frustumSize;
    this.sun.shadow.camera.right = frustumSize;
    this.sun.shadow.camera.top = frustumSize;
    this.sun.shadow.camera.bottom = -frustumSize;
    this.sun.shadow.camera.far = maxDim * 10;
    this.sun.shadow.camera.updateProjectionMatrix();
    
    console.log('Shadow cam adjusted, frustum:', frustumSize);
    
    if (this.shadowCameraHelper) this.shadowCameraHelper.update();
  }

  setSunPosition(position) {
    if (!this.sun) return;
    this.sun.position.copy(position);
    
    if (this.sunMesh) {
      this.sunMesh.position.copy(position);
    }
    if (this.sunGlow) {
      this.sunGlow.position.copy(position);
    }
    
    if (this.sunHelper) this.sunHelper.update();
    if (this.shadowCameraHelper) {
      this.sun.shadow.camera.updateProjectionMatrix();
      this.shadowCameraHelper.update();
    }
  }

  setSunTarget(target) {
    if (!this.sun) return;
    if (!this.sun.target) {
      this.sun.target = new THREE.Object3D();
      this.scene.add(this.sun.target);
    }
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
    console.log('Sun target:', this.sun.target.position);
    if (this.sunHelper) this.sunHelper.update();
    if (this.shadowCameraHelper) {
      this.sun.shadow.camera.updateProjectionMatrix();
      this.shadowCameraHelper.update();
    }
  }
}
