import * as THREE from "three";
import * as CANNON from "cannon-es";

export interface TrackData {
  trackMesh: THREE.Mesh;
  checkpoints: THREE.Vector3[];
  barrierBodies: CANNON.Body[];
  curve: THREE.CatmullRomCurve3;
}

export class TrackBuilder {
  /**
   * Generates a complete 3D racing track with road, curbs, barriers, finish line, and checkpoint gates
   */
  public static buildTrack(scene: THREE.Scene, world: CANNON.World): TrackData {
    // 1. Defined Track Waypoints forming an exciting closed circuit
    const waypoints = [
      new THREE.Vector3(0, 0, 0),         // 0: Start / Finish Line
      new THREE.Vector3(0, 0, 80),        // 1: Main Straight
      new THREE.Vector3(25, 0, 150),      // 2: Sweeping Fast Turn 1
      new THREE.Vector3(80, 0, 180),      // 3: Turn 2 Entry
      new THREE.Vector3(140, 0, 130),     // 4: Turn 3 Apex
      new THREE.Vector3(130, 0, 40),      // 5: Chicane Entry
      new THREE.Vector3(90, 0, -20),      // 6: Chicane Exit
      new THREE.Vector3(110, 0, -100),    // 7: Hairpin Turn
      new THREE.Vector3(40, 0, -130),     // 8: Back Straight Entry
      new THREE.Vector3(-40, 0, -80),     // 9: Final Turn into Main Straight
    ];

    const curve = new THREE.CatmullRomCurve3(waypoints, true, "catmullrom", 0.25);
    const divisions = 240;
    const roadWidth = 14;
    const halfWidth = roadWidth / 2;

    const points = curve.getSpacedPoints(divisions);

    // 2. Generate Road Geometry
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Curb and Barrier positions
    const leftBarrierPoints: THREE.Vector3[] = [];
    const rightBarrierPoints: THREE.Vector3[] = [];

    for (let i = 0; i <= divisions; i++) {
      const p = points[i % divisions];
      const nextP = points[(i + 1) % divisions];
      const dir = new THREE.Vector3().subVectors(nextP, p).normalize();
      const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize(); // Perpendicular to road

      const left = p.clone().add(normal.clone().multiplyScalar(halfWidth));
      const right = p.clone().sub(normal.clone().multiplyScalar(halfWidth));

      vertices.push(left.x, left.y + 0.05, left.z);
      vertices.push(right.x, right.y + 0.05, right.z);

      const v = i / 10;
      uvs.push(0, v);
      uvs.push(1, v);

      leftBarrierPoints.push(left);
      rightBarrierPoints.push(right);

      if (i < divisions) {
        const idx = i * 2;
        indices.push(idx, idx + 1, idx + 2);
        indices.push(idx + 1, idx + 3, idx + 2);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    // Canvas procedural asphalt texture with lane markings
    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = 512;
    roadCanvas.height = 512;
    const ctx = roadCanvas.getContext("2d")!;

    // Asphalt dark grey
    ctx.fillStyle = "#22252a";
    ctx.fillRect(0, 0, 512, 512);

    // Asphalt noise grain
    for (let x = 0; x < 512; x += 4) {
      for (let y = 0; y < 512; y += 4) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }

    // Outer white boundary lines
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(20, 0, 8, 512);
    ctx.fillRect(512 - 28, 0, 8, 512);

    // Center dashed yellow lane
    ctx.fillStyle = "#f59e0b";
    for (let y = 10; y < 512; y += 60) {
      ctx.fillRect(252, y, 8, 35);
    }

    const roadTexture = new THREE.CanvasTexture(roadCanvas);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1, 15);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.8,
      metalness: 0.1,
    });

    const trackMesh = new THREE.Mesh(roadGeo, roadMat);
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // 3. Red & White Curbs
    this.buildCurbs(scene, points, roadWidth);

    // 4. Guardrails / Barriers with Cannon-es Colliders
    const barrierBodies: CANNON.Body[] = [];
    this.buildBarriers(scene, world, leftBarrierPoints, rightBarrierPoints, barrierBodies);

