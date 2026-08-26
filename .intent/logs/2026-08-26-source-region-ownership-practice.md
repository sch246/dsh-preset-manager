# Source-region ownership practice

Date: 2026-08-26

## Tension

The compatibility realization changes official `ui-workspace` source. A package-level patch identifies the repository owner but does not let an unfamiliar Agent distinguish nearby preset-manager code from Harness code or from another plugin contributing to the same generated catalogs.

## Observation

- The semantic Host regions are `workspace.groupBy.preset`, `sidebar.workspaces.presetGroups`, and `workspace.rows.alternateGrouping`.
- The official row extraction is one authority used by both native workspace grouping and the alternate preset occupant; it is not a copied preset-only row implementation.
- `slot-catalog.ts` and `api-catalog.ts` aggregate source declarations from multiple packages and must not be reversed as though preset-manager exclusively owned the files.

## Decision projected into state

- Logical Host interventions carry nearby native `@meta-intent:begin` / `@meta-intent:end` markers naming this package and candidate realization.
- The patch contains only the governed `ui-workspace` source and acceptance files. Shared catalogs are regenerated from all remaining source contributions after setup and owned uninstall.
- The lifecycle receipt records patch digest, target head, marker schema, semantic regions, and generated mapping. Setup verifies representative markers.
- Markers are navigation and attribution evidence. Exact setup provenance plus reverse applicability remain the authority for removal.

## Candidate boundary

This practice prepares `preset-manager-linux-web-0.1.0-candidate.1` against Harness `b642a10626a950cc95c2d6f839810cb01fe599fe`. It does not claim protocol adoption, end-to-end runtime acceptance, or a live uninstall exercise. No service restart occurred.
