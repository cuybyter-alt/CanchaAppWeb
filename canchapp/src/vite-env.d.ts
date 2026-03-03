/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  // Agrega más variables de entorno aquí según las necesites
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
