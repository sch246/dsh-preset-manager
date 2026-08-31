# Alpha.2 target drift and cold recomposition

Date: 2026-09-01

Status: user-authorized realization decision caused by target drift. This record does not change preset-manager intent or accept an alpha.2 realization.

## Checked reality

Candidate.4 binds plugin source `21c3ad6fc9cf11228a8630f4dab3fc51d33eb9b1` and Harness alpha.1 base `cd5ef8148158c3a752a658978873241fdf8e2bbc`. Its deployment receipt describes that alpha.1 assembly. The current committed plugin source is `816e418a7f317b5c315ec7a6a89106ed14ddc257`, and the selected cold target is Harness alpha.2 at `0a53fb55bea101816fa226bb964ae2bed71c343b`.

The bound source and target facts therefore do not match the selected recomposition inputs. Candidate.4 and its receipt remain historical evidence, but neither establishes current applicability, reproducibility or acceptance on alpha.2.

## Decision

The user directed a cold recomposition from the complete current STATE against alpha.2, followed by feedback from the real installation. This replaces reuse of the alpha.1 candidate as the next realization strategy; it does not replace or narrow any desired behavior in STATE.

No current lock is selected as a candidate for the revised state. A new realization may be retained only after it binds the current state, source and target facts. Alpha.2 acceptance remains pending.

## Preserved acceptance work

Cold recomposition carries forward every unresolved observation, including session-row overflow actions, metadata order and narrow-width truncation, selector default marking and repeated-choice behavior, default-write failure presentation, real settings persistence, historical Session grouping, current-target runtime compatibility and owned uninstall under unrelated drift. Earlier alpha.1 evidence may inform investigation but cannot close these items for alpha.2.
