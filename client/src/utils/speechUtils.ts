// Voice loading state
let voicesLoaded = false;
let voicesLoadPromise: Promise<void> | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;

// Pre-load voices and ensure they're ready
const ensureVoicesLoaded = (): Promise<void> => {
  if (voicesLoaded) {
    return Promise.resolve();
  }

  if (voicesLoadPromise) {
    return voicesLoadPromise;
  }

  const synth = window.speechSynthesis;
  if (!synth) {
    return Promise.reject(new Error('Speech synthesis not supported'));
  }

  voicesLoadPromise = new Promise((resolve) => {
    const voices = synth.getVoices();
    
    if (voices.length > 0) {
      voicesLoaded = true;
      // Cache the preferred voice immediately
      cachedVoice = voices.find(v => v.name === 'Samantha' || v.name === 'Microsoft Zira Pro') || voices[0];
      resolve();
      return;
    }

    // Wait for voices to load
    const loadVoices = () => {
      const loadedVoices = synth.getVoices();
      if (loadedVoices.length > 0) {
        voicesLoaded = true;
        // Cache the preferred voice
        cachedVoice = loadedVoices.find(v => v.name === 'Samantha' || v.name === 'Microsoft Zira Pro') || loadedVoices[0];
        resolve();
      }
    };

    // Try multiple methods to ensure voices are loaded
    synth.addEventListener('voiceschanged', loadVoices, { once: true });
    
    // Also try a timeout as a fallback
    setTimeout(() => {
      if (!voicesLoaded) {
        loadVoices();
      }
    }, 100);
  });

  return voicesLoadPromise;
};

// Initialize voices immediately when this module loads
if (typeof window !== 'undefined' && window.speechSynthesis) {
  ensureVoicesLoaded();
}

export const speakWord = async (word: string, isMuted: boolean = false): Promise<void> => {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.error('Speech synthesis not supported in this browser');
    return;
  }

  try {
    // Ensure voices are loaded before speaking
    await ensureVoicesLoaded();
    
    // Cancel any ongoing speech immediately
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    
    // Use cached voice for instant performance
    if (cachedVoice) {
      utterance.voice = cachedVoice;
    }

    utterance.lang = 'en-US';
    utterance.rate = 0.7; // Increased from 0.3 for faster pronunciation
    utterance.pitch = 1;
    utterance.volume = isMuted ? 0 : 1;

    synth.speak(utterance);
  } catch (error) {
    console.error('Error speaking word:', error);
  }
};

// Export a function to pre-initialize voices (to be called on component mount)
export const initializeSpeech = (): Promise<void> => {
  return ensureVoicesLoaded();
};
