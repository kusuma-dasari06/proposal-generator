// ============================================================
// useVoiceInput — Browser-native speech-to-text (Web Speech API)
// No external API/key needed. Works in Chrome / Edge.
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';

export function useVoiceInput({ onResult, onError, lang = 'en-IN' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(
    typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    if (!isSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        baseTextRef.current = (baseTextRef.current + ' ' + final).trim();
      }
      const combined = (baseTextRef.current + ' ' + interim).trim();
      onResult?.(combined);
    };

    recognition.onerror = (event) => {
      onError?.(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, lang]);

  const startListening = useCallback((currentText = '') => {
    if (!recognitionRef.current || isListening) return;
    baseTextRef.current = currentText;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // start() throws if already started — safe to ignore
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // ignore
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(
    (currentText = '') => {
      if (isListening) {
        stopListening();
      } else {
        startListening(currentText);
      }
    },
    [isListening, startListening, stopListening]
  );

  // Call this whenever the user manually edits the text box while listening,
  // so the next voice chunk appends onto the edited text instead of
  // overwriting it with the pre-edit voice-only accumulation.
  const updateBaseText = useCallback((text) => {
    baseTextRef.current = text;
  }, []);

  return { isListening, isSupported, startListening, stopListening, toggleListening, updateBaseText };
}