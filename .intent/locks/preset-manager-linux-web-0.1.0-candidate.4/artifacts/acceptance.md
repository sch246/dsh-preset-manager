# Candidate 4 acceptance evidence

Observed on 2026-08-31 against official DeepSeek Harness `origin/master` commit `cd5ef8148158c3a752a658978873241fdf8e2bbc` with the candidate Host patch applied as uncommitted deployment state.

## Source and patch

- Plugin realization: `21c3ad6fc9cf11228a8630f4dab3fc51d33eb9b1`.
- Host patch: `patches/harness-groupby-preset.patch`, SHA-256 `c1c016096d03ad699831008a5472a69182765584efe6df7884a4820c8bac70a0`.
- A fresh worktree at the official commit passed forward apply, apply and exact reverse-apply checks.
- The deployed checkout passed the exact reverse check. Its receipt records the same patch digest, official Host base and owned source regions.

## Automated evidence

- Preset manager: 36 Vitest cases passed; Host and Client typechecks passed; build passed; lifecycle scripts passed `bash -n`.
- Focused Harness packages: 43 test files and 588 tests passed; focused typecheck and Host build passed.
- Both generated catalogs completed after the Host export and subsystem ownership repairs.
- The three changed bilingual Host documents passed their named pairing check. The aggregate documentation check had one unrelated pre-existing failure in `picturereader/README.md`.

These checks were run while producing the committed realization and are not repeated by the lock-only seal.

## Deployed behavior

- A root-workspace start selected `PTC 模式`, produced no UI error and persisted `agentPreset: ptc` for the actual Session before it opened.
- The historical projection migration populated preset groups with observed counts: Standard 24, PTC 1, Minimal 22, Warm minimal 32, router standard 13, router spec 2 and anchored 1.
- Restarted `dsh-web` served the rebuilt Host and plugin Client bundles.

## Remaining acceptance

The realization remains incomplete pending deployed interaction checks for session-row rename/fork/archive, repeated-selection default writing and error presentation, plus the owned uninstall and unrelated-drift preservation exercise.
