# Historical preset projection cache mismatch

Date: 2026-08-31

Status: user-observed implementation mismatch and source-level diagnosis. This record does not change P1 or claim the repair or migration is accepted.

## Runtime evidence

The user reported that earlier Sessions all appeared as zero-count preset groups in “按预设”. The deployed list placed 89 additional Sessions under the ungrouped fallback. The persisted headers of sampled historical Sessions already recorded an `agentPreset`, but their derived session-projection cache records did not contain the later-added `agentPreset` row. Opening one affected Session rebuilt that row and made it available to preset grouping.

The runtime corpus contains 328 compressed Session logs totalling about 105 MiB. Only 22 are at or below the default 1,024-byte cold-list probe limit, so ordinary bounded blank-session probing cannot migrate the historical corpus.

## Implementation mismatch

The zero-I/O cold listing path treated any cached nonblank `sessionListMetadata` row as sufficient even when other currently registered client-visible projection rows were absent, version-mismatched or malformed. This let an older partial checkpoint suppress the only cold-read path that could reconstruct the missing preset projection.

Projection-cache completeness must be defined against the currently registered client-visible units, not against one consumer row. A bounded cold list read may refresh an incomplete checkpoint from the complete persisted log and write the derived checkpoint back without changing the authoritative Session log. Existing large logs require an explicit one-time bounded-concurrency cache backfill or an equivalent maintenance pass; increasing the ordinary default list budget is not evidence that migration completed.

Preset ownership is reconstructed from the complete `agentPreset` projection: the header supplies its initial value and later `agent-preset/selected` events override it. Reading the header alone would misclassify Sessions whose preset changed after creation.
