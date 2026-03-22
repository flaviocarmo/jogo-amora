export class InputManager {
  readonly keys = new Set<string>();
  private justPressed = new Set<string>();
  private prevKeys = new Set<string>();

  mouseX = 0;
  mouseY = 0;
  mouseDX = 0;
  mouseDY = 0;
  isPointerLocked = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
  }

  update() {
    this.justPressed.clear();
    for (const key of this.keys) {
      if (!this.prevKeys.has(key)) {
        this.justPressed.add(key);
      }
    }
    this.prevKeys = new Set(this.keys);
  }

  afterUpdate() {
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  get moveForward(): number {
    return (this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0) -
           (this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0);
  }

  get moveRight(): number {
    return (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0) -
           (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0);
  }

  get jump(): boolean {
    return this.wasPressed('Space');
  }

  get bark(): boolean {
    return this.wasPressed('KeyE');
  }
}
