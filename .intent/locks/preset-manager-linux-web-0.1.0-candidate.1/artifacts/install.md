# Candidate 1 lifecycle

Realization: `preset-manager-linux-web-0.1.0-candidate.1`

Implementation identity: `dsh-preset-manager` commit `24b69aad6a4f0a6964e68101da70418f0adace5d`.

Install:

```bash
cd /root/dsh-preset-manager
DSH_CHECKOUT=/root/deepseek-harness bash scripts/setup.sh
systemctl restart dsh-web
```

Uninstall:

```bash
cd /root/dsh-preset-manager
DSH_CHECKOUT=/root/deepseek-harness bash scripts/uninstall.sh
systemctl restart dsh-web
```

The lifecycle checks exact patch state, verifies representative package locators, and records patch digest, ownership, semantic regions and generated mapping in the Harness Git-private receipt. Locators guide Agent investigation rather than authorize mutation. Shared slot/API catalogs are regenerated after source application or owned reversal, so another plugin's remaining source contribution survives. No setup, uninstall, or restart was executed while sealing this candidate.
