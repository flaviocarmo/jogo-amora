export class AudioManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playJump() {
    this.playTone(300, 0.1, 'square', 0.1);
    setTimeout(() => this.playTone(500, 0.15, 'square', 0.1), 50);
  }

  playStomp() {
    this.playTone(200, 0.1, 'square', 0.15);
    this.playTone(400, 0.15, 'sawtooth', 0.1);
  }

  playBark() {
    const ctx = this.getCtx();
    // Noise burst for bark
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.playTone(150, 0.2, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(120, 0.15, 'sawtooth', 0.1), 100);
  }

  playDamage() {
    this.playTone(200, 0.15, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(100, 0.2, 'sawtooth', 0.1), 80);
  }

  playCollect() {
    this.playTone(600, 0.1, 'sine', 0.12);
    setTimeout(() => this.playTone(800, 0.1, 'sine', 0.12), 80);
    setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.1), 160);
  }

  playHeal() {
    this.playTone(400, 0.15, 'sine', 0.1);
    setTimeout(() => this.playTone(600, 0.15, 'sine', 0.1), 100);
    setTimeout(() => this.playTone(800, 0.2, 'sine', 0.1), 200);
  }

  playBossAppear() {
    this.playTone(100, 0.3, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(80, 0.4, 'sawtooth', 0.15), 200);
    setTimeout(() => this.playTone(60, 0.5, 'sawtooth', 0.15), 400);
  }

  playVictory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.12), i * 150);
    });
  }

  playGameOver() {
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sawtooth', 0.1), i * 200);
    });
  }

  playPowerReady() {
    this.playTone(800, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(1200, 0.15, 'sine', 0.1), 100);
  }

  playLevelComplete() {
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.25, 'sine', 0.1), i * 120);
    });
  }
}
