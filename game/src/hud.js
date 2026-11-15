// hud.js — HUD numbers, banners, menu / end / pause panels.
// One clear job: everything the player reads on screen.
export class Hud {
  constructor() {
    this.scoreEl = document.getElementById('score');
    this.comboEl = document.getElementById('combo');
    this.waveEl = document.getElementById('wave');
    this.livesEl = document.getElementById('lives');
    this.bannerEl = document.getElementById('banner');
    this.hudEl = document.getElementById('hud');
    this.menuEl = document.getElementById('menu-panel');
    this.endEl = document.getElementById('end-panel');
    this.endTitleEl = document.getElementById('end-title');
    this.endStatsEl = document.getElementById('end-stats');
    this.pauseEl = document.getElementById('pause-panel');
    this.bossWrap = document.getElementById('boss-wrap');
    this.bossBar = document.getElementById('boss-bar');
    this.muteTag = document.getElementById('mute-tag');
    this.menuBest = document.getElementById('menu-best');
    this.powEls = {
      shield: document.getElementById('pow-shield'),
      rapid: document.getElementById('pow-rapid'),
      spread: document.getElementById('pow-spread'),
    };
    this._bannerTimer = null;
  }

  showGame() { this.hudEl.classList.remove('hidden'); this.menuEl.classList.add('hidden'); this.endEl.classList.add('hidden'); }
  showMenu(best) {
    this.hudEl.classList.add('hidden');
    this.menuEl.classList.remove('hidden');
    this.endEl.classList.add('hidden');
    this.pauseEl.classList.add('hidden');
    this.menuBest.textContent = best > 0 ? `BEST SCORE ${best.toLocaleString('en-US')}` : '';
  }
  showEnd(won, score, wave, kills) {
    this.endEl.classList.remove('hidden');
    this.endTitleEl.textContent = won ? 'SECTOR WON' : 'GAME OVER';
    this.endTitleEl.className = won ? 'win' : 'lose';
    this.endStatsEl.innerHTML =
      `FINAL SCORE &nbsp;<b>${score.toLocaleString('en-US')}</b><br>` +
      `WAVE REACHED &nbsp;<b>${wave} / 10</b> &nbsp;·&nbsp; DRONES DOWN &nbsp;<b>${kills}</b>`;
  }
  hideEnd() { this.endEl.classList.add('hidden'); }
  showPause(show) { this.pauseEl.classList.toggle('hidden', !show); }

  setScore(score, combo) {
    this.scoreEl.textContent = score.toLocaleString('en-US');
    this.comboEl.textContent = combo > 1 ? `COMBO x${combo}` : '';
  }
  setWave(wave) { this.waveEl.textContent = `${wave} / 10`; }
  setLives(lives) { this.livesEl.textContent = '▲'.repeat(Math.max(0, lives)); }
  setPower(kind, active) { this.powEls[kind].classList.toggle('off', !active); }
  setBoss(hp, maxHp) {
    if (maxHp <= 0) { this.bossWrap.style.display = 'none'; return; }
    this.bossWrap.style.display = 'block';
    this.bossBar.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
  }
  hideBoss() { this.bossWrap.style.display = 'none'; }
  setMuted(muted) { this.muteTag.textContent = muted ? 'MUTED (M)' : ''; }

  banner(text, sub = '', ms = 1800) {
    this.bannerEl.innerHTML = sub ? `${text}<small>${sub}</small>` : text;
    this.bannerEl.style.opacity = '1';
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => { this.bannerEl.style.opacity = '0'; }, ms);
  }

  clearBanner() {
    clearTimeout(this._bannerTimer);
    this.bannerEl.style.opacity = '0';
  }
}
