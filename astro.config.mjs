// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://docs.astro.build/en/guides/integrations-guide/cloudflare/
export default defineConfig({
  site: 'https://uni.marcoranica.com',
  adapter: cloudflare({
    // Le pagine statiche si generano con Node: workerd non gira su macOS 12.
    prerenderEnvironment: 'node',
    // Nessuna trasformazione di immagini: evita il binding Cloudflare Images.
    imageService: 'passthrough',
  }),
});
