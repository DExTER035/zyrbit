/**
 * Zyrbit — Voice Input Types & Constants
 * Defines interaction states, error categories, language presets, and human-readable error messages.
 */

export const VOICE_STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  CONFIRMING: 'confirming',
  CLARIFICATION_REQUIRED: 'clarification_required',
  EXECUTING: 'executing',
  SUCCESS: 'success',
  ERROR: 'error',
  UNSUPPORTED: 'unsupported',
};

export const VOICE_ERROR = {
  NOT_SUPPORTED: 'not_supported',
  PERMISSION_DENIED: 'permission_denied',
  NO_SPEECH: 'no_speech',
  AUDIO_CAPTURE: 'audio_capture',
  NETWORK: 'network',
  ABORTED: 'aborted',
  UNKNOWN: 'unknown',
};

export const VOICE_LANGUAGES = {
  EN_IN: 'en-IN',
  HI_IN: 'hi-IN',
  EN_US: 'en-US',
};

export const DEFAULT_VOICE_LANGUAGE = VOICE_LANGUAGES.EN_IN;

export const VOICE_ERROR_MESSAGES = {
  [VOICE_ERROR.NOT_SUPPORTED]: "Voice input isn't available in this browser.",
  [VOICE_ERROR.PERMISSION_DENIED]: "Microphone access was denied. Please allow microphone permissions.",
  [VOICE_ERROR.NO_SPEECH]: "I couldn't hear that. Please try speaking again.",
  [VOICE_ERROR.AUDIO_CAPTURE]: "No microphone was detected on this device.",
  [VOICE_ERROR.NETWORK]: "Network communication error during speech recognition.",
  [VOICE_ERROR.ABORTED]: "Voice input was cancelled.",
  [VOICE_ERROR.UNKNOWN]: "An unexpected voice recognition error occurred.",
};
