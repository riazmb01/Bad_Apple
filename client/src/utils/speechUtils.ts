export const speakWord = (word: string, isMuted: boolean = false) => {
  const synth = window.speechSynthesis;
  if (!synth) return;

  const utterance = new SpeechSynthesisUtterance(word);
  const voices = synth.getVoices();

  const voice = voices.find(v => v.name === 'Samantha' || v.name === 'Microsoft Zira Pro');
  utterance.voice = voice || voices[0];

  utterance.lang = 'en-US';
  utterance.rate = 0.3;
  utterance.pitch = 1;
  utterance.volume = isMuted ? 0 : 1;

  synth.speak(utterance);
};
