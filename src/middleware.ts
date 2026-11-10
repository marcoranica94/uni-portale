import { defineMiddleware } from 'astro:middleware';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Difesa in profondità: oltre a Cloudflare Access sul dominio, ogni pagina dinamica
 * e ogni API verifica il JWT che Access aggiunge alla richiesta (Cf-Access-Jwt-Assertion).
 * Le pagine statiche sono servite direttamente da Cloudflare, sempre dietro Access.
 */
let chiavi: ReturnType<typeof createRemoteJWKSet> | undefined;

export const onRequest = defineMiddleware(async (ctx, next) => {
  if (ctx.isPrerendered) return next();

  // Import dinamico: 'cloudflare:workers' esiste solo nel runtime dei Worker, non durante la build.
  const { env } = await import('cloudflare:workers');
  const token = ctx.request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return new Response('Accesso non autorizzato.', { status: 403 });

  chiavi ??= createRemoteJWKSet(new URL(`${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));
  try {
    await jwtVerify(token, chiavi, { issuer: env.ACCESS_TEAM_DOMAIN, audience: env.ACCESS_AUD });
  } catch {
    return new Response('Accesso non autorizzato.', { status: 403 });
  }
  return next();
});
