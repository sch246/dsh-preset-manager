# Description and create-flow clarification

Record ID: `SRC-2026-08-26-PRESET-MANAGER-DESCRIPTION-CREATE-CLARIFICATION`

Status: user authority clarification plus user-observed runtime evidence for the current implementation.

## Verbatim clarification

The user added:

> 说明的编辑那里能做成多行的或者自动换行的吗，因为说明往往比较长

The user then narrowed the requirement:

> 编辑器能自动换行就行了，我还不知道它能不能支持换行符呢，如果它不支持我们还输入就不好了

## Resulting state meaning

The description editor must accommodate long text through a multi-line control or reliable automatic wrapping. Visual preservation of manually inserted line breaks is not required merely by this clarification. If the editor accepts line-break characters, the data path must preserve them rather than silently discarding them.

Repository inspection found that the current implementation already uses a four-row `textarea`, automatically wraps long text, and retains internal newline characters through the override and roster data path. This is implementation evidence, not a reason to omit the requirement from state.

## User-observed create-flow evidence

The user tested the current implementation and reported that it appears to satisfy the requested behavior of entering the official creation interface with workspace and preset preselected.

This observation resolves the earlier static-code concern for the current milestone. The acceptance criterion remains state-level so a later realization must preserve the observable behavior; it does not require one specific internal call sequence.
