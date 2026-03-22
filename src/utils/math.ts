export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothDamp(current: number, target: number, speed: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-speed * dt));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function distanceXZ(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function angleBetween(ax: number, az: number, bx: number, bz: number): number {
  return Math.atan2(bx - ax, bz - az);
}
