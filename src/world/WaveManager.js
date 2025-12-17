import { WaveDisplay } from '../ui/WaveDisplay.js';

export class WaveManager {
    constructor(worldManager, zombiePool) {
        this.worldManager = worldManager;
        this.zombiePool = zombiePool;
        this.display = new WaveDisplay();

        this.currentWave = 0;
        this.zombiesToSpawn = 0;
        this.zombiesAlive = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 2.0; // Seconds between spawns

        this.waveActive = false;
        this.timeBetweenWaves = 5.0;
        this.waveTimer = 0;

        // Difficulty settings
        this.baseZombies = 5;
        this.baseHealth = 100;
    }

    startNextWave() {
        this.currentWave++;
        this.waveActive = true;

        // Calculate difficulty: wave number * random(2,3)
        const zombieMultiplier = 2 + Math.random(); // Random between 2 and 3
        this.zombiesToSpawn = Math.floor(this.currentWave * zombieMultiplier);
        const health = Math.floor(this.baseHealth * Math.pow(1.1, this.currentWave - 1));

        // Update pool settings (if possible, or just set on spawn)
        this.zombiePool.maxHealth = health; // We might need to add this property to pool or pass it to spawn

        this.display.showWaveMessage(this.currentWave);
        this.display.update(this.currentWave, this.zombiesAlive + this.zombiesToSpawn);

        console.log(`Starting Wave ${this.currentWave}: ${this.zombiesToSpawn} zombies, ${health} HP`);
    }

    update(delta) {
        // Update UI count
        this.zombiesAlive = this.zombiePool.getActiveCount();
        this.display.update(this.currentWave, this.zombiesAlive + this.zombiesToSpawn);

        if (!this.waveActive) {
            // Waiting for next wave
            this.waveTimer += delta;
            if (this.waveTimer >= this.timeBetweenWaves) {
                this.startNextWave();
                this.waveTimer = 0;
            }
            return;
        }

        // Spawning Logic
        if (this.zombiesToSpawn > 0) {
            this.spawnTimer += delta;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;

                // Try to spawn
                if (this.zombiePool.getAvailableCount() > 0) {
                    const spawned = this.worldManager.spawnRandomZombie();
                    if (spawned) {
                        this.zombiesToSpawn--;
                        // Set health based on wave
                        spawned.maxHealth = Math.floor(this.baseHealth * Math.pow(1.1, this.currentWave - 1));
                        spawned.health = spawned.maxHealth;
                    }
                }
            }
        } else if (this.zombiesAlive === 0) {
            // Wave Cleared
            console.log(`Wave ${this.currentWave} Cleared!`);
            this.waveActive = false;
        }
    }
}
