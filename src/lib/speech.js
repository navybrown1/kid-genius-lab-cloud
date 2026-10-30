function cleanForSpeech(text = '') {
  return String(text)
    .replace(/[*_#>`~]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkText(text, maxLength = 220) {
  const sentences = text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    if (current && current.length + piece.length > maxLength) {
      chunks.push(current.trim());
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function speak(text, { rate = 0.94, pitch = 1.04, onEnd, onStart } = {}) {
  if (!canSpeak()) return false;
  const content = cleanForSpeech(text).slice(0, 4000);
  if (!content) return false;

  const synth = window.speechSynthesis;
  synth.cancel();

  const voices = synth.getVoices();
  const preferredVoice =
    voices.find((voice) => /samantha|google us english|aria|jenny|karen|serena|zira/i.test(voice.name) && voice.lang.startsWith('en')) ||
    voices.find((voice) => voice.lang === 'en-US') ||
    voices.find((voice) => voice.lang.startsWith('en'));

  const chunks = chunkText(content);
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = 'en-US';
    if (preferredVoice) utterance.voice = preferredVoice;
    if (index === 0 && onStart) utterance.onstart = () => onStart();
    if (index === chunks.length - 1 && onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }
    synth.speak(utterance);
  });

  return true;
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function canListen() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function listenOnce({ onResult, onEnd, onError } = {}) {
  if (typeof window === 'undefined') return null;
  const RecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!RecognitionClass) {
    onError?.('unsupported');
    return null;
  }

  const recognition = new RecognitionClass();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onEnd?.();
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || '')
      .join(' ')
      .trim();
    if (transcript) onResult?.(transcript);
  };
  recognition.onerror = (event) => {
    if (event?.error !== 'aborted' && event?.error !== 'no-speech') {
      onError?.(event?.error || 'unknown');
    }
    finish();
  };
  recognition.onend = finish;

  try {
    recognition.start();
  } catch {
    finish();
    onError?.('start');
    return null;
  }

  return recognition;
}
