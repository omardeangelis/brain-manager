# Review-2 score — add-skills («Modo selezione»)

Document: `review2-as.md`, the second-format UX review of `/prototypes/add-skills` («Modo selezione», `src/prototypes/add-skills/`). Ground truth: `gt-as.md`, defects AS-1 to AS-14, so N = 14.

This score uses the same conventions as `score-baseline-as.md`, `score-new-as.md`, `score2-ss.md` and `score2-ls.md`:
- **Bundled defects:** a hit only when most sub-failures are covered. Fewer than that gives a partial.
- **Dismissed defects:** a defect named exactly but explicitly dismissed is a partial.
- **Findings:** decisions plus the items under «Task accessibility fixes» (this format's name for the mechanical-fix list) plus already-broken items.
- **Unsupported runtime claims:** a claim counts only when it cites no observation (trace step, screenshot, snapshot, outcome row or matrix cell, measured value) and no code location. A cross-reference to a cited row or decision counts as cited.

Every ground-truth defect is scored, including the layout and visual ones. Quotes are exact.

## 1. Ground-truth table

| GT ID | verdict | quote + section |
|---|---|---|
| AS-1 | miss | — [Nothing covers the checkbox row's hit area, the inert padding or the touch-target size. The only 375 px item is «the bar is reachable at 375 px» (Persona situations), which is about the confirm bar.] |
| AS-2 | miss | — [The focus ring is never mentioned. Every focus item is about where focus lands (body, first checkbox, count line), not how the checkbox's focus is drawn.] |
| AS-3 | miss | — [The checkbox accessible name is not mentioned. Manual check 2 asks only whether «Hai riempito i posti rimasti…» is read as the row's description, and check 1 asks what is read on entering the mode.] |
| AS-4 | miss | — [Nothing on the tick SVG's `<title>Selezionata</title>`.] |
| AS-5 | hit | «The success line sits above the entry button instead of replacing it» (Prototype changes, #3 → B). The Decisions row #3 names the failure, «After one success, the only way into the mode is gone for good, so there is no second batch», and its acceptance criterion says «After adding 2 (18 posti), the entry button is still there, also after close and reopen». |
| AS-6 | hit | «puts focus on `<body>` (`:129-133`). With change A, focus stays on it with `aria-busy`. On success, move focus to the count line» (Task accessibility fixes, bullet «Aggiungi»). [Both halves are covered: the drop to body and where focus goes after the outcome.] |
| AS-7 | hit | «The mode closes the instant «Aggiungi» is pressed. The save is invisible, a failure leaves the person outside the mode, and pressing the entry button mid-save hides the outcome.» (Decisions, #2). Change A requires «Aggiungi» to stop closing the mode, «which makes the existing «Aggiungo…» branch (`:140-142`) reachable». [All 4 sub-failures are covered: no visible saving state, immediate exit, open button live during the save, and re-entry hiding the success. The evidence shows the last one: «at +1.3 s «0 selezionate», `role=status` empty, success only after ✕».] |
| AS-8 | hit | «On any failure the mode stays open, with the ticks and the message under the bar.» (Prototype changes, #2 → A). [All 4 sub-failures are covered. Hidden selection and no retry in view: this quote, plus the outcome row «with no retry control nearby». Lost focus: «On failure, keep it on «Aggiungi».» (Task accessibility fixes). A stale error after reopening: the Decisions #2 acceptance criterion «the mode is open, 2 are ticked, and no old message shows», with evidence «re-entering showed Storybook and Redux still ticked plus the old message».] |
| AS-9 | hit | «Spec: mid-save it still closes without travel, the outcome line shows in the closed panel under «Vedi tutte», and focus goes there» (Where the spec will be misread, row «In volo la card non si chiude»). The Leaving row «Window resized 1280 → 375» adds «The shipped card closes on any width change (`axis-panel.tsx:225-234`), so the outcome would be lost». [It names the forced close mid-save and requires an outcome surface on the collapsed card. It never mentions the toast, but a spec written from this has an outcome surface, so the defect would not occur.] |
| AS-10 | partial (borderline) | «**Room line:** «Puoi sceglierne altre {n}.»» (Decisions, #6, default). [It rewrites the room line's copy for the plenty-of-room state but never questions whether the line should show then. The rewrite implicitly keeps the line always visible. Same element, not the failing behavior. A stricter reading, which needs the line's presence to be addressed, gives a miss.] |
| AS-11 | hit | «confirm «Aggiungi {n} skill»» (Decisions, #6, default). [The confirm button now says what and how many. The separate «N selezionate» counter is not discussed, but the main sub-failure, the button label, is covered. This matches the baseline score, which gave a hit for «Aggiungi 3 skill al profilo».] |
| AS-12 | partial | «entry «Aggiungi le skill che hai davvero» (shipped `skills_cta`)» (Decisions, #6, default). The persona hand-off adds «The shipped CTA said «…che hai davvero»; the prototype drops it». [The same missing honesty cue, but placed on the entry button, not as a lead line inside the mode. This matches the `score-new-as` verdict.] |
| AS-13 | hit | «**Overflow:** «Ne hai scelte {k}, c'è posto per {n}: togline {k−n}.»» (Decisions, #6, default). The acceptance criterion adds «After «Tetto cambiato», the line says how many to untick», and the evidence shows the contradiction: «Timed run «Tetto cambiato»: 3 ticked, room 1, «Hai riempito…»». The outcome row «profile changed» adds «Today: room 1, 3 ticked, no instruction.» [Both sub-failures are covered: the full-vs-1-left contradiction, because the overflow line replaces «Hai riempito…», and the guidance to untick.] |
| AS-14 | hit | «The real write returns outcomes the prototype cannot produce: no answer (there is no timeout, and the card is locked), uncertain, quota, rate limit, claim conflict, version conflict, validation.» (Decisions, #5). The evidence adds «The fixtures know only `added`, `retry`, `over_cap` (`fixtures.ts:87`)». [The default designs a timeout, the no-answer outcomes, and copy plus button behavior for every answered kind. It covers 4 of the 5 named outcomes: rate limit, quota, rejected (validation, 400) and timeout. «Already present» is not named.] |

## 2. Recall

strict recall = 8 / 14 = 0.57; lenient recall = (8 + 0.5 × 2) / 14 = 9 / 14 = 0.64

There are 8 hits (AS-5, AS-6, AS-7, AS-8, AS-9, AS-11, AS-13, AS-14), 2 partials (AS-10, AS-12) and 4 misses (AS-1, AS-2, AS-3, AS-4).

For comparison:
- The baseline FLOW.md scored 0.57 strict and 0.68 lenient.
- The first-format review (`review-as.md`) scored 0.50 strict and 0.61 lenient.

Review 2 matches the baseline on strict recall and beats the first review on both. It gains on the save, outcome and copy defects:
- AS-7, AS-8 and AS-13: all sub-failures are now covered.
- AS-9 and AS-11 move from partial or miss to hit.
- AS-14 moves from partial to hit.

It loses everything at the row level: the hit area, the focus ring, the accessible name and the tick SVG are all clean misses. The first review hit AS-1 and AS-3 with its click-coordinate probe and its name check.

Borderline calls and how they move the numbers:
- **AS-10 as miss:** 0.57 strict, 0.61 lenient.
- **AS-9 as partial**, since the toast is never named: 0.50 strict, 0.61 lenient.
- **AS-11 as partial**, since the separate counter is not addressed: 0.50 strict, 0.61 lenient.

## 3. Counts

- **lines:** 89
- **findings:** 14, made of:
  - 6 decisions (#1–#6)
  - 6 «Task accessibility fixes»:
    - focus on entering the mode
    - focus after «Esci dalla selezione»
    - focus after «Aggiungi»
    - the unannounced success line
    - Escape on the full panel
    - the `aria-describedby` reason on a blocked «Aggiungi»
  - 2 already-broken items: the raw «Network Error», and a failed `/me` re-read blanking the comparison

  Not counted:
  - the 3 prototype changes, which implement D2–D4
  - 10 outcome rows and 5 «Leaving and interrupting» rows
  - 3 persona or hand-off notes
  - 5 «misread» phrases
  - 4 manual checks
  - 3 open questions
- **open questions:** 3, all 3 with a recommended default:
  - «write the label exactly as the row shows it, trimmed»
  - «no extra per-batch cap»
  - «assume it does not»
- **decisions with default and acceptance criterion:** 6 / 6. Every row has a non-empty «Recommended default» and a non-empty «Acceptance criterion». Three cells are pointers to the prototype-change sections, each of which carries its own «Check»:
  - #3's default is «Change B».
  - #4's acceptance criterion is «As change C».
  - #2's acceptance criterion starts «As change A», then adds its own check.
- **runtime claims without evidence:** 1, and it is borderline.
  1. Task accessibility fixes, last bullet: «**«Aggiungi» blocked by overflow** gives no reason.» The bullet cites no trace, snapshot or code line. The Decisions #6 timed run observes «Aggiungi» as `aria-disabled` and inert, but not the missing description. The code supports the claim: `modo-selezione.tsx:124-128` sets `aria-disabled` and no `aria-describedby`. If the #6 timed run is taken to cover it, the count is 0.

  Excluded as cited:
  - Task accessibility fixes, bullet «Escape on the full panel … does nothing inside the mode». The bullet itself cites nothing, but the same claim appears with evidence in the Leaving row «Full panel, mode open | Escape | Nothing; only ✕ exits | timed run».
  - Task accessibility fixes, bullet «Esci dalla selezione»: it cites a code location (`:144-154`).
  - every Decisions problem cell, each backed by its Evidence column
  - all outcome and leaving rows
  - the persona claims, which cite `CompetenceModal.tsx:73`, `12-375-18gaps-full.png` or point to D4 and D6
  - both already-broken items (code lines)
  - the misread rows (code lines)

  Excluded as not a runtime claim: the hand-off estimate «padding the profile with all 18 is a few taps».

## 4. Findings not in the ground truth that look real and user-observable

- **D4.** At 0 places the ✗ list disappears under the heading «Non sul tuo profilo 13». A save that fills the cap swaps the whole column, count line included, for the cap line, so the success is never confirmed (`13-zero-room.png`, timed run «3 posti»).
- **D5, beyond AS-14.** The PATCH has no timeout, and DL21 locks Escape and ✕ mid-save (`shell.tsx:362-365,404-407`). A hung write would therefore trap the person in the card with no exit.
- **Task fix 1.** Entering the mode drops focus to `<body>` outside the `aria-modal` card. The next Tab skips every checkbox and lands on «Aggiungi».
- **Task fix 4.** The success count line is never announced. The only `role=status` (`:157`) holds failures only. The same applies to «Il tuo profilo le ha tutte.» on the full panel.
- **Already broken, raw English.** A dropped connection on any skills write shows «Network Error» in the toast, because the generic kind carries `error.message` from axios.
- Not listed above, and flagged: D1 (a stale or full-list PATCH silently drops skills under a success line). It is real in code, but the GT lists «reread-before-PATCH» among its dropped items.

## 5. Validity judgement, provisional, for the maintainer to confirm

Each item is judged only on whether it is a real, user-observable problem on this surface. The code was checked read-only in `ux-bench-as/` at 24aacc0d.

### Decisions

| # | judgement | reason |
|---|---|---|
| 1 | valid | `updateProfileV2` sends the whole list as one CSV through `boundSkillsCsv` (`profile/api/index.ts:240-251`). `boundSkillTerms` silently `.slice(0, 30)`s it (`libs/skill-input.ts:30`). A list built from a stale `/me` either overwrites skills added elsewhere or truncates ticked ones, and the line still counts them as added. It is rare, and it depends on how the real save builds the list. The GT dropped «reread-before-PATCH», which looks like an implementation-phase item rather than a non-issue. |
| 2 | valid | `setMode(false)` at `modo-selezione.tsx:132` exits the mode on submit, so the «Aggiungo…» branch (`:140`) never shows. The entry button is the fallback while `confirmed()` is undefined, so it is live during the save. `confirmed()` requires `!mode()` (`:42-43`), which hides the success if the person re-enters. On close, `ExpandCard` unmounts the expanded face (`<Show when={mode() !== "rest"}>`), resetting `mode`. The selection and the `retry` state live in `createCardState`, so the ticks and the old message come back. |
| 3 | valid | `confirmed()` replaces the entry button for as long as `saveState` is done/added and never resets (`:42-43`, `:86-114`), so the remaining gaps cannot be added (GT AS-5). |
| 4 | valid | `<Show when={!capped()} fallback={<NoRoom />}>` at `:59` wraps the `ReadingView` and the action slot too. At 0 places the ✗ list goes, and so does the count line after a save that brings room to 0 (`room()` = 30 − 27 − 3, `shell.tsx:89-97`). This contradicts the file's own «a riposo la colonna è il confronto». |
| 5 | valid | `axios.create` has no `timeout` (`api/client.ts:9-11`) and `updateProfileV2` passes no signal (`:251`), while the card ignores dismiss in flight (`shell.tsx:362-365`, `404-407`). The kinds in `profile-skill-write-error.ts:3-9` and the `errors.profile_skills.*` copy exist, and the fixtures produce only 3 outcomes (`fixtures.ts:87`). It is a spec-level gap for the real save, not reachable in the prototype. |
| 6 | valid | The prototype mixes «Aggiungi competenze al profilo» and «Vedi tutte 19 competenze» (`modo-selezione.tsx:112`, `shell.tsx:389`) with «skill aggiunte». The shipped copy uses «Skill» and «Aggiungi le skill che hai davvero» (`translations.json:1230,1236`). `RoomLine` shows «Hai riempito i posti rimasti…» as soon as `left` is 0, before any save, and after «Tetto cambiato» (3 ticked, room 1) while the error says 1 is left. This is copy-level and low severity. Caveat: its acceptance criterion «No «competenze» anywhere in the flow» conflicts with #5, which reuses the `errors.profile_skills.*` copy, and that copy says «competenze» (`translations.json` ~4849-4855). |

### Already broken

| item | judgement | reason |
|---|---|---|
| Raw «Network Error» | valid | With no response, `mapProfileSkillWriteError` returns `generic` with `resolveApiErrorMessage(error, "")` (`profile-skill-write-error.ts:49-52`). That falls through to `error.message` (`error.ts:149`), because axios 1.14 sets `response` only when there is one (`AxiosError.js` `if (response)`). The message hook returns `error.message` ahead of the i18n copy (`profile-skill-write-error-message.tsx:13`), and `CompetenceModal.tsx:78` toasts it. |
| Failed `/me` re-read blanks the comparison | valid | `useUpdateProfileV2.onSuccess` invalidates `[PROFILE_KEY]` (`profile/api/index.ts:267`), and `matchProfile()` returns `null` unless `profile.isSuccess` (`router/dashboard/route.tsx:89`). The bug already exists and is filed (`dashboard-filter-breakdown/FLOW.md` EN-S4). It needs a failed refetch after a successful save, so it is rare. |

Totals: 8 valid, 0 doubtful, 0 invalid (decisions: 6 valid; already broken: 2 valid).
