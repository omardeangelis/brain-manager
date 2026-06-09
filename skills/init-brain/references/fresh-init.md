# Fresh Init

Scaffold a brand-new `brain/` from the bundled template. Assumes Step 0–2 of `SKILL.md` are done (`$SKILL_DIR` resolved, target locations chosen).

## 1. Guard against clobbering

```bash
ls -la ./brain 2>/dev/null
```

- If `brain/` does not exist → proceed to copy.
- If `brain/` exists but is empty (or only `.gitkeep`) → proceed.
- If `brain/` exists **with content** → do NOT clobber. Switch to an additive merge: copy only the files/dirs that are missing, and leave existing `index.md`, `log.md`, `AGENTS.md`, `CLAUDE.md`, `specs/CONSTITUTION.md` untouched unless the user confirms a refresh. Report what you added vs skipped.

## 2. Copy the scaffold

Copy the contents of the bundled scaffold into the target (preserves the `.gitkeep` placeholders so empty dirs survive):

```bash
mkdir -p ./brain
cp -R "$SKILL_DIR/assets/brain/." ./brain/
```

This lands: `AGENTS.md`, `CLAUDE.md`, `index.md`, `log.md`, `specs/CONSTITUTION.md`, and the `raw/{meetings,external,assets}/`, `domains/`, `chore/`, `tech-debt/` skeleton.

## 3. Stamp the date

Replace the `__TODAY__` placeholders with today's date (ISO `YYYY-MM-DD`):

```bash
TODAY="$(date +%F)"
for f in ./brain/index.md ./brain/log.md ./brain/specs/CONSTITUTION.md; do
  # macOS/BSD sed; on GNU use: sed -i "s/__TODAY__/$TODAY/g" "$f"
  sed -i '' "s/__TODAY__/$TODAY/g" "$f" 2>/dev/null || sed -i "s/__TODAY__/$TODAY/g" "$f"
done
grep -rl "__TODAY__" ./brain && echo "WARN: unstamped placeholders remain" || echo "dates stamped ✅"
```

## 4. Tell the agent layer about brain

If the repo root has a `CLAUDE.md` / `AGENTS.md` router, add a one-line pointer to `brain/` and its skills so future agents discover the knowledge base (only if such a router exists — do not create one unprompted). Keep it to a short bullet under an existing "repo map" / "knowledge" section.

## 5. Continue

Return to `SKILL.md` Step 4 (install skills) → Step 5 (advisors) → Step 6 (verify).
