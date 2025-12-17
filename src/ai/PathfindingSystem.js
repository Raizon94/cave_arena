import * as THREE from 'three';

// pathfinding system using waypoint graph
// does raycasting to auto generate nodes
export class PathfindingSystem {
    constructor(collisionSystem) {
        this.collisionSystem = collisionSystem;
        this.nodes = []; // array of nodes with position and neighbors
        this.gridSize = 4.0; // meters between nodes
        this.debugLines = null;
    }

    // generates nav graph on mesh surfaces async
    async generateGraph(worldBounds, scene, navMeshes = []) {
        console.log('Generating nav graph on ' + navMeshes.length + ' meshes...');
        const start = performance.now();

        this.nodes = [];

        // no meshes means we scan whole world (slow)
        if (!navMeshes || navMeshes.length === 0) {
            console.warn('No nav meshes, doing full scan');
            const size = new THREE.Vector3();
            worldBounds.getSize(size);
            const center = new THREE.Vector3();
            worldBounds.getCenter(center);

            const startX = center.x - size.x / 2;
            const startZ = center.z - size.z / 2;
            const stepsX = Math.ceil(size.x / this.gridSize);
            const stepsZ = Math.ceil(size.z / this.gridSize);

            // do it in chunks so browser doesnt freeze
            const processChunk = async (xStart, xEnd) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        for (let x = xStart; x < xEnd; x++) {
                            for (let z = 0; z <= stepsZ; z++) {
                                const posX = startX + x * this.gridSize;
                                const posZ = startZ + z * this.gridSize;

                                const origin = new THREE.Vector3(posX, center.y + size.y, posZ);
                                const ground = this.collisionSystem.findGround(origin, size.y * 2);

                                if (ground) {
                                    this.nodes.push({
                                        id: this.nodes.length,
                                        position: ground.point.clone().add(new THREE.Vector3(0, 0.5, 0)),
                                        neighbors: []
                                    });
                                }
                            }
                        }
                        resolve();
                    }, 0);
                });
            };

            const chunkSize = 5;
            for (let x = 0; x <= stepsX; x += chunkSize) {
                await processChunk(x, Math.min(x + chunkSize, stepsX + 1));
            }
        } else {
            // process each nav mesh
            const processMesh = async (mesh) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        const box = new THREE.Box3().setFromObject(mesh);
                        const size = new THREE.Vector3();
                        box.getSize(size);
                        const center = new THREE.Vector3();
                        box.getCenter(center);

                        const startX = center.x - size.x / 2;
                        const startZ = center.z - size.z / 2;
                        const stepsX = Math.ceil(size.x / this.gridSize);
                        const stepsZ = Math.ceil(size.z / this.gridSize);

                        for (let x = 0; x <= stepsX; x++) {
                            for (let z = 0; z <= stepsZ; z++) {
                                const posX = startX + x * this.gridSize;
                                const posZ = startZ + z * this.gridSize;

                                // raycast down to find this mesh
                                const origin = new THREE.Vector3(posX, center.y + size.y + 1, posZ);
                                const raycaster = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
                                raycaster.far = size.y * 2 + 2;

                                const intersects = raycaster.intersectObject(mesh, false);

                                if (intersects.length > 0) {
                                    this.nodes.push({
                                        id: this.nodes.length,
                                        position: intersects[0].point.clone().add(new THREE.Vector3(0, 0.5, 0)),
                                        neighbors: []
                                    });
                                }
                            }
                        }
                        resolve();
                    }, 0);
                });
            };

            for (const mesh of navMeshes) {
                await processMesh(mesh);
            }
        }

        // connect nodes that are close together
        const connectChunk = async (iStart, iEnd) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    for (let i = iStart; i < iEnd; i++) {
                        const nodeA = this.nodes[i];
                        for (let j = i + 1; j < this.nodes.length; j++) {
                            const nodeB = this.nodes[j];
                            const dist = nodeA.position.distanceTo(nodeB.position);

                            if (dist <= this.gridSize * 1.5) {
                                // make sure theres no wall between
                                if (!this.collisionSystem.checkWallCollision(nodeA.position, nodeB.position, 0.5)) {
                                    nodeA.neighbors.push(nodeB);
                                    nodeB.neighbors.push(nodeA);
                                }
                            }
                        }
                    }
                    resolve();
                }, 0);
            });
        };

        const connectBatchSize = 50;
        for (let i = 0; i < this.nodes.length; i += connectBatchSize) {
            await connectChunk(i, Math.min(i + connectBatchSize, this.nodes.length));
        }

        console.log('Nav graph done: ' + this.nodes.length + ' nodes in ' + (performance.now() - start).toFixed(2) + 'ms');
    }

    // draws the nav graph for debuging
    visualize(scene) {
        if (this.debugLines) scene.remove(this.debugLines);

        const material = new THREE.LineBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.3 });
        const points = [];

        for (const node of this.nodes) {
            for (const neighbor of node.neighbors) {
                points.push(node.position);
                points.push(neighbor.position);
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.debugLines = new THREE.LineSegments(geometry, material);
        scene.add(this.debugLines);
    }

    // A* pathfinding algorthm
    findPath(startPos, endPos) {
        const startNode = this.findClosestNode(startPos);
        const endNode = this.findClosestNode(endPos);

        if (!startNode || !endNode) return null;
        if (startNode === endNode) return [endPos];

        const openSet = [startNode];
        const cameFrom = new Map();
        const gScore = new Map(); // cost from start
        const fScore = new Map(); // estimated total

        gScore.set(startNode, 0);
        fScore.set(startNode, startNode.position.distanceTo(endNode.position));

        const processed = new Set();

        while (openSet.length > 0) {
            // get lowest f score node
            openSet.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity));
            const current = openSet.shift();

            if (current === endNode) {
                return this.reconstructPath(cameFrom, current, endPos);
            }

            processed.add(current);

            for (const neighbor of current.neighbors) {
                if (processed.has(neighbor)) continue;

                const tentativeGScore = gScore.get(current) + current.position.distanceTo(neighbor.position);

                if (tentativeGScore < (gScore.get(neighbor) || Infinity)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentativeGScore);
                    fScore.set(neighbor, tentativeGScore + neighbor.position.distanceTo(endNode.position));

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return null; // no path found
    }

    reconstructPath(cameFrom, current, endPos) {
        const totalPath = [endPos, current.position];
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            totalPath.push(current.position);
        }
        return totalPath.reverse();
    }

    // finds closest node to a position
    findClosestNode(pos) {
        let closest = null;
        let minDist = Infinity;

        for (const node of this.nodes) {
            const dist = node.position.distanceToSquared(pos);
            if (dist < minDist) {
                minDist = dist;
                closest = node;
            }
        }

        return closest;
    }
}
