import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type CarStyle = "supercar" | "muscle" | "coupe" | "formula";

export interface CarVisuals {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  wheelMeshes: THREE.Object3D[];
  headlights: THREE.PointLight[];
  taillights: THREE.PointLight[];
}

export class CarModelFactory {
  private loader = new GLTFLoader();
  private cache = new Map<string, THREE.Group>();

  /**
   * Optional preloading for custom external .glb assets (e.g. from Meshy / Tripo3D)
   */
  public async loadGLB(id: string, url: string): Promise<THREE.Group> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!.clone(true);
    }
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.cache.set(id, model);
          resolve(model.clone(true));
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  /**
   * Generates a fully detailed procedural car with body, cockpit, spoiler, and 4 wheels
   */
  public createProceduralCar(style: CarStyle = "supercar", colorHex: string = "#e63946"): CarVisuals {
    const group = new THREE.Group();
    const headlights: THREE.PointLight[] = [];
    const taillights: THREE.PointLight[] = [];

    const bodyColor = new THREE.Color(colorHex);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.25,
      metalness: 0.85,
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.1,
      metalness: 0.9,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.7,
      metalness: 0.2,
    });

    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const brakeLightMaterial = new THREE.MeshBasicMaterial({ color: 0xff1e00 });

    let mainBodyMesh: THREE.Mesh;

    if (style === "formula") {
      // Open-Wheel F1 Style Racer
      const noseGeo = new THREE.BoxGeometry(0.8, 0.4, 2.6);
      mainBodyMesh = new THREE.Mesh(noseGeo, bodyMaterial);
      mainBodyMesh.position.set(0, 0.35, 0.2);
      mainBodyMesh.castShadow = true;
      group.add(mainBodyMesh);

      // Cockpit
      const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.9), glassMaterial);
      cockpit.position.set(0, 0.55, -0.1);
      group.add(cockpit);

      // Sidepods
      const sidepodL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 1.4), bodyMaterial);
      sidepodL.position.set(-0.65, 0.35, -0.2);
      sidepodL.castShadow = true;
      group.add(sidepodL);

      const sidepodR = sidepodL.clone();
      sidepodR.position.x = 0.65;
      group.add(sidepodR);

      // Front Wing
      const frontWing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.5), darkMaterial);
      frontWing.position.set(0, 0.2, 1.6);
      frontWing.castShadow = true;
      group.add(frontWing);

      // Rear Wing
      const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.6), darkMaterial);
      rearWing.position.set(0, 0.85, -1.6);
      rearWing.castShadow = true;
      group.add(rearWing);

      const wingPillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.2), darkMaterial);
      wingPillar.position.set(0, 0.65, -1.6);
      group.add(wingPillar);

    } else if (style === "muscle") {
      // Heavy American Muscle Car
      const lowerGeo = new THREE.BoxGeometry(2.0, 0.6, 4.4);
      mainBodyMesh = new THREE.Mesh(lowerGeo, bodyMaterial);
      mainBodyMesh.position.set(0, 0.5, 0);
      mainBodyMesh.castShadow = true;
      group.add(mainBodyMesh);

      // Cabin / Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.0), glassMaterial);
      cabin.position.set(0, 0.95, -0.3);
      cabin.castShadow = true;
      group.add(cabin);

      // Hood Scoop / Blower
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.7), darkMaterial);
      scoop.position.set(0, 0.85, 1.2);
      scoop.castShadow = true;
      group.add(scoop);

      // Chrome Bumpers
      const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.2, 0.2), darkMaterial);
      bumperF.position.set(0, 0.35, 2.2);
      group.add(bumperF);

    } else if (style === "coupe") {
      // Sports Coupe
      const lowerGeo = new THREE.BoxGeometry(1.9, 0.55, 4.0);
      mainBodyMesh = new THREE.Mesh(lowerGeo, bodyMaterial);
      mainBodyMesh.position.set(0, 0.45, 0);
      mainBodyMesh.castShadow = true;
      group.add(mainBodyMesh);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.2), glassMaterial);
      cabin.position.set(0, 0.88, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      // Small Ducktail Spoiler
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.3), darkMaterial);
      spoiler.position.set(0, 0.8, -1.9);
      group.add(spoiler);

    } else {
      // Default: Supercar (Exotic Hypercar)
      const baseGeo = new THREE.BoxGeometry(2.1, 0.45, 4.3);
      mainBodyMesh = new THREE.Mesh(baseGeo, bodyMaterial);
      mainBodyMesh.position.set(0, 0.45, 0);
      mainBodyMesh.castShadow = true;
      group.add(mainBodyMesh);

      // Sleek canopy cockpit
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 2.3), glassMaterial);
      canopy.position.set(0, 0.82, -0.2);
      canopy.castShadow = true;
      group.add(canopy);

      // Aerodynamic GT Rear Wing
      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.45), darkMaterial);
      wingBlade.position.set(0, 1.0, -1.85);
      wingBlade.castShadow = true;
      group.add(wingBlade);

      const standL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.2), darkMaterial);
      standL.position.set(-0.6, 0.8, -1.85);
      const standR = standL.clone();
      standR.position.x = 0.6;
      group.add(standL, standR);

      // Front Splitter
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.06, 0.4), darkMaterial);
      splitter.position.set(0, 0.22, 2.15);
      group.add(splitter);
    }

    // Headlights (LED Mesh + PointLight)
    const headLightMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), lightMaterial);
    headLightMeshL.position.set(-0.7, 0.5, 2.15);
    const headLightMeshR = headLightMeshL.clone();
    headLightMeshR.position.x = 0.7;
    group.add(headLightMeshL, headLightMeshR);

    const lightL = new THREE.PointLight(0xffffff, 2, 25);
    lightL.position.set(-0.7, 0.6, 2.3);
    const lightR = new THREE.PointLight(0xffffff, 2, 25);
    lightR.position.set(0.7, 0.6, 2.3);
    group.add(lightL, lightR);
    headlights.push(lightL, lightR);

    // Taillights
    const tailLightMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.08), brakeLightMaterial);
    tailLightMeshL.position.set(-0.7, 0.55, -2.15);
    const tailLightMeshR = tailLightMeshL.clone();
    tailLightMeshR.position.x = 0.7;
    group.add(tailLightMeshL, tailLightMeshR);

    const tailLightL = new THREE.PointLight(0xff1e00, 1.5, 10);
    tailLightL.position.set(-0.7, 0.55, -2.3);
    const tailLightR = new THREE.PointLight(0xff1e00, 1.5, 10);
    tailLightR.position.set(0.7, 0.55, -2.3);
    group.add(tailLightL, tailLightR);
    taillights.push(tailLightL, tailLightR);

    // Create 4 Detached Visual Wheels
    const wheelMeshes: THREE.Object3D[] = [];
    const wheelRadius = 0.38;
    const wheelWidth = 0.3;

    for (let i = 0; i < 4; i++) {
      const wheelGroup = new THREE.Group();

      // Tire Rubber
      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 });
      const tireMesh = new THREE.Mesh(tireGeo, tireMat);
      tireMesh.castShadow = true;
      wheelGroup.add(tireMesh);

      // Rim / Alloy Wheel
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.01, 12);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(rimMesh);

      // Brake Rotor & Red Caliper
      const caliperGeo = new THREE.BoxGeometry(0.12, 0.15, 0.1);
      const caliperMat = new THREE.MeshStandardMaterial({ color: 0xe63946, metalness: 0.5, roughness: 0.3 });
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(0, 0.16, 0);
      wheelGroup.add(caliper);

      wheelMeshes.push(wheelGroup);
    }

    return {
      group,
      bodyMesh: mainBodyMesh,
      wheelMeshes,
      headlights,
      taillights,
    };
  }
}
