export class HUD {
  private heartsEl: HTMLElement;
  private powerFill: HTMLElement;
  private powerLabel: HTMLElement;
  private damageFlash: HTMLElement;
  private bossContainer: HTMLElement;
  private bossNameEl: HTMLElement;
  private bossHealthFill: HTMLElement;
  private superFill: HTMLElement;
  private superLabel: HTMLElement;
  private levelTransition: HTMLElement;

  constructor() {
    this.heartsEl = document.getElementById('hearts')!;
    this.powerFill = document.getElementById('power-bar-fill')!;
    this.powerLabel = document.getElementById('power-label')!;
    this.damageFlash = document.getElementById('damage-flash')!;
    this.bossContainer = document.getElementById('boss-health-container')!;
    this.bossNameEl = document.getElementById('boss-name')!;
    this.bossHealthFill = document.getElementById('boss-health-fill')!;
    this.levelTransition = document.getElementById('level-transition')!;
    this.superFill = document.getElementById('super-bar-fill')!;
    this.superLabel = document.getElementById('super-label')!;
  }

  updateHearts(current: number, max: number) {
    let html = '';
    for (let i = 0; i < max; i++) {
      const isFull = i < current;
      html += `<div class="heart ${isFull ? '' : 'lost'}">${isFull ? '\u2764\uFE0F' : '\u{1F5A4}'}</div>`;
    }
    this.heartsEl.innerHTML = html;
  }

  updatePowerBar(percent: number, isReady: boolean) {
    this.powerFill.style.width = `${percent * 100}%`;
    if (isReady) {
      this.powerFill.classList.add('ready');
      this.powerLabel.classList.add('visible');
    } else {
      this.powerFill.classList.remove('ready');
      this.powerLabel.classList.remove('visible');
    }
  }

  updateSuperBar(percent: number, isReady: boolean) {
    this.superFill.style.width = `${percent * 100}%`;
    if (isReady) {
      this.superFill.classList.add('ready');
      this.superLabel.classList.add('visible');
    } else {
      this.superFill.classList.remove('ready');
      this.superLabel.classList.remove('visible');
    }
  }

  flashDamage() {
    this.damageFlash.style.opacity = '1';
    setTimeout(() => {
      this.damageFlash.style.opacity = '0';
    }, 150);
  }

  showBossHealth(name: string, healthPercent: number) {
    this.bossContainer.classList.add('visible');
    this.bossNameEl.textContent = name;
    this.bossHealthFill.style.width = `${healthPercent * 100}%`;
  }

  hideBossHealth() {
    this.bossContainer.classList.remove('visible');
  }

  async showLevelTransition(text: string): Promise<void> {
    this.levelTransition.textContent = text;
    this.levelTransition.style.opacity = '1';
    await new Promise(r => setTimeout(r, 2000));
    this.levelTransition.style.opacity = '0';
    await new Promise(r => setTimeout(r, 500));
  }

  showMenu() {
    document.getElementById('menu-screen')!.style.display = 'flex';
  }

  hideMenu() {
    document.getElementById('menu-screen')!.style.display = 'none';
  }

  showGameOver() {
    const el = document.getElementById('game-over-screen')!;
    el.style.display = 'flex';
  }

  hideGameOver() {
    document.getElementById('game-over-screen')!.style.display = 'none';
  }

  showVictory() {
    const el = document.getElementById('victory-screen')!;
    el.style.display = 'flex';
  }

  hideVictory() {
    document.getElementById('victory-screen')!.style.display = 'none';
  }
}
