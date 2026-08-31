# Preset start handler scope mismatch

Date: 2026-08-31

Status: deployed regression evidence refining the earlier start-order diagnosis. This record does not change P3 or claim the repair is accepted.

## Runtime evidence

After the connect → select → open ordering repair was deployed, the preset-group tree and its workspace popup rendered normally. Choosing `root` still returned the localized action failure, left the current `deepseek-harness` workspace and `standard` preset unchanged, and emitted no Workspace, preset or Session RPC frame. The same page already had the root preset-group slot mounted, so the failure occurred before `connectWorkspace` rather than inside the ordered operations.

## Implementation mismatch

The root preset-group slot receives a stable wrapper around `startSessionByPreset`, but that variable initially points to a local failure function. The real handler was assigned only inside a second `ctx.inject` callback that also owns the conversation-scoped shadow seat. The root tree can become interactive before that conversation child scope exists, leaving the wrapper connected to the failure function.

The start handler depends only on root services: `uiWorkspace`, `sessions`, `remote.agentPresets`, and an optional seat reconciliation handle. These dependencies must bind at plugin apply time, while the seat registration remains conversation-scoped. `uiWorkspace` therefore belongs in the plugin's declared root inject list; preset selection may notify the current seat when one exists, but navigation cannot depend on that child scope.
