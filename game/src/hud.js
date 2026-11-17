// hud.js — HUD numbers, banners, damage numbers, the upgrade draft panel,
// and the menu / end / pause panels.
// One clear job: everything the player reads on screen.
export class Hud {
  constructor() {
    this.scoreEl = document.getElementById('score');
    this.comboEl = document.getElementById('combo');
    this.waveEl = document.getElementById('wave');
    this.bandEl = document.getElementById('band-label');
    this.livesEl = document.getElementById('lives');
    this.bannerEl = document.getElementById('banner');
    this.hudEl = document.getElementById('hud');
    this.menuEl = document.getElementById('menu-panel');
    this.endEl = document.getElementById('end-panel');
    this.endTitleEl = document.getElementById('end-title');
    this.endStatsEl = document.getElementById('end-stats');
    this.pauseEl = document.getElementById('pause-panel');
    this.bossWrap = document.getElementById('boss-wrap');
    this.bossName = document.getElementById('boss-name');
    this.bossBar = document.getElementById('boss-bar');
    this.muteTag = document.getElementById('mute-tag');
    this.menuBest = document.getElementById('menu-best');
    this.comboBar = document.getElementById('combo-bar');
    this.flashEl = document.getElementById('flash');
    this.popupsEl = document.getElementById('popups');
    this.upgLine = document.getElementById('upg-line');
    this.draftEl = document.getElementById('draft-panel');
    this.draftTitle = document.getElementById('draft-title');
    this.draftCards = document.getElementById('draft-cards');
    this.draftSkip = document.getElementById('draft-skip');
    this.powEls = {
      shield: document.getElementById('pow-shield'),
      rapid: document.getElementById('pow-rapid'),
      spread: document.getElementById('pow-spread'),
    };
    this._bannerTimer = null;
    this._popups = [];
  }

  /** A floating label at a screen position (px). kind: 'score' | 'dmg'. */
  popup(x, y, text, kind = 'score', big = false) {
    let el = this._popups.find((p) => p.used === false && p.kind === kind);
    if (!el) {
      if (this._popups.length >= 18) return;
      el = { node: document.createElement('div'), used: false, kind };
      el.node.className = 'popup';
      this.popupsEl.appendChild(el.node);
      this._popups.push(el);
    }
    el.used = true;
    el.kind = kind;
    el.node.textContent = text;
    el.node.classList.toggle('big', big && kind === 'score');
    el.node.classList.toggle('dmg', kind === 'dmg');
    el.node.style.left = `${x}px`;
    el.node.style.top = `${y}px`;
    // Restart the CSS float animation.
    el.node.classList.remove('go');
    void el.node.offsetWidth;
    el.node.classList.add('go');
    const hold = kind === 'dmg' ? 550 : 900;
    setTimeout(() => { el.used = false; el.node.classList.remove('go'); }, hold);
  }

  /** Fraction of combo time left (0..1); hides the bar when the combo ends. */
  setComboTimer(frac) {
    this.comboBar.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    this.comboBar.style.opacity = frac > 0 ? '1' : '0';
  }

  /** A red vignette flash when the ship is hit. */
  flash() {
    this.flashEl.classList.add('on');
    setTimeout(() => this.flashEl.classList.remove('on'), 140);
  }

  showGame() {
    this.hudEl.classList.remove('hidden');
    this.menuEl.classList.add('hidden');
    this.endEl.classList.add('hidden');
    this.draftEl.classList.add('hidden');
  }
  showMenu(best) {
    this.hudEl.classList.add('hidden');
    this.menuEl.classList.remove('hidden');
    this.endEl.classList.add('hidden');
    this.pauseEl.classList.add('hidden');
    this.draftEl.classList.add('hidden');
    this.menuBest.textContent = best > 0 ? `BEST SCORE ${best.toLocaleString('en-US')}` : '';
  }
  showEnd(won, score, wave, kills, upgradesText) {
    this.endEl.classList.remove('hidden');
    this.draftEl.classList.add('hidden');
    this.endTitleEl.textContent = won ? 'SECTOR WON' : 'GAME OVER';
    this.endTitleEl.className = won ? 'win' : 'lose';
    this.endStatsEl.innerHTML =
      `FINAL SCORE &nbsp;<b>${score.toLocaleString('en-US')}</b><br>` +
      `WAVE REACHED &nbsp;<b>${wave} / 10</b> &nbsp;·&nbsp; DRONES DOWN &nbsp;<b>${kills}</b>` +
      (upgradesText ? `<br><span style="font-size:13px;color:#7fa8d8">UPGRADES — ${upgradesText}</span>` : '');
  }
  hideEnd() { this.endEl.classList.add('hidden'); }
  showPause(show) { this.pauseEl.classList.toggle('hidden', !show); }

  /** Open the draft: 3 cards + a skip button. onPick(i) with i 0..2, or -1 to skip. */
  showDraft(wave, offers, taken, onPick) {
    this.draftTitle.textContent = `WAVE ${wave} CLEARED`;
    this.draftCards.innerHTML = '';
    offers.forEach((offer, i) => {
      const card = document.createElement('div');
      card.className = 'draft-card';
      const stack = (taken[offer.id] || 0);
      card.innerHTML =
        `<span class="key">${i + 1}</span><div class="icon">${offer.icon}</div>` +
        `<h3>${offer.name}</h3><p>${offer.desc}</p>` +
        (stack > 0 ? `<div class="stack">OWNED x${stack} → x${stack + 1}</div>` : `<div class="stack">NEW UPGRADE</div>`);
      card.addEventListener('click', () => onPick(i));
      this.draftCards.appendChild(card);
    });
    this.draftSkip.textContent = 'SKIP — TAKE +250 SCORE INSTEAD  (0)';
    this.draftSkip.onclick = () => onPick(-1);
    this.draftEl.classList.remove('hidden');
  }
  hideDraft() { this.draftEl.classList.add('hidden'); }

  setScore(score, combo) {
    this.scoreEl.textContent = score.toLocaleString('en-US');
    this.comboEl.textContent = combo > 1 ? `COMBO x${combo}` : '';
  }
  setWave(wave) { this.waveEl.textContent = `${wave} / 10`; }
  setBand(name) { this.bandEl.textContent = name; }
  setLives(lives) { this.livesEl.textContent = '▲'.repeat(Math.max(0, lives)); }
  setPower(kind, active) { this.powEls[kind].classList.toggle('off', !active); }
  setUpgrades(text) { this.upgLine.textContent = text; }
  setBoss(name, hp, maxHp) {
    if (maxHp <= 0) { this.bossWrap.style.display = 'none'; return; }
    this.bossName.textContent = name;
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
