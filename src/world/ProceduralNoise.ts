import { createNoise2D } from "simplex-noise";

// Deterministic Pseudo-Random Number Generator from seed
function createAlea(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface TerrainSample {
  height: number;
  roadFactor: number;
  isRuinPlateau: boolean;
  slope: number;
  isBeach: boolean;
  isUnderwater: boolean;
  sandFactor: number;
  waterDepth: number;
}

export class ProceduralNoise {
  private noise2D: (x: number, y: number) => number;
  public readonly seed: number;

  // Road configuration
  public readonly roadWidth = 14.0;
  public readonly roadShoulder = 6.0;
  public static readonly OCEAN_LEVEL = 0.0;

  constructor(seed = 42) {
    this.seed = seed;
    const prng = createAlea(seed);
    this.noise2D = createNoise2D(prng);
  }

  /**
   * Continuous analytical race road curve: returns center X position at world Z
   */
  public getRoadCenterX(worldZ: number): number {
    return (
      Math.sin(worldZ * 0.006) * 95.0 +
      Math.sin(worldZ * 0.016) * 40.0 +
      Math.cos(worldZ * 0.0025) * 110.0
    );
  }

  /**
   * Continuous organic coastline X coordinate at world Z
   * Curves naturally to form a wide, sheltered ocean bay near the village (Z in [-100, 100])
   */
  public getCoastlineX(worldZ: number): number {
    const bayIndentation =
      Math.cos(Math.min(Math.PI, Math.max(-Math.PI, (worldZ / 110.0) * Math.PI))) * 14.0;
    return (
      22.0 +
      bayIndentation +
      Math.sin(worldZ * 0.015) * 9.0 +
      Math.cos(worldZ * 0.005) * 5.0
    );
  }

  /**
   * Evaluates terrain elevation, road factor, ruin plateau status, beach/ocean status, and slope at (x, z)
   */
  public evaluate(worldX: number, worldZ: number): TerrainSample {
    // 1. Multi-octave Fractal Brownian Motion (FBM) for natural jungle hills
    let elevation = 0;
    let amplitude = 26.0;
    let frequency = 0.004;

    for (let o = 0; o < 4; o++) {
      elevation += this.noise2D(worldX * frequency, worldZ * frequency) * amplitude;
      amplitude *= 0.45;
      frequency *= 2.1;
    }

    // 2. Carve Endless Winding Racing Road
    const roadCenterX = this.getRoadCenterX(worldZ);
    const distToRoad = Math.abs(worldX - roadCenterX);
    const fullRoadBound = this.roadWidth + this.roadShoulder;
    let roadFactor = 0;

    if (distToRoad < fullRoadBound) {
      const t = Math.max(0, Math.min(1, (distToRoad - this.roadWidth) / this.roadShoulder));
      const smoothBlend = t * t * (3 - 2 * t);
      // Gentle slope for the road bed
      const roadElevation = Math.sin(worldZ * 0.004) * 8.0;
      elevation = roadElevation * (1.0 - smoothBlend) + elevation * smoothBlend;
      roadFactor = 1.0 - t;
    }

    // 3. Medieval Village Plaza Terracing (Along entire settlement Z in [-55, 55], width 35m)
    if (worldZ >= -55 && worldZ <= 55) {
      const crossDist = Math.abs(worldX - roadCenterX);
      if (crossDist < 35.0) {
        const blendCross = Math.cos((crossDist / 35.0) * (Math.PI / 2));
        const absZ = Math.abs(worldZ);
        const blendZ = absZ > 38.0 ? Math.cos(((absZ - 38.0) / 17.0) * (Math.PI / 2)) : 1.0;
        const totalPlazaBlend = blendCross * blendZ;

        const streetElevation = Math.sin(worldZ * 0.004) * 8.0;
        elevation = elevation * (1.0 - totalPlazaBlend) + streetElevation * totalPlazaBlend;
      }
    }

    // 4. Coastline, Golden Beach Dunes, and Ocean Bay (towards west / lower X)
    const coastX = this.getCoastlineX(worldZ);
    let sandFactor = 0;
    const isBeachTrail = Math.abs(worldZ) < 18.0 && worldX >= coastX && worldX <= 88.0;

    if (worldX < coastX) {
      // Deep & Shallow Ocean Bay
      const oceanDist = coastX - worldX;
      const seaBed = -Math.min(
        9.0,
        Math.pow(oceanDist * 0.12, 1.1) +
          Math.sin(worldX * 0.05 + worldZ * 0.04) * 0.5 -
          0.5
      );
      const blend = Math.min(1.0, oceanDist / 10.0);
      elevation = elevation * (1.0 - blend) + seaBed * blend;
      sandFactor = Math.max(0, 1.0 - oceanDist / 14.0);
    } else if (worldX < coastX + 28.0) {
      // Sandy Beach Dunes
      const beachDist = worldX - coastX;
      const t = beachDist / 28.0;
      sandFactor = Math.max(0, 1.0 - t * 0.85);
      const duneH = Math.pow(t, 1.3) * 4.5 + Math.sin(worldX * 0.07 + worldZ * 0.06) * 0.4;
      elevation = elevation * t + duneH * (1.0 - t);
    } else if (isBeachTrail) {
      // Natural walking path connecting Village Plaza (X=88) to the Beach (X=coastX)
      const trailT = (worldX - coastX) / (88.0 - coastX);
      const trailH = 1.0 + trailT * 6.5;
      const trailBlend = Math.cos((Math.abs(worldZ) / 18.0) * (Math.PI / 2));
      elevation = elevation * (1.0 - trailBlend) + trailH * trailBlend;
      sandFactor = Math.max(sandFactor, trailBlend * 0.7);
    }

    const isUnderwater = elevation < -0.15;
    const waterDepth = Math.max(0, -elevation);
    const isBeach = sandFactor > 0.35 && elevation >= -1.2 && elevation <= 6.0;

    // 5. Ancient Ruins Plateaus (Spawns clusters of stepped stone temple terraces on dry land only)
    const ruinNoise = this.noise2D(worldX * 0.0025 + 150, worldZ * 0.0025 + 150);
    const isRuinPlateau =
      ruinNoise > 0.48 &&
      roadFactor < 0.08 &&
      Math.abs(worldZ) > 55 &&
      !isBeach &&
      !isUnderwater;

    if (isRuinPlateau) {
      elevation = Math.round(elevation / 4.0) * 4.0 + 2.0; // Stepped stone terrace
    }

    // 6. Slope estimation via finite difference
    const delta = 1.0;
    const hR = this.sampleRawElevation(worldX + delta, worldZ);
    const hU = this.sampleRawElevation(worldX, worldZ + delta);
    const slope = Math.sqrt(Math.pow(hR - elevation, 2) + Math.pow(hU - elevation, 2)) / delta;

    return {
      height: elevation,
      roadFactor,
      isRuinPlateau,
      slope,
      isBeach,
      isUnderwater,
      sandFactor,
      waterDepth,
    };
  }

  private sampleRawElevation(x: number, z: number): number {
    let e = 0,
      a = 26.0,
      f = 0.004;
    for (let o = 0; o < 4; o++) {
      e += this.noise2D(x * f, z * f) * a;
      a *= 0.45;
      f *= 2.1;
    }
    return e;
  }
}
