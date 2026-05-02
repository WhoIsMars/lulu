# Photos: naming & ordering rules

**Captured:** 2026-05-02 (during Phase 1 execution)
**Applies to:** Phase 2 (content pipeline + manifest), Phase 3 (room layout)

## Naming convention

Le foto sono già rinominate per matchare il titolo della poesia corrispondente. Estensioni miste (.jpg / .JPG). Caratteri speciali italiani inclusi (`…finché.jpg`, `ciò_che_non_dici.jpg`).

Il manifest builder (Phase 2 CONT-02/CONT-03) deve:
- Normalizzare lo slug del titolo della poesia (lowercase, NFKD-fold accenti, replace spaces+underscore con `-`).
- Match case-insensitive contro filename normalizzato (rimuovendo estensione + lowercase + replace `_`/spazi con `-`).
- Fail-fast in build con errore chiaro se: una foto non ha poesia matchante, una poesia non ha foto matchante.
- ⚠ Su filesystem case-insensitive (macOS default) `.jpg` e `.JPG` sono lo stesso namespace; ma il bundler/CI Linux è case-sensitive — uniformare i path letti dal manifest a quanto presente sul disco.

## Ordering rule (LOCKED)

Le poesie/polaroid vanno disposte **in ordine cronologico per data della poesia** (le poesie hanno data nel titolo, es. `22/7/2025 | 17:38`):

- **prima poesia in alto a sinistra**
- **ultima poesia in basso a destra**
- progressione: left-to-right, top-to-bottom (lettura occidentale)

Phase 2 manifest deve esporre l'array poesie già ordinato per data (parsing della data dall'header poesia).
Phase 3 layout di Room deve consumare quell'ordine per posizionare polaroid sui fili — il primo filo (top) contiene le polaroid più vecchie, l'ultimo (bottom) le più recenti.

## Inventario corrente (15 foto, 2026-05-02)

```
Autoinganni.jpg
ciò_che_non_dici.jpg
Dubbio.JPG
…finché.jpg
I_tuoi_auto_sabotaggi.jpg
Insulto.jpg
Lasciare_senza_lasciti.JPG
Le_luci_delle_lucciole.JPG
Luce.jpg
Oltre.jpg
perdimi.JPG
punizione.JPG
Silenzi.jpg
Sincronizzati.JPG
Un_altro_sogno.JPG
```

`poems.txt` contiene 16 poesie attuali — verificare in Phase 2 se il numero corrisponde o se manca una foto / c'è una poesia in più.
