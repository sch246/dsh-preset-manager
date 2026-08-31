# Default entry and sidebar simplification

Date: 2026-08-31

## Authority

The user reported that the preset-group star cannot be clicked because hovering its position shows the row expansion affordance. The user proposed moving the default action into the new-conversation preset selector: after choosing a preset, hovering the currently selected option shows “设为默认”, and choosing that option again makes it the default. The selector also identifies the current default.

The user then removed the duplicate sidebar action: “如果默认从入口更改了那侧边再用星标就没必要了”. The new-conversation selector is therefore the only preset-manager UI that writes the Host default. The sidebar retains grouping, expansion, ordering, visibility, rename, and session-start actions without a star.

The user also confirmed the update authority order: “正确的更新顺序是LOG->STATE->代码”. This log records the decision before the semantic state changes and before any implementation is accepted into the canonical repository.

## Required behavior

- The new-conversation selector marks the Host-authoritative default preset.
- Choosing a different preset changes only the new conversation's selection.
- Choosing the currently selected non-default preset again writes it as the Host default.
- Hovering or focusing that current non-default option exposes the action text “设为默认”.
- Choosing the current default again performs no settings write.
- A failed default write is visible to the user.
- Preset-group rows contain no star and no second default-write action.
- Default visibility remains governed by the existing invariant that a default preset cannot be hidden.
