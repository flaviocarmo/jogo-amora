import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeMesh } from '@babylonjs/core/Physics/v2/physicsShape';
import { PhysicsShape } from '@babylonjs/core/Physics/v2/physicsShape';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import HavokPhysics from '@babylonjs/havok';

// Side-effect import: patches Scene.prototype with enablePhysics()
import '@babylonjs/core/Physics/v2/physicsEngineComponent';

export class PhysicsWorld {
  private plugin!: HavokPlugin;
  private _scene!: Scene;
  private havokInstance: any = null;

  async init(scene?: Scene): Promise<void> {
    // Only create the WASM instance once (expensive); create a fresh plugin per scene
    if (!this.havokInstance) {
      this.havokInstance = await HavokPhysics();
    }

    if (scene) {
      this._scene = scene;
      // Create a NEW HavokPlugin for each scene — reusing the plugin after
      // scene.dispose() corrupts its internal state (floatingOrigin becomes undefined)
      this.plugin = new HavokPlugin(true, this.havokInstance);
      scene.enablePhysics(new Vector3(0, -18, 0), this.plugin);

      // Configure fixed physics timestep for consistent simulation
      const physicsEngine = scene.getPhysicsEngine();
      if (physicsEngine) {
        physicsEngine.setTimeStep(1 / 60);
      }
    }
  }

  /** Attach physics to an existing scene (used when scene is created separately) */
  enablePhysicsOnScene(scene: Scene): void {
    this._scene = scene;
    this.plugin = new HavokPlugin(true, this.havokInstance);
    scene.enablePhysics(new Vector3(0, -18, 0), this.plugin);

    const physicsEngine = scene.getPhysicsEngine();
    if (physicsEngine) {
      physicsEngine.setTimeStep(1 / 60);
    }
  }

  get scene(): Scene {
    return this._scene;
  }

  get havokPlugin(): HavokPlugin {
    return this.plugin;
  }

  step(_dt: number): void {
    // Havok steps automatically with the Babylon.js scene render loop.
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
}
