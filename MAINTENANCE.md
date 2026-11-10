# Profile maintenance

This repository powers the GitHub Overview README, not the portfolio website.

Statistics are maintained manually. There is no scheduled collection, stored API credential or background update. The last verified snapshot stays published until a new update is explicitly requested and checked.

## Local commands

Requires Node.js 22+. There are no npm dependencies, API calls or authentication requirements for building and validating the current snapshot.

```sh
npm run check
```

This rebuilds the README and all 18 responsive SVG assets, runs the tests and validates the aggregate-only publication. The individual `build`, `test` and `validate` commands remain available.

## Updating the snapshot

1. Gather fresh numbers from sources approved for that update. Access to private or organization activity must be explicitly authorized; an existing development credential is not blanket permission to reuse it.
2. Update `metrics.json` with verified aggregates only. Keep raw names, repository identifiers, URLs, source data and credentials out of files and logs.
3. Review coverage against the last verified snapshot. Do not present narrower personal/public access as complete private and organization coverage. Legitimate deletions or scope changes require an explicit baseline review.
4. Run `npm run check` and inspect the generated diff. Verify the GitHub rendering when changing layout or typography.
5. Commit and push only after publication is authorized. Confirm the published files match the verified snapshot.

Only advance the snapshot date after collecting fresh, verified data. A design change or repository cleanup must not make old statistics look newly collected. `metrics.json` has a strict schema that rejects unknown fields and inconsistent totals; coverage checks remain available in `scripts/validate.mjs`.

Languages measure repository code bytes, not personal authorship or proficiency. The contributed-repository connection is recent rather than an all-time inventory. Reviewed pull requests exclude self-authored work. Private and organization access is subject to GitHub permissions and policy.

Geist Mono is embedded in the generated SVGs under the license in `licenses/GEIST-OFL.txt`. The typography and charts are self-contained; no third-party statistics renderer or AI service receives private data.
