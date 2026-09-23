/**
 * Zyrbit — Voice Recognition Service
 * Pure abstraction over the browser Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Handles browser detection, recognition lifecycle, transcript aggregation, and error normalization.
 * Zero database, React, or domain dependencies.
 */

import {
  VOICE_ERROR,
  VOICE_ERROR_MESSAGES,
  DEFAULT_VOICE_LANGUAGE,
} from './voiceTypes.js';

/**
 * Checks if the current browser environment supports native speech recognition.
 * @returns {boolean}
 */
export function isVoiceSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Normalizes native SpeechRecognition error event codes to Zyrbit VOICE_ERROR keys.
 * @param {string} nativeError
 * @returns {string}
 */
export function normalizeVoiceError(nativeError) {
  switch (nativeError) {
    case 'not-allowed':
    case 'service-not-allowed':
      return VOICE_ERROR.PERMISSION_DENIED;
    case 'no-speech':
      return VOICE_ERROR.NO_SPEECH;
    case 'audio-capture':
      return VOICE_ERROR.AUDIO_CAPTURE;
    case 'network':
      return VOICE_ERROR.NETWORK;
    case 'aborted':
      return VOICE_ERROR.ABORTED;
    default:
      return VOICE_ERROR.UNKNOWN;
  }
}

/**
 * Creates and manages a speech recognizer instance.
 *
 * @param {Object} options
 * @param {string} [options.lang=DEFAULT_VOICE_LANGUAGE] - Recognition BCP 47 language code ('en-IN', 'hi-IN', 'en-US')
 * @param {Function} [options.onStart] - Called when microphone starts capturing
 * @param {Function} [options.onTranscript] - Called with { transcript, interimTranscript, isFinal }
 * @param {Function} [options.onError] - Called with { code: VOICE_ERROR, message: string }
 * @param {Function} [options.onEnd] - Called when recognition session finishes
 * @returns {{ start: Function, stop: Function, abort: Function }}
 */
export function createSpeechRecognizer({
  lang = DEFAULT_VOICE_LANGUAGE,
  onStart,
  onTranscript,
  onError,
  onEnd,
} = {}) {
  if (!isVoiceSupported()) {
    if (onError) {
      onError({
        code: VOICE_ERROR.NOT_SUPPORTED,
        message: VOICE_ERROR_MESSAGES[VOICE_ERROR.NOT_SUPPORTED],
      });
    }
    return {
      start: () => {},
      stop: () => {},
      abort: () => {},
    };
  }

  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let hasReceivedFinal = false;

  try {
    recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang || DEFAULT_VOICE_LANGUAGE;

    recognition.onstart = () => {
      hasReceivedFinal = false;
      if (onStart) onStart();
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
          hasReceivedFinal = true;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      if (onTranscript) {
        onTranscript({
          transcript: finalTranscript.trim() || interimTranscript.trim(),
          interimTranscript: interimTranscript.trim(),
          isFinal: hasReceivedFinal,
        });
      }
    };

    recognition.onerror = (event) => {
      const normalizedCode = normalizeVoiceError(event.error);
      const userMessage = VOICE_ERROR_MESSAGES[normalizedCode] || VOICE_ERROR_MESSAGES[VOICE_ERROR.UNKNOWN];

      // Suppress aborted notice if user intentionally stopped
      if (normalizedCode === VOICE_ERROR.ABORTED) {
        return;
      }

      if (onError) {
        onError({
          code: normalizedCode,
          message: userMessage,
          rawError: event.error,
        });
      }
    };

    recognition.onend = () => {
      if (onEnd) onEnd({ hasReceivedFinal });
    };
  } catch (err) {
    if (onError) {
      onError({
        code: VOICE_ERROR.UNKNOWN,
        message: err.message || VOICE_ERROR_MESSAGES[VOICE_ERROR.UNKNOWN],
      });
    }
  }

  return {
    start: () => {
      try {
        hasReceivedFinal = false;
        recognition?.start();
      } catch (err) {
        // Recognition might already be running
        if (err.name !== 'InvalidStateError' && onError) {
          onError({
            code: VOICE_ERROR.UNKNOWN,
            message: err.message || VOICE_ERROR_MESSAGES[VOICE_ERROR.UNKNOWN],
          });
        }
      }
    },
    stop: () => {
      try {
        recognition?.stop();
      } catch {
        // Ignore stop on inactive instance
      }
    },
    abort: () => {
      try {
        recognition?.abort();
      } catch {
        // Ignore abort on inactive instance
      }
    },
  };
}
