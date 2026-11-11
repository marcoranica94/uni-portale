# uni-portale

Portale personale di studio per la laurea in Scienze politiche (Università degli Studi di Bergamo): percorso e libretto, lettore degli appunti, simulazioni d'esame scritte e orali corrette da un agente AI locale, ripasso degli errori con FSRS, piano a ritroso fino all'appello e notifiche PWA.

*Personal study portal: degree progress, notes reader, written and oral exam simulations graded by a local AI agent, FSRS spaced repetition, exam countdown planner, PWA notifications. UI and code comments are in Italian.*

## Architettura

```
telefono / browser ──▶ Cloudflare Access ──▶ Worker (Astro 7 SSR + API) ──▶ D1
                                                 │  Workers AI (Whisper) per gli orali
                                                 ▼
                                        coda dei lavori in D1
                                                 ▲
                         PC: uni-agent (claude -p / codex exec / agy -p, output JSON a schema)
```

- **Sito:** Astro 7 su Cloudflare Workers, D1, Cloudflare Access; pagine in `src/pages/`, endpoint in `src/pages/api/`.
- **Agente locale:** `agente/uni-agent.ts` preleva la coda via API e genera kit d'esame, domande, correzioni e domande dal vivo con le CLI degli assistenti AI. Il sito non contatta mai il PC.
- **Schemi condivisi:** `src/shared/schemi.ts` (Zod) vincola sia le API sia l'output degli agenti.
- **Dati:** `percorso/piano-di-studi.yaml` (piano di studi ufficiale) e `src/data/materie.json`; migrazioni D1 in `migrations/`.

## Appunti

Gli appunti non sono in questo repository: stanno in un repository privato separato. `scripts/sync-appunti.mjs` li copia in `public/appunti/` prima di `dev` e `build`, prendendoli da `UNI_APPUNTI` (di default `../unibg`). Senza appunti il portale si compila lo stesso, con le materie vuote.

## Comandi

Requisiti: Node 24 LTS, pnpm 12.

| Comando | A cosa serve |
| --- | --- |
| `pnpm install` | dipendenze |
| `pnpm test` | test unitari (`node --test`) |
| `pnpm build` | sincronizza gli appunti, controlla i tipi, compila e indicizza con Pagefind |
| `pnpm dev` | server di sviluppo dentro workerd |
| `pnpm agente watch --agente claude` | agente locale (richiede il service token di Access) |

Il deploy avviene da `.github/workflows/deploy-portale.yml`. Le istruzioni di lavoro dettagliate sono in `CLAUDE.md`.
