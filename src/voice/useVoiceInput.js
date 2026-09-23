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
  const latestTranscriptRef = useRef('');
  const onFinalCallbackRef = useRef(onFinalTranscript);
  const onErrorCallbackRef = useRef(onError);

  useEffect(() => {
    onFinalCallbackRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onErrorCallbackRef.current = onError;
  }, [onError]);

  const reset = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus(isSupported ? VOICE_STATUS.IDLE : VOICE_STATUS.UNSUPPORTED);
    latestTranscriptRef.current = '';
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus(isSupported ? VOICE_STATUS.IDLE : VOICE_STATUS.UNSUPPORTED);
    latestTranscriptRef.current = '';
  }, [isSupported]);

  const stop = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    if (status === VOICE_STATUS.LISTENING) {
      setStatus(VOICE_STATUS.PROCESSING);
    }
  }, [status]);

  const start = useCallback(() => {
    if (!isSupported) {
      setStatus(VOICE_STATUS.UNSUPPORTED);
      setError({
        code: 'not_supported',
        message: "Voice input isn't available in this browser.",
      });
      return;
    }

    // Reset previous capture
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    latestTranscriptRef.current = '';

    const recognizer = createSpeechRecognizer({
      lang: selectedLang,
      onStart: () => {
        setStatus(VOICE_STATUS.LISTENING);
      },
      onTranscript: ({ transcript: text, interimTranscript: interim, isFinal }) => {
        setTranscript(text);
        setInterimTranscript(interim);
        latestTranscriptRef.current = text;

        if (isFinal && text.trim()) {
          setStatus(VOICE_STATUS.PROCESSING);
          if (onFinalCallbackRef.current) {
            onFinalCallbackRef.current(text.trim());
          }
        }
      },
      onError: (err) => {
        setError(err);
        setStatus(VOICE_STATUS.ERROR);
        if (onErrorCallbackRef.current) {
          onErrorCallbackRef.current(err);
        }
      },
      onEnd: ({ hasReceivedFinal }) => {
        const captured = latestTranscriptRef.current.trim();
        if (captured && !hasReceivedFinal) {
          // If stopped without an explicit isFinal flag, still forward final buffer
          setStatus(VOICE_STATUS.PROCESSING);
          if (onFinalCallbackRef.current) {
            onFinalCallbackRef.current(captured);
          }
        } else if (!captured) {
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
