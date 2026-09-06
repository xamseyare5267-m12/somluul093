// Web Audio API Synthesizer for Calling Ringtone, Notification Sounds, & Beeps

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not supported or restricted', e);
    return null;
  }
}

/**
 * Play standard WhatsApp style dual-tone calling ringtone continuously.
 * Returns a controller object to stop the ringtone when answered/ended cleanly.
 */
export function playRingtoneSound(): { stop: () => void } {
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.warn('AudioContext resume warn:', e));
  }

  let isPlaying = true;
  let timerId: any = null;
  const activeNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];

  const playRingCycle = () => {
    if (!isPlaying || !ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;

      // WhatsApp / European standard dual ring frequency: 440Hz + 480Hz
      const createTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Gentle attack/decay envelope to avoid clicking or popping
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gain.gain.setValueAtTime(0.1, startTime + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);

        activeNodes.push({ osc, gain });
      };

      // Smooth phone ring pulse: 1.4s dual tone (440Hz + 480Hz)
      createTone(440, now, 1.4);
      createTone(480, now, 1.4);
    } catch (e) {
      console.warn('Error playing ring cycle', e);
    }
  };

  // Immediate ring
  playRingCycle();

  // Repeat cycle every 3.0 seconds cleanly
  timerId = setInterval(() => {
    if (isPlaying) {
      playRingCycle();
    }
  }, 3000);

  return {
    stop: () => {
      isPlaying = false;
      if (timerId) clearInterval(timerId);
      if (ctx && ctx.state === 'running') {
        try {
          const now = ctx.currentTime;
          activeNodes.forEach(({ osc, gain }) => {
            try {
              gain.gain.cancelScheduledValues(now);
              gain.gain.linearRampToValueAtTime(0, now + 0.04);
              setTimeout(() => {
                try {
                  osc.stop();
                  osc.disconnect();
                } catch (_) {}
              }, 50);
            } catch (_) {}
          });
        } catch (_) {}
      }
      activeNodes.length = 0;
    }
  };
}

/**
 * Play a pleasant message notification sound (WhatsApp/Telegram-like pop chime).
 */
export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Tone progression: 784Hz (G5) -> 1046.5Hz (C6)
    osc1.frequency.setValueAtTime(784, now);
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.08);

    osc2.frequency.setValueAtTime(1174.6, now + 0.04);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.warn('Error playing notification sound', e);
  }
}

/**
 * Play call connected confirmation chime.
 */
export function playCallConnectedSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  } catch (e) {
    console.warn('Error playing connected sound', e);
  }
}

/**
 * Play call ended tone.
 */
export function playCallEndedSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const freqs = [440, 330]; // Descending A4 -> E4

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.12);

      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.2);
    });
  } catch (e) {
    console.warn('Error playing call ended sound', e);
  }
}

/**
 * Play audible voice note tone sequence for voice-note UI feedback.
 * Returns a controller object to stop playback immediately if paused.
 */
export function playVoiceNoteTone(durationSecs: number, onEnded?: () => void): { stop: () => void } {
  const ctx = getAudioContext();
  if (!ctx) {
    if (onEnded) setTimeout(onEnded, durationSecs * 1000);
    return { stop: () => {} };
  }

  let isPlaying = true;
  let timerId: any = null;

  try {
    const now = ctx.currentTime;
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 392.00, 329.63]; // Natural vocal speech harmonics C4-A4
    const noteDuration = 0.25;
    const totalDuration = Math.max(2, durationSecs);

    let count = 0;
    const interval = setInterval(() => {
      if (!isPlaying || !ctx || ctx.state === 'closed') {
        clearInterval(interval);
        return;
      }

      if (count * noteDuration >= totalDuration) {
        clearInterval(interval);
        isPlaying = false;
        if (onEnded) onEnded();
        return;
      }

      const noteFreq = notes[count % notes.length];
      const startTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Soft warm vocal pitch timbre
      osc.frequency.setValueAtTime(noteFreq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration - 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);

      count++;
    }, noteDuration * 1000);

    timerId = interval;
  } catch (e) {
    console.warn('Error playing voice note tone:', e);
  }

  return {
    stop: () => {
      isPlaying = false;
      if (timerId) clearInterval(timerId);
    }
  };
}

/**
 * Play voice note recording start/stop beep.
 */
export function playVoiceBeep(type: 'start' | 'stop') {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = type === 'start' ? 880 : 440;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {
    console.warn('Error playing voice beep', e);
  }
}

/** Global mute for notification chimes (persisted) */
export function isNotificationSoundMuted(): boolean {
  try {
    return localStorage.getItem('somluul_notif_sound_muted') === '1';
  } catch {
    return false;
  }
}

export function setNotificationSoundMuted(muted: boolean) {
  try {
    localStorage.setItem('somluul_notif_sound_muted', muted ? '1' : '0');
  } catch {}
}

function playToneSequence(
  notes: Array<{ freq: number; dur: number; type?: OscillatorType; vol?: number }>,
  gap = 0.02
) {
  if (isNotificationSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    let t = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type || 'sine';
      osc.frequency.setValueAtTime(n.freq, t);
      const vol = n.vol ?? 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.dur + 0.02);
      t += n.dur + gap;
    }
  } catch (e) {
    console.warn('tone sequence error', e);
  }
}

/** Distinct sounds per notification type */
export function playNotifByType(type: string) {
  if (isNotificationSoundMuted()) return;
  switch (type) {
    case 'message':
      playToneSequence([
        { freq: 880, dur: 0.08 },
        { freq: 1175, dur: 0.12 },
      ]);
      break;
    case 'call':
    case 'incoming_call':
      // short attention blip; full ring uses playRingtoneSound
      playToneSequence([
        { freq: 440, dur: 0.15, type: 'triangle' },
        { freq: 554, dur: 0.15, type: 'triangle' },
        { freq: 659, dur: 0.2, type: 'triangle' },
      ]);
      break;
    case 'follow':
    case 'friend_request':
      playToneSequence([
        { freq: 523, dur: 0.1 },
        { freq: 659, dur: 0.1 },
        { freq: 784, dur: 0.15 },
      ]);
      break;
    case 'like':
    case 'love':
      playToneSequence([{ freq: 988, dur: 0.08, vol: 0.12 }, { freq: 1319, dur: 0.1, vol: 0.1 }]);
      break;
    case 'comment':
      playToneSequence([{ freq: 698, dur: 0.1 }, { freq: 880, dur: 0.12 }]);
      break;
    case 'share':
      playToneSequence([{ freq: 392, dur: 0.08 }, { freq: 523, dur: 0.08 }, { freq: 659, dur: 0.12 }]);
      break;
    case 'gift':
    case 'order':
      playToneSequence([
        { freq: 523, dur: 0.08 },
        { freq: 659, dur: 0.08 },
        { freq: 784, dur: 0.08 },
        { freq: 1047, dur: 0.2 },
      ]);
      break;
    case 'live':
      playToneSequence([
        { freq: 440, dur: 0.1, type: 'square', vol: 0.08 },
        { freq: 880, dur: 0.15, type: 'square', vol: 0.1 },
      ]);
      break;
    default:
      playNotificationSound();
  }
}
