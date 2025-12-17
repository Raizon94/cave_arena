import * as THREE from 'three';
import { GAME_CONFIG } from '../config/constants.js';

// handles rendering and the scene
export class Renderer {
  constructor() {
    this.scene = new THREE.Scene();
    
    this.setupSkyGradient();
    
    this.camera = new THREE.PerspectiveCamera(
      GAME_CONFIG.FOV,
      window.innerWidth / window.innerHeight,
      GAME_CONFIG.NEAR_PLANE,
      GAME_CONFIG.FAR_PLANE
    );
    
    // layer 0 = world, layer 1 = weapon
    this.camera.layers.enable(0);
    this.camera.layers.enable(1);

    this.scene.add(this.camera);
    
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    
    // shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    
    // color stuff
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // disable auto clear for multi pass rendering
    this.renderer.autoClear = false;
    
    document.body.appendChild(this.renderer.domElement);
    
    this.setupEventListeners();
  }
  
  // makes sky gradient with big sphere
  setupSkyGradient() {
    const skyGeometry = new THREE.SphereGeometry(800, 32, 32);
    
    // shader for gradient
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(GAME_CONFIG.SKY_TOP_COLOR || 0x5599ff) },
        bottomColor: { value: new THREE.Color(GAME_CONFIG.SKY_BOTTOM_COLOR || 0xffcc88) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.renderOrder = 0;
    this.scene.add(sky);
    
    console.log('Sky gradient created');
  }
  
  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  render(weaponRoot = null) {
    this.renderer.clear();
    
    if (weaponRoot) {
      // first pass: world only
      this.camera.layers.set(0);
      this.renderer.render(this.scene, this.camera);
      
      // second pass: weapon on top
      this.camera.layers.set(1);
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);
      
      this.camera.layers.enableAll();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  getCanvas() {
    return this.renderer.domElement;
  }
  
  getScene() {
    return this.scene;
  }
  
  getCamera() {
    return this.camera;
  }
  
  getRenderer() {
    return this.renderer;
  }
}
