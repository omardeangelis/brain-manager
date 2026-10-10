# Maintainer notes — company-onboarding at e2442d09 (T14 step 1)

> SEALED for T14. No worker that writes or edits `assets/agents/ui-reviewer.md`, `assets/skills/ui-review/`, or a brief for them reads this file, `maintainer-notes-1.png`, or anything else in `specs/ui-reviewer/benchmark/` before T14 step 8. Only the pooler (step 6), the counter (7b) and the scorer (8) read it.

Written by the maintainer on 2026-10-08 against `http://localhost:3104/prototypes/company-onboarding`, and sent in chat. Verbatim below (only the numbering is added). Screenshot: `maintainer-notes-1.png` (review card, LinkedIn fixture `/company/netflix`).

## Desktop

1. Premendo sul tasto per editare il nome azienda, una volta aperto l'input se premo sul bottone per editare un qualsiasi campo, l'input precedente viene chiuso ma quello del bottone corrispondente non si apre e il layout si sposta. Succede solo quando il secondo input si trova sotto quello aperto.
2. La descrizione dovrebbe essere un text-area invece di un semplice input, potrebbe essere anche molto lunga.
3. Logo e immagine non sono modificabili in review. Vedi che hai il placeholder ma non hai modo di modificarlo. Deve esserci una decisione esplicita che giustifica questa scelta.
4. Nello scenario di errore possiamo dare all'utente nel alert un quick link per riaprire LinkedIn e copiare il link.
5. Nello scenario di Netflix, in cui vi sono più sedi non vedo che c'è la possibilità di scegliere la principale fino a quando non premo "modifica".

## Mobile

6. La label va a capo e anche il titolo, un controllo della versione da Mobile è sempre obbligatorio.
7. Tutte le voci da da confermare da mobile sono completamente tagliate e non riesco a vadere il valore da confermare
