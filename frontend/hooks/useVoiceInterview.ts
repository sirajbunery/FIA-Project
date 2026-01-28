'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceInterviewOptions {
  language?: 'en-US' | 'ur-PK';
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

interface VoiceInterviewState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
}

export function useVoiceInterview(options: UseVoiceInterviewOptions = {}) {
  const { language = 'en-US', onTranscript, onError } = options;

  const [state, setState] = useState<VoiceInterviewState>({
    isListening: false,
    isSpeaking: false,
    transcript: '',
    interimTranscript: '',
    isSupported: false,
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Store callbacks in refs to avoid useEffect re-running
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onTranscript, onError]);

  // Check browser support
  useEffect(() => {
    console.log('🎤 useVoiceInterview: Initializing...');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;

    console.log('🎤 SpeechRecognition available:', !!SpeechRecognition);
    console.log('🎤 speechSynthesis available:', !!speechSynthesis);

    if (SpeechRecognition && speechSynthesis) {
      setState(prev => ({ ...prev, isSupported: true }));
      console.log('✅ Voice features supported');

      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      console.log('🎤 Recognition configured with language:', language);

      recognition.onstart = () => {
        console.log('🎤 Recognition STARTED');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('🎤 Recognition result received:', event.results.length, 'results');
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          console.log(`🎤 Result ${i}: "${transcript}" (final: ${event.results[i].isFinal}, confidence: ${confidence})`);

          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          console.log('✅ Final transcript:', finalTranscript);
          setState(prev => ({
            ...prev,
            transcript: prev.transcript + finalTranscript,
            interimTranscript: '',
          }));
          // Use ref to call callback
          onTranscriptRef.current?.(finalTranscript);
        } else {
          console.log('📝 Interim transcript:', interimTranscript);
          setState(prev => ({ ...prev, interimTranscript }));
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ Speech recognition error:', event.error);
        const errorMessage = `Speech recognition error: ${event.error}`;
        setState(prev => ({ ...prev, error: errorMessage, isListening: false }));
        // Use ref to call callback
        onErrorRef.current?.(errorMessage);
      };

      recognition.onend = () => {
        console.log('🎤 Recognition ENDED');
        setState(prev => ({ ...prev, isListening: false }));
      };

      recognition.onnomatch = () => {
        console.log('🎤 No speech match');
      };

      recognition.onsoundstart = () => {
        console.log('🎤 Sound detected');
      };

      recognition.onsoundend = () => {
        console.log('🎤 Sound ended');
      };

      recognition.onspeechstart = () => {
        console.log('🎤 Speech started');
      };

      recognition.onspeechend = () => {
        console.log('🎤 Speech ended');
      };

      recognitionRef.current = recognition;
      synthRef.current = speechSynthesis;

      // Pre-load voices (Chrome loads them asynchronously)
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log('🔊 Voices loaded:', voices.length);
        if (voices.length > 0) {
          const urduVoice = voices.find(v => v.lang.startsWith('ur'));
          const hindiVoice = voices.find(v => v.lang.startsWith('hi'));
          console.log('🔊 Urdu voice available:', !!urduVoice, urduVoice?.name || 'none');
          console.log('🔊 Hindi voice available:', !!hindiVoice, hindiVoice?.name || 'none');
        }
      };
      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      console.warn('⚠️ Voice features NOT supported');
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: 'Voice features not supported in this browser. Try Chrome or Edge.',
      }));
    }

    return () => {
      console.log('🎤 Cleaning up voice hook');
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  // Only re-initialize when language changes, NOT when callbacks change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Start listening
  const startListening = useCallback(() => {
    console.log('🎤 startListening called');
    console.log('🎤 recognitionRef.current:', !!recognitionRef.current);

    if (!recognitionRef.current) {
      console.error('❌ No recognition ref available');
      return;
    }

    setState(prev => ({
      ...prev,
      isListening: true,
      transcript: '',
      interimTranscript: '',
      error: null,
    }));

    try {
      recognitionRef.current.lang = language;
      console.log('🎤 Starting recognition with language:', language);
      recognitionRef.current.start();
      console.log('✅ Recognition start() called successfully');
    } catch (error) {
      console.error('❌ Failed to start recognition:', error);
    }
  }, [language]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Speak text (Text-to-Speech)
  const speak = useCallback((text: string, voiceLang?: 'en' | 'ur') => {
    if (!synthRef.current) {
      console.log('🔊 No speech synthesis available');
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Get voices - may need to wait for them to load
    let voices = synthRef.current.getVoices();
    console.log('🔊 Available voices:', voices.length);

    const targetLang = voiceLang === 'ur' ? 'ur' : 'en';
    console.log('🔊 Target language:', targetLang, 'Text:', text.substring(0, 50));

    // Find a suitable voice
    let selectedVoice = voices.find(v => v.lang.startsWith(targetLang));

    if (!selectedVoice && targetLang === 'ur') {
      // Try Urdu Pakistan specifically
      selectedVoice = voices.find(v => v.lang === 'ur-PK' || v.lang === 'ur_PK');
      // Fallback to Hindi (similar script and sounds)
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('hi'));
        if (selectedVoice) console.log('🔊 Using Hindi voice as Urdu fallback');
      }
      // Fallback to any available voice but set the language
      if (!selectedVoice) {
        console.log('🔊 No Urdu/Hindi voice found. Using default voice with Urdu lang tag.');
        utterance.lang = 'ur-PK';
      }
    }

    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('🔊 Selected voice:', selectedVoice.name, selectedVoice.lang);
    } else {
      // Set language even without a specific voice - browser may still TTS
      utterance.lang = targetLang === 'ur' ? 'ur-PK' : 'en-US';
      console.log('🔊 No matching voice found, using lang tag:', utterance.lang);
    }

    utterance.rate = targetLang === 'ur' ? 0.85 : 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => {
      console.log('🔊 Speech started');
      setState(prev => ({ ...prev, isSpeaking: true }));
    };

    utterance.onend = () => {
      console.log('🔊 Speech ended');
      setState(prev => ({ ...prev, isSpeaking: false }));
    };

    utterance.onerror = (event) => {
      console.error('🔊 Speech error:', event.error);
      setState(prev => ({ ...prev, isSpeaking: false }));
    };

    synthRef.current.speak(utterance);
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', interimTranscript: '' }));
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    clearTranscript,
  };
}

export default useVoiceInterview;
