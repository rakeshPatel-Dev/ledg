/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_API_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  /** Set to "off" to force device speech instead of cached server TTS. */
  readonly VITE_VOICE_TTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
