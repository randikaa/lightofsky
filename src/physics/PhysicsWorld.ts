import * as CANNON from "cannon-es";

export class PhysicsWorld {
  public world: CANNON.World;
  public groundMaterial: CANNON.Material;
  public wheelMaterial: CANNON.Material;
  public chassisMaterial: CANNON.Material;
  public barrierMaterial: CANNON.Material;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    // Broadphase optimization for fast collision checks
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 10;
    this.world.allowSleep = true;

    // Materials
    this.groundMaterial = new CANNON.Material("groundMaterial");
    this.wheelMaterial = new CANNON.Material("wheelMaterial");
    this.chassisMaterial = new CANNON.Material("chassisMaterial");
    this.barrierMaterial = new CANNON.Material("barrierMaterial");

    // Wheel <-> Ground contact material: High friction for grip, tuned for responsive arcade/sim racing
    const wheelGroundContact = new CANNON.ContactMaterial(this.wheelMaterial, this.groundMaterial, {
      friction: 0.8,
      restitution: 0.05,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3,
    });
    this.world.addContactMaterial(wheelGroundContact);

    // Chassis <-> Barrier contact material: Low friction so cars slide along rails rather than sticking
    const chassisBarrierContact = new CANNON.ContactMaterial(this.chassisMaterial, this.barrierMaterial, {
      friction: 0.1,
      restitution: 0.3,
    });
    this.world.addContactMaterial(chassisBarrierContact);

    // Chassis <-> Ground contact
    const chassisGroundContact = new CANNON.ContactMaterial(this.chassisMaterial, this.groundMaterial, {
      friction: 0.3,
      restitution: 0.1,
    });
    this.world.addContactMaterial(chassisGroundContact);
  }

  public step(deltaTime: number) {
    // Fixed 60Hz physics substepping
    this.world.step(1 / 60, Math.min(deltaTime, 0.1), 3);
  }
}
