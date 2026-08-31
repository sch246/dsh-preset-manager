# Preset start open-order mismatch

Date: 2026-08-31

Status: user-observed implementation mismatch and source-level diagnosis. This record does not change P3 or P4 and does not claim the repair is accepted.

## Runtime evidence

The user repeatedly started PTC from the preset-group `+` action and selected two different workspaces. Selecting `dsh-preset-manager` retained PTC, while selecting `root` opened the Host default `standard` preset instead. The `root` path reused an existing blank session whose last recorded `agent-preset/selected` value was the deleted `code` preset. Opening that session reported `agent-presets: preset "code" not found`, and its log contained no PTC selection event from the attempted start.

The workspace-dependent result shows that the requested preset reached neither the reused `root` blank nor its log before navigation. It does not revise the intended workspace choice or preset choice.

## Implementation mismatch

The preset-group start path stages the requested preset and calls `uiWorkspace.startSession(workspaceId)`. The Host method resolves a reusable or newly created blank Session and opens it immediately. Preset manager then depends on a Session-list subscription to notice the newly current blank and apply the staged preset. A reused blank with invalid historical preset state is therefore opened before the requested preset is selected, exposing the invalid state and allowing the ordinary hero flow to settle on the Host fallback.

The public Workspace navigation service already separates these responsibilities: `connectWorkspace(workspaceId)` resolves a blank `SessionId` without opening it, while `sessions.open(sessionId)` performs navigation. The preset-group start path must connect first, select the requested preset on that exact Session, and open it only after selection succeeds. A connect or selection failure must remain visible and must not open the Session.

The ordinary new-conversation hero selection keeps its existing stage-and-apply behavior. The preset-group workspace chooser still requires an explicit workspace and retains its no-workspace result.
