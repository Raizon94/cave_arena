import * as THREE from 'three';

// audio manger class for the game
// handles spacial audio and music stuff
export class AudioManager {
  constructor(camera) {
    this.camera = camera;
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);
    
    this.audioLoader = new THREE.AudioLoader();
    
    // loaded bufers
    this.buffers = {};
    
    // active audio refs
    this.music = null;
    this.portalAudio = null;
    
    // state vars
    this.isLoaded = false;
    this.isMuted = false;
    
    // defualt volumes for each type
    this.volumes = {
      music: 0.08,
      zombie: 1.0,
      explosion: 1.0,
      portal: 0.8,
      shot: 0.5
    };
    
    this.loadAllSounds();
  }

  async loadAllSounds() {
    // list of all sounds we need to laod
    const sounds = [
      { name: 'zombie1', path: 'src/audio/zombie1.mp3' },
      { name: 'zombie2', path: 'src/audio/zombie2.mp3' },
      { name: 'explosion', path: 'src/audio/explosion.mp3' },
      { name: 'portal', path: 'src/audio/portal.mp3' },
      { name: 'shot', path: 'src/audio/shot.mp3' },
      { name: 'music', path: 'src/audio/loop.mp3' }
    ];

    const loadPromises = sounds.map(sound => {
      return new Promise((resolve, reject) => {
        this.audioLoader.load(
          sound.path,
          (buffer) => {
            this.buffers[sound.name] = buffer;
            console.log('Loaded sound: ' + sound.name);
            resolve();
          },
          undefined,
          (error) => {
            console.warn('Failed loading ' + sound.name, error);
            resolve(); // dont reject so it doesnt break evrything
          }
        );
      });
    });

    await Promise.all(loadPromises);
    this.isLoaded = true;
    console.log('AudioManager: all sounds ready');
  }

  // starts backgroudn music loop
  startMusic() {
    if (!this.buffers.music || this.music) return;
    
    this.music = new THREE.Audio(this.listener);
    this.music.setBuffer(this.buffers.music);
    this.music.setLoop(true);
    this.music.setVolume(this.volumes.music);
    this.music.play();
    console.log('Music playing');
  }

  stopMusic() {
    if (this.music && this.music.isPlaying) {
      this.music.stop();
    }
  }

  // plays a positional 3d sound at a locaiton
  playPositionalSound(soundName, position, parent = null) {
    if (!this.buffers[soundName] || this.isMuted) return null;

    const sound = new THREE.PositionalAudio(this.listener);
    sound.setBuffer(this.buffers[soundName]);
    sound.setRefDistance(20); // full volume distance
    sound.setMaxDistance(150); // max hearing dist
    sound.setRolloffFactor(1.0); // how fast sound fades
    sound.setVolume(this.volumes[soundName] || 1.0);
    
    if (parent) {
      parent.add(sound);
    } else {
      // temp object for position
      const soundObj = new THREE.Object3D();
      soundObj.position.copy(position);
      this.camera.parent.add(soundObj);
      soundObj.add(sound);
      
      // cleanup after its done playin
      sound.onEnded = () => {
        soundObj.remove(sound);
        if (soundObj.parent) soundObj.parent.remove(soundObj);
      };
    }
    
    sound.play();
    return sound;
  }

  // play random zombie groan sound
  playZombieSound(position, parent = null) {
    const soundName = Math.random() > 0.5 ? 'zombie1' : 'zombie2';
    return this.playPositionalSound(soundName, position, parent);
  }

  // boom sound for explosions
  playExplosion(position) {
    return this.playPositionalSound('explosion', position);
  }

  // start the portal ambiant sound
  startPortalSound(portalMesh) {
    if (!this.buffers.portal || this.portalAudio) return;

    this.portalAudio = new THREE.PositionalAudio(this.listener);
    this.portalAudio.setBuffer(this.buffers.portal);
    this.portalAudio.setLoop(true);
    this.portalAudio.setRefDistance(25);
    this.portalAudio.setMaxDistance(200);
    this.portalAudio.setRolloffFactor(0.8);
    this.portalAudio.setVolume(this.volumes.portal);
    
    portalMesh.add(this.portalAudio);
    this.portalAudio.play();
    console.log('Portal sound on');
  }

  // gun shot sound from player perspective
  playShot() {
    if (!this.buffers.shot || this.isMuted) return;

    const sound = new THREE.Audio(this.listener);
    sound.setBuffer(this.buffers.shot);
    sound.setVolume(this.volumes.shot);
    sound.play();
  }

  // toggle mute on/off
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.listener.setMasterVolume(this.isMuted ? 0 : 1);
    return this.isMuted;
  }

  setMasterVolume(volume) {
    this.listener.setMasterVolume(volume);
  }

  // clean up audio stuff
  dispose() {
    if (this.music) {
      this.music.stop();
      this.music.disconnect();
    }
    if (this.portalAudio) {
      this.portalAudio.stop();
      this.portalAudio.disconnect();
    }
    this.camera.remove(this.listener);
  }
}
