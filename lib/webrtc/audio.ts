/**
 * Generates synthetic call audio tones (ringing tone, dial tone, hangup beep)
 * using the Web Audio API without needing external audio files.
 */

class RingtoneManager {
  private ctx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isPlaying = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Play an outgoing ringing/calling tone (repeated two-tone pulse)
   */
  public startCallingTone() {
    this.stop();
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;

    const playTone = () => {
      if (!this.isPlaying || !this.ctx) return;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.value = 440; // A4
      osc2.frequency.value = 480; // B4

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 1.2);
      osc2.stop(this.ctx.currentTime + 1.2);
    };

    playTone();
    this.intervalId = setInterval(playTone, 3000);
  }

  /**
   * Play incoming ringtone (melody pulses to alert the receiver)
   */
  public startIncomingTone() {
    this.stop();
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;

    const playChime = () => {
      if (!this.isPlaying || !this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.2); // A5

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.0);
    };

    playChime();
    this.intervalId = setInterval(playChime, 2000);
  }

  /**
   * Play short end-call beep
   */
  public playEndTone() {
    this.stop();
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.value = 350;
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const ringtones = new RingtoneManager();
