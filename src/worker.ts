/**
 * Entrata del Worker: le richieste le gestisce Astro; l'attività pianificata (wrangler.jsonc, "triggers")
 * manda i promemoria di studio.
 */
import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types';
import { handle } from '@astrojs/cloudflare/handler';
import { eseguiPromemoria } from './lib/notifiche';

export default {
  fetch: handle,
  async scheduled(_controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(eseguiPromemoria());
  },
};