    // 5. Start / Finish Line Arch Gantry
    this.buildFinishGantry(scene, waypoints[0]);

    // 6. Checkpoint Gates with Glowing Neon Beams
    waypoints.forEach((wp, idx) => {
      if (idx > 0) {
        this.buildCheckpointGate(scene, wp, idx);
      }
    });

    // 7. Ground / Terrain
    this.buildGround(scene, world);

    return {
      trackMesh,
      checkpoints: waypoints,
      barrierBodies,
      curve,
    };
  }

  private static buildCurbs(scene: THREE.Scene, points: THREE.Vector3[], roadWidth: number) {
    const halfWidth = roadWidth / 2;
    const curbMat1 = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.6 });
    const curbMat2 = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.6 });

    for (let i = 0; i < points.length; i += 3) {
      const p = points[i];
      const nextP = points[(i + 1) % points.length];
      const dir = new THREE.Vector3().subVectors(nextP, p).normalize();
      const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const mat = (Math.floor(i / 6) % 2 === 0) ? curbMat1 : curbMat2;

      // Left curb stone
      const curbL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 2.0), mat);
      curbL.position.copy(p.clone().add(normal.clone().multiplyScalar(halfWidth + 0.3)));
      curbL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      scene.add(curbL);

      // Right curb stone
      const curbR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 2.0), mat);
      curbR.position.copy(p.clone().sub(normal.clone().multiplyScalar(halfWidth + 0.3)));
      curbR.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      scene.add(curbR);
    }
  }

  private static buildBarriers(
    scene: THREE.Scene,
    world: CANNON.World,
    leftPts: THREE.Vector3[],
    rightPts: THREE.Vector3[],
    barrierBodies: CANNON.Body[]
  ) {
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      metalness: 0.8,
      roughness: 0.3,
    });

    const step = 8;
    for (let i = 0; i < leftPts.length; i += step) {
      const pL = leftPts[i];
      const nextL = leftPts[(i + step) % leftPts.length];
      const dirL = new THREE.Vector3().subVectors(nextL, pL);
      const lenL = dirL.length();

      // Visual Rail Left
      const railGeoL = new THREE.BoxGeometry(0.4, 0.8, lenL);
      const railL = new THREE.Mesh(railGeoL, barrierMat);
      railL.position.copy(pL.clone().add(nextL).multiplyScalar(0.5));
      railL.position.y += 0.4;
      railL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirL.clone().normalize());
      scene.add(railL);

      // Physics Body Left
      const colShapeL = new CANNON.Box(new CANNON.Vec3(0.3, 1.0, lenL / 2));
      const colBodyL = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(railL.position.x, railL.position.y, railL.position.z),
      });
      colBodyL.quaternion.copy(railL.quaternion as any);
      colBodyL.addShape(colShapeL);
      world.addBody(colBodyL);
      barrierBodies.push(colBodyL);

      // Visual Rail Right
      const pR = rightPts[i];
      const nextR = rightPts[(i + step) % rightPts.length];
      const dirR = new THREE.Vector3().subVectors(nextR, pR);
      const lenR = dirR.length();

      const railGeoR = new THREE.BoxGeometry(0.4, 0.8, lenR);
      const railR = new THREE.Mesh(railGeoR, barrierMat);
      railR.position.copy(pR.clone().add(nextR).multiplyScalar(0.5));
      railR.position.y += 0.4;
      railR.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirR.clone().normalize());
      scene.add(railR);

      // Physics Body Right
      const colShapeR = new CANNON.Box(new CANNON.Vec3(0.3, 1.0, lenR / 2));
      const colBodyR = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(railR.position.x, railR.position.y, railR.position.z),
      });
      colBodyR.quaternion.copy(railR.quaternion as any);
      colBodyR.addShape(colShapeR);
      world.addBody(colBodyR);
      barrierBodies.push(colBodyR);
    }
  }

  private static buildFinishGantry(scene: THREE.Scene, pos: THREE.Vector3) {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7), metalMat);
    pillarL.position.set(-8, 3.5, 0);

    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7), metalMat);
    pillarR.position.set(8, 3.5, 0);

    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 1.2), metalMat);
    crossbeam.position.set(0, 6.8, 0);

    // Banner: Start / Finish Checkerboard
    const bannerCanvas = document.createElement("canvas");
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bCtx = bannerCanvas.getContext("2d")!;
    bCtx.fillStyle = "#111827";
    bCtx.fillRect(0, 0, 512, 128);

    // Checkered border
    for (let x = 0; x < 512; x += 32) {
      for (let y = 0; y < 128; y += 32) {
        if ((x / 32 + y / 32) % 2 === 0) {
          bCtx.fillStyle = "#ffffff";
          bCtx.fillRect(x, y, 32, 32);
        }
      }
    }

    bCtx.fillStyle = "rgba(0,0,0,0.7)";
    bCtx.fillRect(80, 20, 352, 88);
    bCtx.fillStyle = "#00f0ff";
    bCtx.font = "bold 42px sans-serif";
    bCtx.textAlign = "center";
    bCtx.textBaseline = "middle";
    bCtx.fillText("FINISH / START", 256, 64);

    const bannerMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bannerCanvas) });
    const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.5), bannerMat);
    bannerMesh.position.set(0, 6.8, 0.65);

    group.add(pillarL, pillarR, crossbeam, bannerMesh);
    group.position.copy(pos);
    scene.add(group);
  }

  private static buildCheckpointGate(scene: THREE.Scene, pos: THREE.Vector3, index: number) {
    const group = new THREE.Group();

    // Arch pillars
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 0.4), archMat);
    pillarL.position.set(-8, 2.5, 0);

    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 0.4), archMat);
    pillarR.position.set(8, 2.5, 0);

    // Glowing Neon Beam
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 16);
    beamGeo.rotateZ(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 4.8, 0);

    // Checkpoint Index Tag
    const tagCanvas = document.createElement("canvas");
    tagCanvas.width = 128;
    tagCanvas.height = 64;
    const tCtx = tagCanvas.getContext("2d")!;
    tCtx.fillStyle = "#000000";
    tCtx.fillRect(0, 0, 128, 64);
    tCtx.fillStyle = "#00f0ff";
    tCtx.font = "bold 32px sans-serif";
    tCtx.textAlign = "center";
    tCtx.textBaseline = "middle";
    tCtx.fillText(`CP ${index}`, 64, 32);

    const tagMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tagCanvas) });
    const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), tagMat);
    tagMesh.position.set(0, 5.5, 0);

    group.add(pillarL, pillarR, beam, tagMesh);
    group.position.copy(pos);
    scene.add(group);
  }

  private static buildGround(scene: THREE.Scene, world: CANNON.World) {
    // Cannon Ground Box (thick static box eliminates broadphase raycast clipping of infinite Plane)
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(1000, 10, 1000)),
      position: new CANNON.Vec3(0, -10, 0),
    });
    world.addBody(groundBody);

    // Visual Large Terrain
    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x131d28,
      roughness: 0.95,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Decorative Stadium Floodlight Towers
    const towerPositions = [
      new THREE.Vector3(-40, 0, 40),
      new THREE.Vector3(160, 0, 160),
      new THREE.Vector3(160, 0, -60),
      new THREE.Vector3(-60, 0, -120),
    ];

    towerPositions.forEach((tp) => {
      const tower = new THREE.Group();
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 1.0, 24),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 })
      );
      mast.position.y = 12;
      mast.castShadow = true;

      const lightRack = new THREE.Mesh(
        new THREE.BoxGeometry(6, 2, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      lightRack.position.set(0, 24, 0);

      const spot = new THREE.PointLight(0xffeedd, 3, 120);
      spot.position.set(0, 24, 0);

      tower.add(mast, lightRack, spot);
      tower.position.copy(tp);
      scene.add(tower);
    });
  }
}
