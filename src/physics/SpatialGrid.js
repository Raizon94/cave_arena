import * as THREE from 'three';

// simple grid-based spatial partitioning system for optimizing colisions
// only checks nearby meshes instead of all meshes
export class SpatialGrid {
  constructor(worldBounds, cellSize = 20) {
    this.worldBounds = worldBounds;
    this.cellSize = cellSize;
    this.grid = new Map();
    
    const size = worldBounds.getSize(new THREE.Vector3());
    this.gridWidth = Math.ceil(size.x / cellSize);
    this.gridHeight = Math.ceil(size.y / cellSize);
    this.gridDepth = Math.ceil(size.z / cellSize);
    
    console.log('Spatial Grid: ' + this.gridWidth + 'x' + this.gridHeight + 'x' + this.gridDepth + ' cells (' + cellSize + 'm each)');
  }
  
  // convert world position to grid coordinates
  worldToGrid(position) {
    const min = this.worldBounds.min;
    return {
      x: Math.floor((position.x - min.x) / this.cellSize),
      y: Math.floor((position.y - min.y) / this.cellSize),
      z: Math.floor((position.z - min.z) / this.cellSize)
    };
  }
  
  // generate unique key for cell
  getCellKey(gridPos) {
    return `${gridPos.x},${gridPos.y},${gridPos.z}`;
  }
  
  // add mesh to grid
  addMesh(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const min = this.worldToGrid(box.min);
    const max = this.worldToGrid(box.max);
    
    // add mesh to all cells it ocupies
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          const key = this.getCellKey({ x, y, z });
          if (!this.grid.has(key)) {
            this.grid.set(key, []);
          }
          this.grid.get(key).push(mesh);
        }
      }
    }
  }
  
  // get all meshes near a position
  // searches current cell and neighbors (3x3x3 = 27 cells)
  getNearbyMeshes(position, radius = 0) {
    const cellPos = this.worldToGrid(position);
    const meshSet = new Set(); // use Set to avoid duplicates
    
    // calculate how many cells to check based on radius
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    // check neighbor cells
    for (let dx = -cellRadius - 1; dx <= cellRadius + 1; dx++) {
      for (let dy = -cellRadius - 1; dy <= cellRadius + 1; dy++) {
        for (let dz = -cellRadius - 1; dz <= cellRadius + 1; dz++) {
          const key = this.getCellKey({
            x: cellPos.x + dx,
            y: cellPos.y + dy,
            z: cellPos.z + dz
          });
          
          const meshes = this.grid.get(key);
          if (meshes) {
            meshes.forEach(mesh => meshSet.add(mesh));
          }
        }
      }
    }
    
    return Array.from(meshSet);
  }
  
  // clear the grid
  clear() {
    this.grid.clear();
  }
  
  // get grid statistics
  getStats() {
    const totalCells = this.grid.size;
    let totalMeshes = 0;
    let maxMeshesPerCell = 0;
    
    this.grid.forEach(meshes => {
      totalMeshes += meshes.length;
      maxMeshesPerCell = Math.max(maxMeshesPerCell, meshes.length);
    });
    
    const avgMeshesPerCell = totalCells > 0 ? totalMeshes / totalCells : 0;
    
    return {
      totalCells,
      totalMeshes,
      maxMeshesPerCell,
      avgMeshesPerCell: avgMeshesPerCell.toFixed(1)
    };
  }
}
