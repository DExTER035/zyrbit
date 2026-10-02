/**
 * Zyrbit — useVoiceInput Hook
 * React hook encapsulating speech recognition lifecycle, status state machine, transcripts, and error handling.
 * Zero domain logic, zero Supabase access.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VOICE_STATUS,
  DEFAULT_VOICE_LANGUAGE,
} from './voiceTypes.js';
import {
  isVoiceSupported,
  createSpeechRecognizer,
} from './voiceService.js';

/**
 * @param {Object} [options]
 * @param {string} [options.language=DEFAULT_VOICE_LANGUAGE]
 * @param {Function} [options.onFinalTranscript] - Callback triggered when final transcript is emitted
 * @param {Function} [options.onError] - Callback triggered when an error occurs
 */
export function useVoiceInput({
  language = DEFAULT_VOICE_LANGUAGE,
  onFinalTranscript,
  onError,
} = {}) {
  const isSupported = isVoiceSupported();
  const [status, setStatus] = useState(isSupported ? VOICE_STATUS.IDLE : VOICE_STATUS.UNSUPPORTED);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [selectedLang, setSelectedLang] = useState(language);

  const recognizerRef = useRef(null);
  const latestFinalRef = useRef('');
  const hasSubmittedRef = useRef(false);
  const hasErrorRef = useRef(false);
  const onFinalCallbackRef = useRef(onFinalTranscript);
  const onErrorCallbackRef = useRef(onError);

  useEffect(() => {
    onFinalCallbackRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onErrorCallbackRef.current = onError;
  }, [onError]);

  useEffect(() => {
    setSelectedLang(language);
  }, [language]);

  const reset = useCallback(() => {
    hasSubmittedRef.current = true;
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus(isSupported ? VOICE_STATUS.IDLE : VOICE_STATUS.UNSUPPORTED);
    latestFinalRef.current = '';
    hasErrorRef.current = false;
  }, [isSupported]);

  const cancel = useCallback(() => {
    hasSubmittedRef.current = true;
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus(isSupported ? VOICE_STATUS.IDLE : VOICE_STATUS.UNSUPPORTED);
    latestFinalRef.current = '';
    hasErrorRef.current = false;
  }, [isSupported]);

  const stop = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setStatus((prev) => (prev === VOICE_STATUS.LISTENING ? VOICE_STATUS.PROCESSING : prev));
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      setStatus(VOICE_STATUS.UNSUPPORTED);
      setError({
        code: 'not_supported',
        message: "Voice input isn't available in this browser.",
      });
      return;
    }

    // Abort any active recognizer before starting a new one
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }

    // Reset capture state for fresh voice session
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    latestFinalRef.current = '';
    hasSubmittedRef.current = false;
    hasErrorRef.current = false;
    setStatus(VOICE_STATUS.LISTENING);

    const recognizer = createSpeechRecognizer({
      lang: selectedLang,
      onStart: () => {
        setStatus(VOICE_STATUS.LISTENING);
      },
      onTranscript: ({ transcript: liveText, interimTranscript: interimText, finalTranscript: finalText }) => {
        setTranscript(liveText);
        setInterimTranscript(interimText);
        if (finalText) {
          latestFinalRef.current = finalText;
        }
      },
      onError: (err) => {
        hasErrorRef.current = true;
        setError(err);
        setStatus(VOICE_STATUS.ERROR);
        if (onErrorCallbackRef.current) {
          onErrorCallbackRef.current(err);
        }
      },
      onEnd: ({ finalTranscript: endedFinal }) => {
        // 1. Error path: start -> error -> end (error already set by onError)
        if (hasErrorRef.current) {
          return;
        }

        const capturedFinal = (endedFinal || latestFinalRef.current).trim();

        // 2. Result path: start -> result -> end
        if (capturedFinal) {
          if (!hasSubmittedRef.current) {
            hasSubmittedRef.current = true;
            setStatus(VOICE_STATUS.PROCESSING);
            if (import.meta.env?.DEV) console.log('[VOICE] sending to Dex:', capturedFinal);
            if (onFinalCallbackRef.current) {
              onFinalCallbackRef.current(capturedFinal);
            }
          }
        } else {
          // 3. No result path: start -> no result -> end
          setStatus(VOICE_STATUS.IDLE);
        }
      },
    });

    recognizerRef.current = recognizer;
    recognizer.start();
  }, [isSupported, selectedLang]);

  // Clean up recognition session on unmount
  useEffect(() => {
    return () => {
      hasSubmittedRef.current = true;
      if (recognizerRef.current) {
        recognizerRef.current.abort();
        recognizerRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    status,
    setStatus,
    transcript,
    interimTranscript,
    error,
    language: selectedLang,
    setLanguage: setSelectedLang,
    start,
    stop,
    cancel,
    reset,
  };
}

export default useVoiceInput;
