export class InputManager {
  readonly keys = new Set<string>();
  private justPressed = new Set<string>();
  private prevKeys = new Set<string>();

  mouseX = 0;
  mouseY = 0;
  mouseDX = 0;
  mouseDY = 0;
  isPointerLocked = false;

  // Touch state
  private isMobile = false;
  private joystickTouch: { id: number; startX: number; startY: number } | null = null;
  private cameraTouch: { id: number; lastX: number; lastY: number } | null = null;

  // Virtual joystick axis values (-1 to 1)
  private _joystickForward = 0;
  private _joystickRight = 0;

  // Touch button state
  private _touchJump = false;
  private _touchBark = false;
  private _touchSuperPressed = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && !this.isMobile) {
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

    // Detect mobile / touch device
    this.isMobile = 'ontouchstart' in window;

    if (this.isMobile) {
      this._initTouchControls();
    }
  }

  private _initTouchControls() {
    const touchControlsEl = document.getElementById('touch-controls');
    if (touchControlsEl) {
      touchControlsEl.style.display = 'block';
    }

    // Wire up touch buttons
    document.getElementById('touch-jump')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._touchJump = true;
    }, { passive: false });

    document.getElementById('touch-bark')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._touchBark = true;
    }, { passive: false });

    document.getElementById('touch-cookie')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._touchSuperPressed = true;
    }, { passive: false });

    // Global touch handlers for joystick and camera
    document.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
    document.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
  }

  private _isButtonElement(target: EventTarget | null): boolean {
    if (!target) return false;
    const el = target as Element;
    return el.closest('#touch-buttons') !== null;
  }

  private _onTouchStart(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Skip if this touch started on a button element (handled separately)
      if (this._isButtonElement(touch.target)) continue;

      const screenHalf = window.innerWidth / 2;

      if (touch.clientX < screenHalf) {
        // Left half -> joystick
        if (!this.joystickTouch) {
          this.joystickTouch = { id: touch.identifier, startX: touch.clientX, startY: touch.clientY };
          this._updateJoystickThumb(touch.clientX, touch.clientY);
        }
      } else {
        // Right half -> camera drag
        if (!this.cameraTouch) {
          this.cameraTouch = { id: touch.identifier, lastX: touch.clientX, lastY: touch.clientY };
        }
      }
    }
  }

  private _onTouchMove(e: TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (this.joystickTouch && touch.identifier === this.joystickTouch.id) {
        const dx = touch.clientX - this.joystickTouch.startX;
        const dy = touch.clientY - this.joystickTouch.startY;
        const maxRadius = 50;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        this._joystickRight = (clampedDist / maxRadius) * Math.cos(angle);
        // Negate Y because screen Y is inverted relative to forward movement
        this._joystickForward = -(clampedDist / maxRadius) * Math.sin(angle);

        // Move thumb visual
        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;
        this._updateJoystickThumb(
          this.joystickTouch.startX + thumbX,
          this.joystickTouch.startY + thumbY
        );
      }

      if (this.cameraTouch && touch.identifier === this.cameraTouch.id) {
        const dx = touch.clientX - this.cameraTouch.lastX;
        const dy = touch.clientY - this.cameraTouch.lastY;
        this.mouseDX += dx * 1.5;
        this.mouseDY += dy * 1.5;
        this.cameraTouch.lastX = touch.clientX;
        this.cameraTouch.lastY = touch.clientY;
      }
    }
  }

  private _onTouchEnd(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (this.joystickTouch && touch.identifier === this.joystickTouch.id) {
        this.joystickTouch = null;
        this._joystickForward = 0;
        this._joystickRight = 0;
        this._resetJoystickThumb();
      }

      if (this.cameraTouch && touch.identifier === this.cameraTouch.id) {
        this.cameraTouch = null;
      }
    }
  }

  private _updateJoystickThumb(absX: number, absY: number) {
    const thumb = document.getElementById('joystick-thumb');
    const area = document.getElementById('joystick-area');
    if (!thumb || !area) return;
    const rect = area.getBoundingClientRect();
    const localX = absX - rect.left - 30; // 30 = half of 60px thumb
    const localY = absY - rect.top - 30;
    thumb.style.left = `${localX}px`;
    thumb.style.top = `${localY}px`;
  }

  private _resetJoystickThumb() {
    const thumb = document.getElementById('joystick-thumb');
    if (thumb) {
      thumb.style.left = '40px';
      thumb.style.top = '40px';
    }
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
    // Reset one-shot touch inputs after they are consumed
    this._touchJump = false;
    this._touchBark = false;
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  get moveForward(): number {
    const keyboard = (this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0) -
                     (this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0);
    return keyboard !== 0 ? keyboard : this._joystickForward;
  }

  get moveRight(): number {
    const keyboard = (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0) -
                     (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0);
    return keyboard !== 0 ? keyboard : this._joystickRight;
  }

  get jump(): boolean {
    return this.wasPressed('Space') || this._touchJump;
  }

  get bark(): boolean {
    return this.wasPressed('KeyE') || this._touchBark;
  }

  get isSuperPressed(): boolean {
    if (this._touchSuperPressed) {
      this._touchSuperPressed = false;
      return true;
    }
    return this.isDown('KeyQ');
  }
}
