# Phase 1: Foundation + Deploy + Soft Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 01-foundation-deploy-soft-gate
**Areas discussed:** Repo & dominio, Setup password concreta, Look & UX della schermata gate

---

## Repo & Dominio

### Repo name

| Option | Description | Selected |
|--------|-------------|----------|
| lulu (Recommended) | Coerente con cartella, breve. URL `username.github.io/lulu` | ✓ |
| polaroid-poesie | Più descrittivo, URL più lungo | |

### Domain

| Option | Description | Selected |
|--------|-------------|----------|
| Project page username.github.io/lulu (Recommended) | Zero costi, base `/lulu/` | ✓ |
| Custom domain | CNAME + DNS, base `/` | |
| Custom domain in v2 | Pubblica subito, switch via env | |

### Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Privato (Recommended) | Pages da repo privato richiede GitHub Pro+ | ✓ |
| Pubblico | Sorgente in chiaro su GitHub | |

### Deploy trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Solo push su main (Recommended) | Semplice, prevedibile | ✓ |
| main + preview su PR | Branch ottiene URL preview | |
| Manuale (workflow_dispatch) | Solo via tab Actions | |

**User's choice:** tutte le opzioni "Recommended"
**Notes:** Verificare che l'account GitHub permetta Pages da repo privato. Se non disponibile, decidere esplicitamente fallback a repo pubblico.

---

## Setup password concreta

### Pwd setup

| Option | Description | Selected |
|--------|-------------|----------|
| Script CLI npm (Recommended) | `npm run gate:set <pwd>` genera salt+hash, scrive `src/gate.config.ts` | ✓ |
| Hardcoded in TS | Hash + salt scritti a mano | |
| .env build-time | Pwd in `.env.local`, build inietta hash | |

### Pwd policy

| Option | Description | Selected |
|--------|-------------|----------|
| Libera (almeno 6 char) (Recommended) | Avvisa <6 ma non blocca | |
| Forte (min 12, mix) | Policy seria | |
| Anche frase con spazi | Passphrase prima classe | ✓ |

### Fail UX

| Option | Description | Selected |
|--------|-------------|----------|
| Errore + delay 800ms (Recommended) | Anti brute-force soft, aria-live | ✓ |
| Errore immediato | Niente delay | |
| Errore + lock progressivo | Blocco dopo N tentativi | |

### Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Nessun recovery in-app (Recommended) | Owner condivide fuori-banda | ✓ |
| Hint statico | Hint sotto al campo | |

**User's choice:** Script CLI, passphrase con spazi, delay 800ms, no recovery.
**Notes:** Passphrase con spazi richiede NFC normalize. Lo script genera salt random e riscrive `src/gate.config.ts` ad ogni invocazione.

---

## Look & UX della schermata gate

### Gate vibe

| Option | Description | Selected |
|--------|-------------|----------|
| Soffitta già da subito (Recommended) | Sfondo buio, candela spenta, campo come riga su carta | ✓ |
| Soglia neutra | Nero pieno, campo minimal | |
| Dietro a tendina/sipario | Sipario/velo che si apre | |

### Copy

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal (Recommended) | Solo placeholder "password" e "Entra" | ✓ |
| Una parola di benvenuto | Una riga sopra il campo | |
| Decidi tu il microcopy | Lascia scegliere | |

### Submit

| Option | Description | Selected |
|--------|-------------|----------|
| Enter o bottone (Recommended) | Form classico, accessibile keyboard | ✓ |
| Solo Enter (no bottone) | Più minimal, peggio a11y | |
| Bottone + animazione "accensione" | Submit triggera animazione 1–1.5s | |

### Animazione unlock

| Option | Description | Selected |
|--------|-------------|----------|
| Crossfade soft → home (Recommended) | Fade ~400ms, reduced-motion = istantaneo | ✓ |
| Candela si accende e si entra | Animazione 1–1.5s coreografata | |
| Cambio rotta secco | Niente animazione | |

**User's choice:** soffitta da subito, microcopy minimal, Enter o bottone, crossfade soft.
**Notes:** L'animazione "candela che si accende" è stata esplicitamente posticipata a v2 / POLI-01 per non gonfiare Phase 1.

---

## Claude's Discretion

- ESLint v9 flat config + Prettier vs Biome — Claude sceglie ESLint+Prettier (sentiero ben battuto Vue), può rivalutare in planning.
- WebCrypto wrapper diretto (`crypto.subtle`) vs `@noble/hashes` — default direct.
- Struttura cartelle `src/` (gate/, views/, composables/, router/) — convenzionale Vue 3.
- Pinia incluso da subito (sarà richiesto da Phase 5+).
- Vue Router skeleton con `/` e `/p/:slug` placeholder per validare SPA fallback con un deep-link reale già in Phase 1.

## Deferred Ideas

- Custom domain → upgrade futuro, codice già pronto via `VITE_BASE`.
- AES-GCM build-time encryption (PRIV-01) → v2.
- "Ricorda dispositivo" / localStorage (PRIV-02) → v2.
- Animazione "candela che si accende" all'unlock → POLI-01 / v2.
- Hint statico sotto al campo → scartato.
- Lock progressivo dopo N tentativi → scartato per ora.
- Preview deploy per PR → non in v1.
