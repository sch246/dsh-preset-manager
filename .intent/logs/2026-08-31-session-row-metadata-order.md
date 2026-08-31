# Session row metadata order

Date: 2026-08-31

## Authority

The user clarified the intended presentation of Session rows in preset grouping. The workspace or working-directory label remains compact grey metadata on the row's right side; it does not become a title or adopt the title's left-side styling. Within one right-aligned metadata block, the workspace label appears first and the relative time remains at the far right, with visible space between them.

This is an intent clarification because the prior state required a workspace label but did not specify its relationship to the existing relative-time cell. The current Host patch placed the label after the time as a separate sibling, so its realization also mismatched the clarified order.

## Required behavior

- A preset-grouped Session row presents `title | [workspace label  relative time]`.
- The bracketed metadata remains a compact grey block aligned on the row's right side.
- The workspace label is the left item inside that block; relative time is the rightmost item.
- The two values have a visible gap.
- A long workspace label truncates before it can shrink, displace or hide the relative-time item.
- The workspace label does not move into the title seat or use the title's left-side presentation.

## Acceptance boundary

Patch application, source inspection, type checking and building can establish only mechanical completeness. Acceptance requires observing the real Web UI at ordinary and narrow sidebar widths, including a workspace label long enough to truncate, and confirming that hover actions retain the intended row behavior.
