# Cave Arena - FPS Zombie Defense

A first-person shooter (FPS) game built with JavaScript and Three.js, where the goal is to defend a Nether Portal against waves of zombies.

## Project Overview

**Cave Arena** is a 3D game that implements a custom game engine on top of Three.js. It includes advanced systems like physics with spatial partitioning, dynamic A* pathfinding, wave management, object pooling for performance, and a complete UI system.

The goal of the game is to survive as long as possible and prevent zombies from destroying the Portal.

### Main Features

* **Custom 3D Engine**: Game loop, scene management, and optimized rendering.
* **Physics System**: Collision detection using Raycasting and Spatial Grid for optimization.
* **Artificial Intelligence (AI)**:
    * **A* Pathfinding**: Automatic generation of navigation graphs on world meshes.
    * **Zombie Behavior**: State machine to chase the player or attack the portal.
* **Performance Management**:
    * **Object Pooling**: Reuse of projectiles and zombies to avoid Garbage Collection.
    * **Async Loading**: Loading screen and glTF resource management.
* **3D Audio System**: Spatial sounds that react to distance and position.
* **Dynamic UI**: Menus, HUD, 3D health bars, and scoring system.

---

## Project Structure

Source code is in the `src/` folder and is organized modularly:

```
src/
├── Game.js                 # Main class, game loop entry point
├── ai/                     # Artificial Intelligence systems
│   └── PathfindingSystem.js # A* implementation and graph generation
├── audio/                  # Audio management
│   └── AudioManager.js     # 3D spatial sound system
├── config/                 # Global configuration
│   └── constants.js        # Game constants (speed, damage, etc)
├── controls/               # User input
│   └── PlayerControls.js   # Camera and keyboard control (PointerLock)
├── core/                   # Base engine
│   ├── Renderer.js         # Three.js WebGLRenderer configuration
│   └── LightingManager.js  # Lights and shadows management
├── entities/               # Game entities
│   ├── Zombie.js           # Enemy logic (movement, health, attack)
│   └── ZombiePool.js       # Zombie entity recycling system
├── physics/                # Physics engine
│   ├── CollisionSystem.js  # Main collision system (Spatial Grid)
│   ├── PlayerPhysics.js    # Player physics (jump, gravity, sliding)
│   ├── SpatialGrid.js      # Spatial partitioning for static collisions
│   └── DynamicGrid.js      # Partitioning for mobile entities
├── ui/                     # User Interface
│   ├── UIManager.js        # Central UI manager (Menus, HUD)
│   ├── HealthBar3D.js      # Floating health bars above enemies
│   └── ...                 # Other UI components
├── utils/                  # Utilities
│   ├── Weapon.js           # Weapon logic (recoil, flash)
│   └── FPSCounter.js       # Performance monitor
├── weapons/                # Combat system
│   └── ProjectilePool.js   # Optimized bullet/projectile management
└── world/                  # World management
    ├── WorldManager.js     # Level loading, portal logic and spawn
    └── WaveManager.js      # Wave system and progressive difficulty
```

---

## Key Components Explanation

### 1. Game.js (The Brain)
The `Game` class that orchestrates everything.
* **`init()`**: Initializes all subsystems (Renderer, Physics, World, Audio).
* **`animate()`**: The main rendering loop. Calculates `delta` (time between frames) and updates all systems sequentially.

### 2. Physics & Player (The Laws)
The movement system doesn't use a heavy physics library (like Ammo.js), but a lightweight and fast implementation:
* **`CollisionSystem.js`**: Uses a **Spatial Grid** to divide the world into cells. When a ray is cast (Raycast), only nearby polygons are checked, allowing thousands of polygons with high performance.
* **`PlayerPhysics.js`**: Implements gravity, jumping, and "Wall Sliding" (sliding along walls when colliding) by projecting the movement vector onto the collision plane.

### 3. AI & Pathfinding (The Behavior)
* **`WorldManager.js`**: When loading the level, detects special meshes called `path`.
* **`PathfindingSystem.js`**:
    1. Casts rays onto `path` meshes to generate connected navigation **Nodes**.
    2. Uses the **A*** algorithm to find the shortest path between the zombie and its target (Player or Portal).
* **`Zombie.js`**: Follows the calculated path. If close enough, moves directly. If it hits the wall, it explodes.

### 4. World & Waves (The Environment)
* **`WorldManager.js`**: Loads the `cave_scene.glb` file. Processes objects by name (`collision` for invisible walls, `spawn` for spawn points, `wall` for the portal).
* **`WaveManager.js`**: Controls difficulty. Increases the number of zombies and their health each wave.

### 5. Combat System (The Action)
* **`Weapon.js`** & **`PlayerControls.js`**: Handle first-person camera and shooting.
* **`ProjectilePool.js`**: Maintains a fixed array of bullets (reusable). When shooting, activates an inactive bullet. On collision, deactivates it. This avoids constantly creating `new Mesh` objects, which would pause the game due to Garbage Collection.

### 6. UI (The Interface)
* **`UIManager.js`**: Creates and manages all HTML/CSS overlaid on the 3D Canvas. Handles screen states (Start, Pause, Game Over).

---

## Controls

| Action | Key / Mouse |
| :--- | :--- |
| **Move** | `W`, `A`, `S`, `D` |
| **Jump** | `SPACE` |
| **Aim** | `MOVE MOUSE` |
| **Shoot** | `LEFT CLICK` |
| **Pause** | `ESC` |

---

## How to Run

This project uses native ES6 modules, so it **needs a local server** to work (due to browser CORS security policies when loading 3D files and textures).

### Option 1: npx serve (Recommended)
The fastest way if you have Node.js:
```bash
npx serve
```
Then open `http://localhost:3000` in your browser.

### Option 2: Python
If you have Python installed:
1. Open a terminal in the project folder.
2. Run:
    ```bash
    python3 -m http.server
    ```
3. Open `http://localhost:8000` in your browser.

### Option 3: Node.js (http-server)
If you have Node.js:
1. Install the server globally (if you don't have it):
    ```bash
    npm install -g http-server
    ```
2. Run in the project folder:
    ```bash
    http-server .
    ```
3. Open the address it shows (usually `http://127.0.0.1:8080`).

---

## Dependencies

* **Three.js**: Graphics engine (included locally in `three.js-master`).
* **GLTFLoader**: 3D model loader.
* **PointerLockControls**: FPS camera control.

---

## License

This project was created for the Advanced Computer Graphics course.
