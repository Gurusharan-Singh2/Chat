/**
 * Generates synthetic call audio tones & WhatsApp message sound effects
 * using the Web Audio API without needing external audio files.
 */

let ctx: AudioContext | null = null;
let intervalId: NodeJS.Timeout | null = null;
let isPlaying = false;

function initContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Play WhatsApp-style crisp message sent pop
 */
export function playSentTone() {
  try {
    const audioCtx = initContext();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1150, audioCtx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch {
    // Audio autoplay policy catch
  }
}

/**
 * Play WhatsApp-style incoming message chime
 */
export function playReceivedTone() {
  try {
    const audioCtx = initContext();
    if (!audioCtx) return;

    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(620, audioCtx.currentTime);
    osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.12);
  } catch {
    // Audio autoplay policy catch
  }
}

/**
 * Play an outgoing ringing/calling tone (repeated two-tone pulse)
 */
export function startCallingTone() {
  stopRingtones();
  const audioCtx = initContext();
  if (!audioCtx) return;

  isPlaying = true;

  const playTone = () => {
    if (!isPlaying || !ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440; // A4
      osc2.frequency.value = 480; // B4

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch {
      // Audio catch
    }
  };

  playTone();
  intervalId = setInterval(playTone, 3000);
}

/**
 * Play incoming ringtone (melody pulses to alert the receiver)
 */
export function startIncomingTone() {
  stopRingtones();
  const audioCtx = initContext();
  if (!audioCtx) return;

  isPlaying = true;

  const playChime = () => {
    if (!isPlaying || !ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.0);
    } catch {
      // Audio catch
    }
  };

  playChime();
  intervalId = setInterval(playChime, 2000);
}

/**
 * Play short end-call beep
 */
export function playEndTone() {
  stopRingtones();
  const audioCtx = initContext();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = 350;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Audio catch
  }
}

export function stopRingtones() {
  isPlaying = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Backwards-compatible ringtones object
 */
export const ringtones = {
  playSentTone,
  playReceivedTone,
  startCallingTone,
  startIncomingTone,
  playEndTone,
  stop: stopRingtones,
};
