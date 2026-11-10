// Tipi dei binding Cloudflare usati dal portale.
// Non usiamo `wrangler types`: genera i tipi del runtime con workerd, che non gira su macOS 12.
// Si importano solo i tipi necessari dal pacchetto ufficiale, per non entrare in conflitto con quelli del DOM.
declare module 'cloudflare:workers' {
  export const env: {
    DB: import('@cloudflare/workers-types').D1Database;
    ACCESS_TEAM_DOMAIN: string;
    ACCESS_AUD: string;
  };
}

declare namespace App {
  interface Locals {
    /** Chi ha superato Cloudflare Access: una persona (email) o il service token dell'agente. */
    access?: { email: string | null; servizio: boolean };
  }
}
