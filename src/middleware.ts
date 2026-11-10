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
    const { payload } = await jwtVerify(token, chiavi, { issuer: env.ACCESS_TEAM_DOMAIN, audience: env.ACCESS_AUD });
    const email = typeof payload.email === 'string' ? payload.email : null;
    // Il token di un service token non ha email: ha common_name (il Client ID).
    ctx.locals.access = { email, servizio: !email && typeof payload.common_name === 'string' };
  } catch {
    return new Response('Accesso non autorizzato.', { status: 403 });
  }
  return next();
});
