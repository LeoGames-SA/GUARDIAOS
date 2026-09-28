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
  voiceVolume = 0.5;
  private lastVoice = 0;
  private voices = new Set<OscillatorNode>();
  /** Diagnóstico para pruebas: sílabas pedidas, sonadas y cortes. */
  stats = { requested: 0, played: 0, stops: 0 };

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

  configure(o: {
    enabled: boolean;
    volume: number;
    ambient: boolean;
    ambientVolume: number;
    voiceVolume?: number;
  }) {
    this.enabled = o.enabled;
    if (o.voiceVolume !== undefined) this.voiceVolume = o.voiceVolume;
    if (!o.enabled) this.stopVoice();
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

  /**
   * Murmullo estilizado de voz («blblbl»): una sílaba breve y suave cada varias letras,
   * con tono propio por personaje. Nunca una nota por letra.
   */
  voice(pitch: number, wave: OscillatorType = 'triangle') {
    this.stats.requested++;
    if (!this.ctx || !this.master || !this.enabled || this.voiceVolume <= 0) return;
    const now = this.ctx.currentTime;
    if (now - this.lastVoice < 0.075) return;
    this.lastVoice = now;
    this.stats.played++;
    const f = pitch * (0.88 + Math.random() * 0.26);
    const dur = 0.05 + Math.random() * 0.035;
    const o = this.ctx.createOscillator();
    const band = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f, now);
    o.frequency.linearRampToValueAtTime(f * (0.9 + Math.random() * 0.2), now + dur);
    band.type = 'bandpass';
    band.frequency.value = f * 3.2;
    band.Q.value = 1.4;
    const peak = 0.07 * this.voiceVolume;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(band).connect(g).connect(this.master);
    o.start(now);
    o.stop(now + dur + 0.02);
    this.voices.add(o);
    o.onended = () => this.voices.delete(o);
  }

  /** Corta cualquier murmullo en curso (texto completado, omitido, silencio o espera). */
  stopVoice() {
    this.stats.stops++;
    for (const o of this.voices) {
      try {
        o.stop();
      } catch {
        /* ya detenido */
      }
    }
    this.voices.clear();
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
