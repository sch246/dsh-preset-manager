# Preserve ownership of a pre-existing Harness patch

Record ID: `SRC-2026-08-26-PRESET-PATCH-OWNERSHIP-REPAIR`

Status: implementation-mismatch repair under existing P5 semantics. It does not revise intent, install or uninstall the plugin, modify the Harness checkout, or establish `PM-007` acceptance.

## Trigger

The pre-commit audit checked whether the lifecycle scripts remove only effects attributable to this plugin installation.

## Checked mismatch

`setup.sh` correctly distinguished an absent, fully present or conflicting patch, but it wrote the same SHA provenance after both applying the patch and observing an identical patch that already existed. `uninstall.sh` could therefore reverse an externally owned, pre-existing Host effect merely because its bytes matched.

That behavior violated P5: equality proves applicability, not ownership.

## Repair

- Setup now records both the patch SHA and whether this setup actually applied it.
- An exact rerun preserves a prior positive ownership record.
- A matching patch with no attributable positive record remains externally owned.
- Uninstall reverses Host files only when ownership is positive, the SHA still matches and reverse checking succeeds.
- A pre-existing or drifted Host effect is preserved while normal bundle removal may continue.

## Evidence boundary

Shell syntax checks, plugin typechecks, 27 pure tests, the plugin build, protocol 0.2 validation, exact reverse patch checking and the current ui-workspace test suite pass. No setup/uninstall mutation exercise was performed; target-drift and owned-uninstall acceptance remain open.
