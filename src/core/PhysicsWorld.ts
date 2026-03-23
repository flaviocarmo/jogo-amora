import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeMesh } from '@babylonjs/core/Physics/v2/physicsShape';
import { PhysicsShape } from '@babylonjs/core/Physics/v2/physicsShape';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Ray } from '@babylonjs/core/Culling/ray';
import HavokPhysics from '@babylonjs/havok';

// Side-effect import: patches Scene.prototype with enablePhysics()
import '@babylonjs/core/Physics/v2/physicsEngineComponent';

export class PhysicsWorld {
  private plugin!: HavokPlugin;
  private _scene!: Scene;

  async init(scene?: Scene): Promise<void> {
    const havokInstance = await HavokPhysics();
    this.plugin = new HavokPlugin(true, havokInstance);

    if (scene) {
      this._scene = scene;
      scene.enablePhysics(new Vector3(0, -20, 0), this.plugin);
    }
  }

  /** Attach physics to an existing scene (used when scene is created separately) */
  enablePhysicsOnScene(scene: Scene): void {
    this._scene = scene;
    scene.enablePhysics(new Vector3(0, -20, 0), this.plugin);
  }

  get scene(): Scene {
    return this._scene;
  }

  get havokPlugin(): HavokPlugin {
    return this.plugin;
  }

  step(_dt: number): void {
    // Havok steps automatically with the Babylon.js scene render loop.
    // This method is kept for API compatibility.
  }

  createDynamicBody(node: TransformNode, shape: PhysicsShape, mass = 1): PhysicsBody {
    const body = new PhysicsBody(node, PhysicsMotionType.DYNAMIC, false, this._scene);
    body.shape = shape;
    body.setMassProperties({ mass });
    return body;
  }

  createStaticBody(mesh: Mesh): PhysicsBody {
    const body = new PhysicsBody(mesh, PhysicsMotionType.STATIC, false, this._scene);
    const shape = new PhysicsShapeMesh(mesh, this._scene);
    body.shape = shape;
    return body;
  }

  removeBody(body: PhysicsBody): void {
    body.dispose();
  }

  castRay(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxDistance: number,
  ) {
    const ray = new Ray(
      new Vector3(origin.x, origin.y, origin.z),
      new Vector3(direction.x, direction.y, direction.z),
      maxDistance,
    );
    const hit = this._scene.pickWithRay(ray);
    return hit?.hit ? hit : null;
  }
}
