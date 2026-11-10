// Tipi dei binding Cloudflare usati dal portale.
// Non usiamo `wrangler types`: genera i tipi del runtime con workerd, che non gira su macOS 12.
// Si importano solo i tipi necessari dal pacchetto ufficiale, per non entrare in conflitto con quelli del DOM.
declare module 'cloudflare:workers' {
  export const env: {
    DB: import('@cloudflare/workers-types').D1Database;
  };
}
