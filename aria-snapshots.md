---
name: aria-snapshots
description: Compare a failed Playwright ARIA snapshot assertion (expected vs. actual YAML) and produce the smallest valid update to the expected template that preserves the original assertion intent.
---

# Repairing a failed ARIA snapshot assertion

When a `toMatchAriaSnapshot` assertion fails, use the **expected** template YAML and the
**actual** snapshot YAML to produce the smallest edit that makes the template match actual.

Expected is a **partial constraint template**, not a serialization of actual. Change only
what current constraints require; never copy anything from actual the template did not assert.

## Procedure

1. **Root the template.** Its root matches any actual node of the same role (a fragment
   matches anything), at any depth — usually the shallowest same-role node whose subtree
   aligns with the template's children. Do not add actual ancestors, wrappers, or siblings.
2. **Align children** by the parent's child mode (see Modes), pairing expected children to
   actual in order.
3. **Repair each aligned node** (see Node repair).
4. **Apply mode-required structural edits:** remove template children with no actual
   counterpart; reorder to actual order; under `equal`/`deep-equal` add each actual-only
   child the mode now requires **as a bare `- role`** — never its name, state, text, or
   (for `deep-equal`) any descendant beyond a bare `- role` skeleton.
5. **If correspondence is undetermined, return every tied candidate** (see Ambiguity).

## Modes (`/children`)

- **`contain` (default):** template children must appear in actual in order, as a
  subsequence; extra actual children are skipped, not added.
- **`equal`:** the direct child list must match actual's exactly, in order; each level
  keeps its own mode.
- **`deep-equal`:** exact match recursively.
- Keep any `/children` directive, including on a node whose asserted children all
  disappeared — an empty list under `equal`/`deep-equal` asserts "no children".

## Node repair

Only fields the template already asserts may change; omitted fields stay omitted.

- **Role:** if it differs, update it; add no actual-only states or properties.
- **Quoted name/text:** literal — replace with actual's literal when it no longer matches.
- **Regex name/text:** keep variable tokens (`\d+`, `.*`); update only changed literal
  spans so it still matches actual. Never collapse a regex into a literal.
- **States/properties** (`checked`, `disabled`, `expanded`, `invalid`, `level`, `pressed`,
  `selected`, `/url`, …): if asserted and actual differs, set it to actual's value. Actual
  never renders a false boolean, so an asserted boolean state that actual omits is removed.

## Ambiguity and cost

Smallest = fewest atomic edits (one literal/regex/state/property/role value change, or one
node add/remove/reorder). Prefer repairing a field over deleting a node when the node still
has a same-role counterpart in actual. When the snapshots alone leave several same-role
candidates or tie two distinct repairs, return **all** equally minimal candidates.

## Scope

Expected and actual suffice to *propose* candidates mechanically, not to decide product
intent (bug vs. wanted change). Present candidates and confirm intent before editing source.
