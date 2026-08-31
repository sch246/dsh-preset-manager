# Candidate 4 deployment

Realization: `preset-manager-linux-web-0.1.0-candidate.4`.

The supported deployment path is `scripts/setup.sh`. It checks the Host patch state before mutation, applies only an absent compatible contribution, regenerates shared catalogs, rebuilds the affected Host bundles, builds the plugin and adds it to the selected profile.

The supported removal path is `scripts/uninstall.sh`. It removes the plugin and reverses the Host patch only when the recorded digest and exact target state make that safe, then regenerates catalogs and rebuilds the affected Host bundles.

Candidate 4 was deployed to `/root/deepseek-harness` on official remote base `cd5ef8148158c3a752a658978873241fdf8e2bbc`. Host changes remain uncommitted patch-layer state because the plugin owner does not publish commits to the upstream Harness repository.

The deployment receipt is stored in the target Git metadata as `.git/dsh-preset-manager.patch-state`. It binds patch SHA-256 `c1c016096d03ad699831008a5472a69182765584efe6df7884a4820c8bac70a0`, `host_head=cd5ef8148158c3a752a658978873241fdf8e2bbc`, all owned source-region identifiers and both generated-catalog commands. This machine-local receipt is evidence, not a package-owned artifact or Git realization identity.
