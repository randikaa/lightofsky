# TurboApex: Jungle Ruins - Endless Procedural 3D Racing Game

A production-ready WebGL 3D Open-World Multiplayer Jungle Racing Game set in an endless overgrown wilderness with ancient ruins, powered by **Three.js**, **Rapier3D** (`@dimforge/rapier3d-compat`), **Simplex Noise**, **Colyseus** (WebSockets Backend), and **React** (Expedition HUD & Garage).

---

## Key Technical Systems

- **Procedural Endless World & Chunk Streaming (`src/world/`)**:
  - Partitions the world into $64\text{m} \times 64\text{m}$ grid chunks.
  - Multi-octave Simplex Fractal Brownian Motion (FBM) for natural jungle hills and valleys.
  - **Endless Carved Racing Road**: Continuous analytical winding road function smoothly carves a flat, banked dirt/mud track into the terrain with zero seams between chunks.
  - **Memory Leak-Free Disposal**: Active chunks stream in a 7x7 grid (448m diameter) around the player. Chunks outside the view distance are completely disposed of (geometries, materials, and Rapier heightfield colliders are pruned from the WASM heap).

- **Physics Engine: Rapier.js 3D (`src/physics/`)**:
  - WebAssembly physics with native heightfield colliders matching Three.js chunk vertex resolution.
  - Solid 3D colliders for tree trunks, mossy boulders, and ancient stone ruin pillars.
  - Low-overhead broadphase raycasting for vehicle suspension.

- **Foliage & Overgrown Ancient Ruins Instancing (`src/world/InstancedFloraRuins.ts`)**:
  - Uses `THREE.InstancedMesh` to render thousands of jungle trees, giant ferns, stone boulders, and decayed temple pillars/arches with minimal draw calls (<40 calls/frame).
  - Rule-based procedural distribution: objects never spawn on the racing road or steep cliffs; ancient ruin pillars cluster on elevated stone plateaus.

- **Off-Road Raycast Vehicle Dynamics (`src/vehicles/VehicleController.ts`)**:
  - 4-wheel independent raycast suspension with Hooke's law spring compression and velocity damping.
  - High-torque all-wheel drive tuned for rough off-road terrain.
  - Speed-adaptive steering and power drifting on handbrake (<kbd>Spacebar</kbd>).
  - Upright stabilizing torque assist to prevent flipping over bumpy terrain.

- **Jungle Atmosphere & Ambient Wildlife (`src/environment/JungleAtmosphere.ts`)**:
  - Dense jungle fog (`THREE.FogExp2`), tropical sunlight with god-ray angles, and emerald ambient lighting.
  - Low-poly V-wing canopy birds circling ancient ruins and treetops.

- **Deterministic Multiplayer with World Seed (`src/network/`, `server/`)**:
  - Colyseus room generates and broadcasts a global `worldSeed`.
  - Every player generates the exact same endless terrain, winding roads, and ruin locations down to the millimeter.
  - 30Hz player transform synchronization with exponential position lerp and quaternion slerp.
  - Graceful offline fallback to solo expedition mode if server is not running.

---

## Controls

| Key | Action |
| :--- | :--- |
| **W** / **Z** / **Up Arrow** | Accelerate |
| **S** / **Down Arrow** | Brake / Reverse |
| **A** / **Q** / **Left Arrow** | Steer Left |
| **D** / **Right Arrow** | Steer Right |
| **Spacebar** | Handbrake / Power Drift |
| **R** | Reset / Right Vehicle |

---

## Quick Start

### 1. Run Full Multiplayer (Server + Client concurrently)
```bash
pnpm dev:all
```
- **Vite Client**: `http://localhost:5173`
- **Colyseus Server**: `ws://localhost:2567`

Open `http://localhost:5173` in two browser tabs to explore and race together in the endless procedural jungle!

### 2. Run Client Only (Solo Expedition Mode)
```bash
pnpm dev
```

### 3. Run Server Only
```bash
pnpm dev:server
```
