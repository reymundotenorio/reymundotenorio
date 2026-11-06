# Profile maintenance

This repository powers the GitHub Overview README, not the portfolio website.

The scheduled workflow uses a standard free Ubuntu runner in this public repository, once a day at 11:23 UTC (05:23 America/Managua), and supports manual dispatch. It stores no workflow artifacts or dependency caches. Only generated README files, numeric snapshots and SVG assets are committed by the refresher.

## Read access

Set the `PROFILE_STATS_TOKEN` repository Actions secret to a dedicated credential for the profile owner. Give it only the read permissions required for the repositories and activity being measured. Do not reuse a broad development credential, paste a token in an issue, or commit one. The workflow's own `GITHUB_TOKEN` is used only to publish generated files in this repository.

Fine-grained tokens are limited to one resource owner. Organization access may need separate approval and may not cover the same private activity as a personal token. Validate coverage before replacing the approved snapshot. If one credential cannot cover the intended scope, keep the last verified snapshot until an appropriate approved access arrangement is available; do not present partial public-only numbers as complete private statistics.

## Local commands

Requires Node.js 22+ and authenticated GitHub CLI. There are no npm dependencies.

```sh
npm run collect
npm run build
npm test
npm run validate
```

Raw repository identifiers stay in collector memory. `metrics.json` has a strict aggregate schema, and unknown fields are rejected before publication. Coverage checks refuse historical counter decreases and major repository coverage drops. Legitimate deletions or scope changes require explicit review of the baseline. Failed collection, missing credentials or failed validation leave the public version unchanged.

Languages measure repository code bytes, not personal authorship or proficiency. The contributed-repository connection is recent rather than an all-time inventory. Reviewed pull requests exclude self-authored work. Private and organization access is subject to GitHub permissions and policy.

Scheduled runs can be delayed. GitHub may disable public scheduled workflows after 60 days without repository activity. Keep the secret valid and check Actions if the snapshot date stops advancing.

Geist Mono is embedded in the generated SVGs under the license in `licenses/GEIST-OFL.txt`. The typography and charts are self-contained; no third-party statistics renderer or AI service receives private data.
