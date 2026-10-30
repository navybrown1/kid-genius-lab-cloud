let audioContext = null;
let soundEnabled = true;

export function setSoundEnabled(value) {
  soundEnabled = Boolean(value);
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

const SEQUENCES = {
  tap: [[523.25, 0, 0.07]],
  pop: [[392, 0, 0.06], [523.25, 0.06, 0.08]],
  success: [[523.25, 0, 0.12], [659.25, 0.09, 0.12], [783.99, 0.18, 0.22]],
  levelUp: [[523.25, 0, 0.1], [659.25, 0.09, 0.1], [783.99, 0.18, 0.1], [1046.5, 0.27, 0.35]],
  badge: [[587.33, 0, 0.08], [739.99, 0.07, 0.08], [880, 0.14, 0.08], [1174.66, 0.21, 0.3]],
  error: [[196, 0, 0.12], [155.56, 0.12, 0.18]],
  swoosh: [[300, 0, 0.1], [420, 0.05, 0.12], [620, 0.1, 0.15]],
};

export function playSound(kind = 'tap') {
  if (!soundEnabled) return;
  const audio = getAudioContext();
  if (!audio) return;

  const notes = SEQUENCES[kind] || SEQUENCES.tap;
  const master = audio.createGain();
  master.gain.value = 0.9;
  master.connect(audio.destination);

  notes.forEach(([frequency, delay, duration]) => {
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = kind === 'error' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.075, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  });
}
