# Candidate 2 lifecycle

Realization: `preset-manager-linux-web-0.1.0-candidate.2`

Implementation identity: `dsh-preset-manager` commit `e82f6dcf83fab6e795b0bc5c4abf7fdfcfc14095`.

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

The lifecycle checks exact patch state, verifies representative package locators, and records patch digest, ownership, semantic regions and generated mapping in the Harness Git-private receipt. Ordinary purpose comments guide Agent investigation rather than authorize mutation. Shared slot/API catalogs are regenerated after source application or owned reversal, so another plugin's remaining source contribution survives. No setup, uninstall, or restart was executed while sealing this candidate.
