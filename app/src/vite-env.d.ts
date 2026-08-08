/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRANSLATE_ENDPOINT?: string;
  readonly VITE_SITE_ORIGIN?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
