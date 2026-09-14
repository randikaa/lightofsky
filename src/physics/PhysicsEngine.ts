import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsEngine {
  private static isInitialized = false;
  public world!: RAPIER.World;

  public static async init(): Promise<void> {
    if (!PhysicsEngine.isInitialized) {
      await RAPIER.init();
      PhysicsEngine.isInitialized = true;
    }
  }

  constructor(gravity = { x: 0.0, y: -9.81, z: 0.0 }) {
    if (!PhysicsEngine.isInitialized) {
      throw new Error("PhysicsEngine.init() must be awaited before instantiating PhysicsEngine.");
    }
    this.world = new RAPIER.World(gravity);
  }

  public step() {
    this.world.step();
  }

  public destroy() {
    this.world.free();
  }
}
