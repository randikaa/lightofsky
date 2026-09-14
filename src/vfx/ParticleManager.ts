import * as THREE from "three";

interface SmokeParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export class ParticleManager {
  private particles: SmokeParticle[] = [];
  private maxParticles = 200;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;

  private positionsArray: Float32Array;
  private colorsArray: Float32Array;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.positionsArray = new Float32Array(this.maxParticles * 3);
    this.colorsArray = new Float32Array(this.maxParticles * 3);

    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positionsArray, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colorsArray, 3));

    // Particle texture (soft circular gradient)
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(220, 220, 220, 1.0)");
    grad.addColorStop(0.5, "rgba(180, 180, 180, 0.4)");
    grad.addColorStop(1, "rgba(100, 100, 100, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 1.6,
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });

    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    scene.add(this.pointsMesh);
  }

  public emitSmoke(originL: THREE.Vector3, originR: THREE.Vector3) {
    if (this.particles.length < this.maxParticles - 2) {
      [originL, originR].forEach((pos) => {
        this.particles.push({
          position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1, (Math.random() - 0.5) * 0.3)),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.6 + 0.3, (Math.random() - 0.5) * 0.8),
          size: 0.8,
          opacity: 0.6,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.4,
        });
      });
    }
  }

  public emitFootstepDust(pos: THREE.Vector3) {
    if (this.particles.length < this.maxParticles - 3) {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.05, (Math.random() - 0.5) * 0.2)),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.35 + 0.15, (Math.random() - 0.5) * 0.5),
          size: 0.45,
          opacity: 0.4,
          life: 0,
          maxLife: 0.4 + Math.random() * 0.3,
        });
      }
    }
  }

  public update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, deltaTime);
      p.size += deltaTime * 2.0; // Expands as it dissipates
      p.opacity = (1.0 - p.life / p.maxLife) * 0.5;
    }

    // Update GPU buffer
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        this.positionsArray[i * 3] = p.position.x;
        this.positionsArray[i * 3 + 1] = p.position.y;
        this.positionsArray[i * 3 + 2] = p.position.z;

        this.colorsArray[i * 3] = p.opacity;
        this.colorsArray[i * 3 + 1] = p.opacity;
        this.colorsArray[i * 3 + 2] = p.opacity;
      } else {
        this.positionsArray[i * 3 + 1] = -9999;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
