export const speakWord = (word: string, isMuted: boolean = false) => {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.error('Speech synthesis not supported in this browser');
    return;
  }

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(word);
    const voices = synth.getVoices();

    console.log('Available voices:', voices.map(v => v.name));

    const voice = voices.find(v => v.name === 'Samantha' || v.name === 'Microsoft Zira Pro');
    if (voice) {
      console.log('Using preferred voice:', voice.name);
      utterance.voice = voice;
    } else if (voices.length > 0) {
      console.log('Using default voice:', voices[0].name);
      utterance.voice = voices[0];
    }

    utterance.lang = 'en-US';
    utterance.rate = 0.3;
    utterance.pitch = 1;
    utterance.volume = isMuted ? 0 : 1;

    console.log('Speaking word:', word, 'with rate:', utterance.rate);
    synth.speak(utterance);
  };

  // Wait for voices to be loaded if they aren't already
  const voices = synth.getVoices();
  if (voices.length === 0) {
    console.log('Waiting for voices to load...');
    synth.addEventListener('voiceschanged', () => {
      speak();
    }, { once: true });
  } else {
    speak();
  }
};
