# Agent Note: Workspace alternate-group row ownership

Status: implemented

English | [中文](2026-08-24-workspace-alternate-group-row-ownership.zh.md)

## Problem

An alternate sidebar grouping needs to add its own group identity, metadata, and actions while retaining the Workspace browser's Session status, collapse, overflow, and drag behavior. Exporting the React rows for another client plugin to import couples two independently loaded runtime modules. Reimplementing those rows in the occupant instead creates a second visual and behavioral authority that drifts from the official Workspace tree.

## Decision

`@deepseek-ai/dsh-client-ui-workspace` remains the sole owner of `ProjectGroupItem`, `ProjectRowItem`, `SessionNodeItem`, `SessionOverflowButton`, and the `deriveFlat` Session projection. The `sidebar.workspaces.presetGroups` slot owner passes a typed `PresetRowsOwner` seat containing the official Session projector, Workspace label helper, and render callbacks that close over the Workspace locale. The occupant supplies grouping facts plus optional leading, metadata, and action decorations, and invokes those owner callbacks; it neither imports runtime row values nor reproduces row CSS and status rules.

The complete project-section wrapper owns drag hit testing and insertion markers across both the header and its visible Session children. Group expansion and the five-row overflow state remain separate: closing a group renders no Session preview and clears its overflow expansion. Session rows always receive the official projection, so pending interaction and active work use the official animated `StateDot` precedence. Grouping-specific Session context uses the row's metadata seat rather than composing title text.

This extends the Workspace-region ownership established by [Session-list browsing and manual order](../feature/2026-07-25-session-list-browsing-and-manual-order.md), follows the slot lifecycle in [Slot declaration injection](2026-08-05-slot-declaration-injection.md), and applies the same cross-plugin presentation boundary as [Client tool presentation ownership](2026-08-08-client-tool-presentation-ownership.md) and [Dynamic client render and attachment ownership](2026-08-17-dynamic-client-render-and-attachment-ownership.md).

## Verification

Workspace row tests pin the shared decoration seats, official running-state dot, full-section drag target and marker, and shared overflow control. Workspace-browser tests pin the same project wrapper in the native grouping path. The alternate grouping's pure tests consume already-projected Session nodes, proving it no longer imports or reconstructs `deriveFlat`.

## Alternatives considered

**Export the row components and import them from the occupant plugin.** Rejected because a type-correct import still executes the other plugin's runtime entry and store/module-loader dependencies, bypassing slot lifecycle ownership.

**Keep look-alike rows in the occupant.** Rejected because collapse, activity animation, action menus, spacing, and drag insertion would have independent implementations and continue to drift.

**Move all rows into a generic primitive package.** Rejected because these rows encode Workspace-domain projection, locale, action, and drag semantics; making them generic would spread that knowledge rather than establish one owner.

## Consequences

Alternate grouping plugins can extend the official tree without owning its behavior. Changes to Workspace row animation, spacing, overflow, or drag semantics reach every grouping through one implementation. The slot owner contract is wider and contains render callbacks, but no cross-plugin React component value is exported. Occupants remain responsible for their grouping model and decorations, and cannot render when the Workspace owner is absent.
