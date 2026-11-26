/**
 * audio.ts — Web Audio synthesized SFX + adaptive ambient music + mute toggle (remembered in localStorage).
 * No audio asset files — everything is synthesized at runtime.
 */

export type SfxId =
  | "ui" | "pickup" | "gift" | "heart" | "bell" | "step"
  | "talk" | "notify" | "success" | "fail" | "door" | "stairs"
  | "win" | "lose";

const MUTE_KEY = "game.muted";

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
function writeMuted(v: boolean): void {
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* in-memory only */ }
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private disposed = false;
  muted = false;
  volume = 0.6;

  // music state
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  musicMode: "title" | "day" | "tense" | "ending" | null = null;
  private stepT = 0;

  private readonly unlock = () => { this.ensureCtx(); this.detachUnlock(); };

  constructor() {
    this.muted = readMuted();
    window.addEventListener("pointerdown", this.unlock);
    window.addEventListener("keydown", this.unlock);
  }

  private detachUnlock(): void {
    window.removeEventListener("pointerdown", this.unlock);
    window.removeEventListener("keydown", this.unlock);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detachUnlock();
    this.stopMusic();
    this.master?.disconnect();
    this.master = null;
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume * 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = this.muted ? 0 : v * 0.5;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    writeMuted(this.muted);
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.5;
    return this.muted;
  }

  sfx(id: SfxId): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureCtx();
    if (!this.master) return;
    const t = ctx.currentTime;
    const spec: Record<SfxId, [type: OscillatorType, f0: number, f1: number, dur: number, gain: number]> = {
      ui: ["sine", 520, 640, 0.06, 0.12],
      pickup: ["sine", 660, 990, 0.12, 0.2],
      gift: ["sine", 523, 1046, 0.25, 0.22],
      heart: ["sine", 880, 1320, 0.18, 0.18],
      bell: ["triangle", 880, 870, 1.4, 0.3],
      step: ["triangle", 190, 150, 0.05, 0.05],
      talk: ["sine", 300 + Math.random() * 120, 340, 0.05, 0.07],
      notify: ["sine", 740, 990, 0.14, 0.16],
      success: ["sine", 523, 1046, 0.4, 0.25],
      fail: ["sawtooth", 220, 110, 0.35, 0.18],
      door: ["triangle", 180, 120, 0.15, 0.14],
      stairs: ["triangle", 240, 320, 0.12, 0.1],
      win: ["sine", 523, 1568, 0.7, 0.3],
      lose: ["sawtooth", 220, 55, 0.8, 0.28],
    };
    const [type, f0, f1, dur, g] = spec[id];
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env.gain.setValueAtTime(g, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  /** Footsteps while walking (call each frame; it self-throttles). */
  footsteps(dt: number, moving: boolean, running: boolean): void {
    if (!moving) { this.stepT = 0; return; }
    this.stepT -= dt;
    if (this.stepT <= 0) {
      this.stepT = running ? 0.28 : 0.42;
      this.sfx("step");
    }
  }

  /** Adaptive music: a gentle pentatonic arpeggio whose mood shifts by mode. */
  startMusic(mode: "title" | "day" | "tense" | "ending"): void {
    if (this.disposed) return;
    this.ensureCtx();
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    const scales: Record<string, number[]> = {
      title: [261.6, 293.7, 329.6, 392.0, 440.0, 523.3],
      day: [329.6, 392.0, 440.0, 523.3, 587.3, 659.3],
      tense: [220.0, 246.9, 261.6, 311.1, 329.6],
      ending: [261.6, 329.6, 392.0, 523.3, 659.3, 784.0],
    };
    const scale = scales[mode];
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (this.disposed || this.muted || !this.ctx || !this.master) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;
      // melody note
      const f = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.25 ? 2 : 1);
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = mode === "tense" ? "triangle" : "sine";
      osc.frequency.value = f;
      const dur = mode === "tense" ? 0.5 : 1.6;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(mode === "title" ? 0.055 : 0.045, t + 0.08);
      env.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(env).connect(this.master);
      osc.start(t);
      osc.stop(t + dur);
      // bass every 4 steps
      if (step % 4 === 0) {
        const b = ctx.createOscillator();
        const bg = ctx.createGain();
        b.type = "sine";
        b.frequency.value = f / 4;
        bg.gain.setValueAtTime(0.05, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
        b.connect(bg).connect(this.master);
        b.start(t);
        b.stop(t + 2.2);
      }
      step++;
    }, mode === "tense" ? 420 : 640);
  }

  stopMusic(): void {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    this.musicMode = null;
  }
}
