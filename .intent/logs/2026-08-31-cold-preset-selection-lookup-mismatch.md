# Cold preset selection lookup mismatch

Date: 2026-08-31

Status: deployed RPC evidence refining the root-workspace failure. This record does not change P3 or claim the Host repair is accepted.

## Runtime evidence

After the root start handler was bound, `connectWorkspace(root)` resolved the reusable blank Session and the following preset selection returned `ok: false`. The failure reported that resuming the Session could not resolve its deleted historical `code` preset. No target `ptc` selection event was written and the Session was not opened.

## Host mismatch

The `agentPresets/select` wire descriptor declares its first argument as an `Agent` lookup. Gateway therefore asks Session Controller to resume the cold Agent before invoking `AgentPresets.select`. Cold resume composes the preset reconstructed from the Session log, so an invalid historical preset fails before the requested replacement is visible to the domain operation.

The wire endpoint must accept the opaque Session id as JSON at the Session Controller BFF. A live Agent may use the existing domain selection directly. A cold Session must use the controller's existing per-Session activation/single-flight path, restore the exact log without composing its stored preset, and execute target selection during unpublished Agent setup. Existing domain rules remain authoritative: a log with `turn/start` is locked, an unknown or broken target returns its stable preset error, successful composition and its `agent-preset/selected` event commit before publication, and any setup failure publishes nothing.

The global Agent lookup must remain strict because other Agent endpoints require a fully composed Agent. This repair changes only preset selection's lookup ownership; it does not make partially composed Agents observable.
