import * as THREE from 'three';

// 3D health bar sprite that follows a parent object
export class HealthBar3D {
  constructor(scene, parent, opts = {}) {
    this.scene = scene;
    this.parent = parent; // object to follow
    this.width = opts.width || 1.0;
    this.height = opts.height || 0.15;
    this.yOffset = opts.yOffset || 2.0;
    this.color = opts.color || '#00ff00';
    this.bgColor = opts.bgColor || '#330000';

    this.sprite = null;
    this.canvas = null;
    this.context = null;
    this.texture = null;

    this.createBar();
  }

  // setup canvas texture and sprite
  createBar() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 128;
    this.canvas.height = 16;
    this.context = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.sprite = new THREE.Sprite(material);
    this.sprite.scale.set(this.width, this.height, 1);
    this.sprite.visible = false; // hidden until first update

    this.scene.add(this.sprite);

    this.lastHealth = -1;
    this.update(1, 1); // initial draw
  }

  // update position and redraw if health changed
  update(current, max) {
    if (!this.sprite || !this.parent) return;

    // update position
    if (this.parent.visible) {
      this.sprite.visible = true;
      this.sprite.position.copy(this.parent.position);
      this.sprite.position.y += this.yOffset;
    } else {
      this.sprite.visible = false;
      return;
    }

    // only redraw if health value changed
    if (this.lastHealth !== current) {
      this.redraw(current, max);
      this.lastHealth = current;
    }
  }

  // redraw the bar texture
  redraw(current, max) {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pct = Math.max(0, Math.min(1, current / max));

    // clear canvas
    ctx.clearRect(0, 0, w, h);

    // background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, w, h);

    // foreground - color changes based on health percent
    ctx.fillStyle = pct > 0.5 ? '#00ff00' : (pct > 0.25 ? '#ffff00' : '#ff0000');
    ctx.fillRect(1, 1, (w - 2) * pct, h - 2);

    this.texture.needsUpdate = true;
  }

  // cleanup sprite and textures
  destroy() {
    if (this.sprite) {
      this.scene.remove(this.sprite);
      this.sprite.material.map.dispose();
      this.sprite.material.dispose();
    }
  }
}
