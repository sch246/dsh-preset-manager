# Default toggle and selector order

Date: 2026-08-31

## Authority

The user reported that setting a default does not appear to work because the new-conversation surface continues to select the most recently used preset. The user retained that recent-preset behavior as the fallback when no global default exists and added a reversible default interaction: choosing the current explicit default again clears the global default while keeping that preset selected for the pending conversation. If neither an explicit default nor a recent preset is available, the selector uses the first visible preset in the managed sidebar order.

The user also reported that sidebar reordering no longer affects new-conversation option order. The existing state already requires one managed order to govern both surfaces. Source inspection found that the sidebar consumes `state.order` while the selector derives its roster in Host order. This is a realization mismatch, not a new ordering authority.

The user designated STATE as the only behavior authority for this repair. Code tests that restate implementation semantics would create a second authority: an LLM could misread intent, then make code and tests confirm the same wrong interpretation. The plugin therefore removes its code tests and test gate. Type checking and building check mechanical completeness only; real Web UI observation with real settings persistence, refresh and service restart compares the implementation directly with STATE.

## Required behavior

- Initial selection uses the explicit user default, then the current or recently reused Session preset, then the first visible healthy preset in managed order.
- A manual selection made after the page opens remains selected for that conversation and is not replaced by an asynchronous default refresh.
- Choosing the current non-default preset again writes it as the explicit user default.
- Choosing the current explicit default again clears the user default and keeps the pending selection.
- With no explicit user default, the current or recently reused Session preset is the fallback; if it is unavailable, the first visible healthy preset in managed order is used.
- A deployment-level fallback default is not presented as an explicit user default.
- The new-conversation option order follows the same complete managed order as the sidebar.
- Failed set and clear operations remain visible in the new-conversation surface.
