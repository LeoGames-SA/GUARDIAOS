/**
 * Sonidos sintetizados (sin archivos de terceros). Nunca suenan antes de una
 * interacción del usuario y respetan volumen/silencio. El sonido no altera reglas.
 */
type Cue = 'ring' | 'notify' | 'click' | 'confirm' | 'error';

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rain: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private last = new Map<Cue, number>();
  private unlocked = false;
  enabled = true;
  volume = 0.6;
  ambientVolume = 0.3;
  ambientWanted = false;

  /** Llamar desde un gesto del usuario. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.syncAmbient();
    } catch {
      this.ctx = null;
    }
  }

  configure(o: { enabled: boolean; volume: number; ambient: boolean; ambientVolume: number }) {
    this.enabled = o.enabled;
    this.volume = o.volume;
    this.ambientVolume = o.ambientVolume;
    this.ambientWanted = o.ambient;
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
    this.syncAmbient();
  }

  /** Pausa el ambiente con la pestaña oculta. */
  setHidden(hidden: boolean) {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  play(cue: Cue) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const now = this.ctx.currentTime;
    const prev = this.last.get(cue) ?? -1;
    if (now - prev < (cue === 'ring' ? 1.5 : 0.12)) return; // evitar avisos superpuestos
    this.last.set(cue, now);
    const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.2) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(gain, now + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g).connect(this.master!);
      o.start(now + start);
      o.stop(now + start + dur + 0.02);
    };
    switch (cue) {
      case 'ring':
        for (let i = 0; i < 2; i++) {
          tone(880, i * 0.45, 0.35, 'square', 0.06);
          tone(1100, i * 0.45 + 0.02, 0.33, 'square', 0.05);
        }
        break;
      case 'notify':
        tone(660, 0, 0.18, 'sine', 0.15);
        tone(990, 0.12, 0.22, 'sine', 0.12);
        break;
      case 'click':
        tone(1800, 0, 0.03, 'triangle', 0.05);
        break;
      case 'confirm':
        tone(523, 0, 0.15, 'sine', 0.15);
        tone(784, 0.1, 0.25, 'sine', 0.13);
        break;
      case 'error':
        tone(220, 0, 0.2, 'sawtooth', 0.06);
        break;
    }
  }

  private syncAmbient() {
    if (!this.ctx || !this.master) return;
    const want = this.ambientWanted && this.enabled;
    if (want && !this.rain) {
      const len = this.ctx.sampleRate * 3;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) {
        b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); // ruido suavizado: lluvia lejana
        data[i] = b * 3;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      const gain = this.ctx.createGain();
      gain.gain.value = this.ambientVolume * 0.5;
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      this.rain = { src, gain };
    } else if (!want && this.rain) {
      this.rain.src.stop();
      this.rain = null;
    } else if (this.rain) this.rain.gain.gain.value = this.ambientVolume * 0.5;
  }
}

export const sound = new Sound();
