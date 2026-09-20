export type ChessSoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'victory'
  | 'defeat'
  | 'illegal';

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
}

export function toggleAudioMuted(): boolean {
  isMuted = !isMuted;
  return isMuted;
}

/**
 * Procedural Web Audio synthesizer for tactile chess sound effects.
 * 100% zero external audio asset dependencies.
 */
export function playChessSound(sound: ChessSoundType): void {
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (sound) {
      case 'move': {
        // Crisp wooden tap (sine pitch drop)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case 'capture': {
        // Deep tactile impact with snap
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(240, now);
        osc1.frequency.exponentialRampToValueAtTime(70, now + 0.09);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(140, now);
        osc2.frequency.exponentialRampToValueAtTime(45, now + 0.09);

        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.09);
        osc2.stop(now + 0.09);
        break;
      }

      case 'castle': {
        // Double-tap wooden slide (rook + king)
        for (let i = 0; i < 2; i++) {
          const tapTime = now + i * 0.065;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(280 - i * 40, tapTime);
          osc.frequency.exponentialRampToValueAtTime(110, tapTime + 0.05);

          gain.gain.setValueAtTime(0.2, tapTime);
          gain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.05);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(tapTime);
          osc.stop(tapTime + 0.05);
        }
        break;
      }

      case 'check': {
        // Crystalline dual-harmonic chime
        const freqs = [587.33, 1174.66]; // D5 and D6
        freqs.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.35);
        });
        break;
      }

      case 'victory': {
        // Ascending major fanfare arpeggio: C5, E5, G5, C6
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq, idx) => {
          const noteTime = now + idx * 0.11;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);

          const duration = idx === chord.length - 1 ? 0.6 : 0.25;
          gain.gain.setValueAtTime(0.2, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + duration);
        });
        break;
      }

      case 'defeat': {
        // Descending muted minor cadence: G4 -> Eb4
        const notes = [392.0, 311.13];
        notes.forEach((freq, idx) => {
          const noteTime = now + idx * 0.18;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);

          const duration = 0.38;
          gain.gain.setValueAtTime(0.2, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + duration);
        });
        break;
      }

      case 'illegal': {
        // Low soft thud warning
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
    }
  } catch {
    // Audio errors should never crash gameplay
  }
}
