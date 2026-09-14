import * as THREE from "three";

export interface LightingRig {
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  sunMesh: THREE.Group;
  updateSunPosition: (targetPos: THREE.Vector3) => void;
}

/**
 * Configures complete atmospheric lighting, high-contrast sunlight with soft shadows,
 * hemisphere ambient fill, sky background, lush jungle fog, and a visible sun in the sky.
 */
export function setupLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer): LightingRig {
  // 1. WebGLRenderer Shadow & Tone Mapping Setup
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // 2. Atmosphere: Vibrant Sky Blue Background & Jungle Fog
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0xcce0d0, 0.007);

  // 3. Directional Sun Light (Warm, Golden Sunlight)
  const sunLight = new THREE.DirectionalLight(0xfff4e5, 1.8);
  const sunOffset = new THREE.Vector3(60, 120, 60);
  sunLight.position.copy(sunOffset);
  sunLight.castShadow = true;

  // High-Quality Shadow Map
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1.0;
  sunLight.shadow.camera.far = 400;

  // Shadow Camera Orthographic Frustum Bounds: ±80
  const shadowBounds = 80;
  sunLight.shadow.camera.left = -shadowBounds;
  sunLight.shadow.camera.right = shadowBounds;
  sunLight.shadow.camera.top = shadowBounds;
  sunLight.shadow.camera.bottom = -shadowBounds;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.02;

  scene.add(sunLight);
  scene.add(sunLight.target);

  // 4. Ambient Fill Light: Hemisphere Light (Lifts harsh dark shadows)
  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x332211, 0.7);
  scene.add(hemiLight);

  // 5. Visible Glowing Sun Mesh in the Sky
  const sunMeshGroup = new THREE.Group();

  // Bright Emissive Sun Core
  const coreGeo = new THREE.SphereGeometry(22, 32, 32);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfffbee,
    fog: false,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  sunMeshGroup.add(coreMesh);

  // Translucent Warm Corona / Glow Sphere
  const coronaGeo = new THREE.SphereGeometry(36, 32, 32);
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xffeedd,
    transparent: true,
    opacity: 0.4,
    fog: false,
    side: THREE.BackSide,
  });
  const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
  sunMeshGroup.add(coronaMesh);

  // Halo Glow Disc
  const haloGeo = new THREE.RingGeometry(30, 65, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c8,
    transparent: true,
    opacity: 0.25,
    fog: false,
    side: THREE.DoubleSide,
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.lookAt(new THREE.Vector3(-60, -120, -60));
  sunMeshGroup.add(haloMesh);

  // Position Sun Mesh high in the sky along the sunlight vector
  const sunDistance = 450;
  const sunDir = sunOffset.clone().normalize();
  sunMeshGroup.position.copy(sunDir.clone().multiplyScalar(sunDistance));
  scene.add(sunMeshGroup);

  // 6. Dynamic Shadow Follow Helper (Keeps shadow map & sun centered on player)
  const updateSunPosition = (targetPos: THREE.Vector3) => {
    sunLight.position.copy(targetPos).add(sunOffset);
    sunLight.target.position.copy(targetPos);
    sunLight.target.updateMatrixWorld();

    sunMeshGroup.position.copy(targetPos).addScaledVector(sunDir, sunDistance);
  };

  return {
    sunLight,
    hemiLight,
    sunMesh: sunMeshGroup,
    updateSunPosition,
  };
}
