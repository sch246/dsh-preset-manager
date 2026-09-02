# Restored Session order snapshot

Date: 2026-09-01

## Authority

After the active deployment was changed from the three-Session alpha.2 candidate Home to the restored formal Home containing 355 Sessions, the user reported that selecting “最近更新” displayed the wrong order and clarified that the restoration caused the regression.

## Observed facts

- The formal `session/list` response contains 355 Sessions and is already ordered by descending `updatedAt`.
- Comparing the restored Session tree with its pre-restoration backup found no bulk rewrite of historical Session logs.
- The workspace browser persists `sessionOrderByAccount` and `sessionUpdatedAtByAccount` in browser-local `dsh.workspace.view.v5` state. Replacing the server-side Session set does not invalidate those accounts.
- When “最近更新” is already selected, selecting it again only writes the same `orderBy` value. The existing reconciliation therefore keeps the persisted account order instead of treating the current Session set as a fresh recency projection.

The browser-local snapshot is the implementation path consistent with the report and the service evidence. The service evidence rules out a bulk timestamp rewrite; it cannot by itself inspect the user's browser storage.

## Required behavior

- Selecting “最近更新” recomputes the applicable Session order accounts from the currently visible Sessions and their current `updatedAt` values, including when that option was already selected.
- A restored or replaced server-side Session set must not remain trapped behind an older browser-local order snapshot after the user requests recent-update order.
- The repair preserves workspace grouping, preset grouping, expansion state and manual ordering data; it only refreshes the active recency projection.

## Acceptance boundary

STATE remains the behavior authority. Mechanical type checking and building establish only that the realization is loadable. Acceptance requires selecting “最近更新” in the restored real Web deployment and observing newest-first rows in the affected group.
