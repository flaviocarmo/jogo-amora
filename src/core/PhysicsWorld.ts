import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  world!: RAPIER.World;
  private initialized = false;

  async init() {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -20, z: 0 });
    this.initialized = true;
  }

  step(dt: number) {
    if (!this.initialized) return;
    this.world.timestep = dt;
    this.world.step();
  }

  createRigidBody(desc: RAPIER.RigidBodyDesc): RAPIER.RigidBody {
    return this.world.createRigidBody(desc);
  }

  createCollider(desc: RAPIER.ColliderDesc, body: RAPIER.RigidBody): RAPIER.Collider {
    return this.world.createCollider(desc, body);
  }

  removeRigidBody(body: RAPIER.RigidBody) {
    this.world.removeRigidBody(body);
  }

  castRay(origin: RAPIER.Vector3, direction: RAPIER.Vector3, maxToi: number): RAPIER.RayColliderHit | null {
    const ray = new RAPIER.Ray(origin, direction);
    return this.world.castRay(ray, maxToi, true);
  }

  get RAPIER() {
    return RAPIER;
  }
}
