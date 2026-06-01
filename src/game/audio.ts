class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmNodes: OscillatorNode[] = [];
  private bgmInterval: ReturnType<typeof setInterval> | null = null;
  private volume = 0.35;
  private muted = false;
  private initialized = false;
  private stressLevel = 0;
  private complianceLevel = 0;

  initAudio(): boolean {
    if (this.initialized) return true;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) this.initAudio();
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setVolume(vol: number, muted?: boolean): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (muted !== undefined) this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  setMood(stress: number, compliance: number): void {
    this.stressLevel = stress / 100;
    this.complianceLevel = compliance / 100;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.15
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain || this.muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain * this.volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playNoise(duration: number, gain = 0.08): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain || this.muted) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * gain;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(this.volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(g);
    g.connect(this.masterGain);
    src.start();
  }

  playTradeBuy(): void {
    this.playTone(440, 0.08, 'square', 0.1);
    this.playTone(660, 0.06, 'sine', 0.08);
  }

  playTradeSell(): void {
    this.playTone(330, 0.1, 'square', 0.1);
    this.playTone(220, 0.08, 'triangle', 0.08);
  }

  playNews(): void {
    this.playTone(880, 0.05, 'sine', 0.06);
    this.playTone(1100, 0.05, 'sine', 0.05);
  }

  playWarning(): void {
    this.playTone(200, 0.15, 'sawtooth', 0.12);
    this.playNoise(0.15, 0.06);
  }

  playBell(): void {
    this.playTone(523, 0.3, 'sine', 0.12);
    this.playTone(784, 0.4, 'sine', 0.1);
    this.playTone(1046, 0.5, 'triangle', 0.08);
  }

  playProfit(): void {
    this.playTone(523, 0.1, 'sine', 0.1);
    this.playTone(659, 0.1, 'sine', 0.1);
    this.playTone(784, 0.15, 'sine', 0.12);
  }

  playLoss(): void {
    this.playTone(392, 0.15, 'triangle', 0.1);
    this.playTone(311, 0.2, 'triangle', 0.1);
  }

  playBoss(): void {
    this.playTone(180, 0.12, 'square', 0.08);
    this.playTone(140, 0.18, 'sawtooth', 0.06);
  }

  startBgm(): void {
    this.stopBgm();
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;

    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.value = 55 + this.stressLevel * 20;
    bassGain.gain.value = 0.04 * this.volume;
    bass.connect(bassGain);
    bassGain.connect(this.masterGain);
    bass.start();
    this.bgmNodes.push(bass);

    const pad = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad.type = 'sine';
    pad.frequency.value = 110;
    padGain.gain.value = 0.02 * this.volume;
    pad.connect(padGain);
    padGain.connect(this.masterGain);
    pad.start();
    this.bgmNodes.push(pad);

    if (this.complianceLevel > 0.5) {
      const alert = ctx.createOscillator();
      const alertGain = ctx.createGain();
      alert.type = 'sawtooth';
      alert.frequency.value = 90;
      alertGain.gain.value = 0.015 * this.complianceLevel * this.volume;
      alert.connect(alertGain);
      alertGain.connect(this.masterGain);
      alert.start();
      this.bgmNodes.push(alert);
    }

    let beat = 0;
    this.bgmInterval = setInterval(() => {
      if (this.muted) return;
      beat++;
      const freq = beat % 4 === 0 ? 80 : 60;
      this.playTone(freq, 0.05, 'square', 0.04 + this.stressLevel * 0.02);
      if (beat % 8 === 0) {
        bass.frequency.value = 55 + this.stressLevel * 30 + Math.sin(beat) * 5;
      }
    }, 480);
  }

  stopBgm(): void {
    for (const node of this.bgmNodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    this.bgmNodes = [];
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  playClosingJingle(): void {
    this.playTone(392, 0.15, 'sine', 0.1);
    this.playTone(494, 0.15, 'sine', 0.1);
    this.playTone(587, 0.25, 'sine', 0.12);
  }
}

export const audioManager = new AudioManagerImpl();

export function initAudio(): boolean {
  return audioManager.initAudio();
}
export function playTradeBuy(): void {
  audioManager.playTradeBuy();
}
export function playTradeSell(): void {
  audioManager.playTradeSell();
}
export function playNews(): void {
  audioManager.playNews();
}
export function playWarning(): void {
  audioManager.playWarning();
}
export function playBell(): void {
  audioManager.playBell();
}
export function playProfit(): void {
  audioManager.playProfit();
}
export function playLoss(): void {
  audioManager.playLoss();
}
export function startBgm(): void {
  audioManager.startBgm();
}
export function stopBgm(): void {
  audioManager.stopBgm();
}
export function setVolume(vol: number, muted?: boolean): void {
  audioManager.setVolume(vol, muted);
}
export function playBoss(): void {
  audioManager.playBoss();
}
