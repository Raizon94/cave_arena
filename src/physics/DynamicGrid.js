// dynamic grid for fast entity queries
// uses cell-based spatial partitioning
export class DynamicGrid {
  constructor(cellSize = 3) {
    this.cellSize = cellSize;
    this.cells = new Map(); // "x,z" -> Set<entity>
  }

  _key(pos) {
    const cx = Math.floor(pos.x / this.cellSize);
    const cz = Math.floor(pos.z / this.cellSize);
    return `${cx},${cz}`;
  }

  insert(entity) {
    const key = this._key(entity.position);
    if (!this.cells.has(key)) this.cells.set(key, new Set());
    this.cells.get(key).add(entity);
  }

  clear() { this.cells.clear(); }

  // query entities near a position within radius
  queryNearby(pos, radius) {
    const results = new Set();
    const r = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(pos.x / this.cellSize);
    const cz = Math.floor(pos.z / this.cellSize);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        if (this.cells.has(key)) {
          for (const e of this.cells.get(key)) results.add(e);
        }
      }
    }
    return Array.from(results);
  }
}
