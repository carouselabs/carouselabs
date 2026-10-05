# Dependency advisory follow-up - 2026-10-04

The refreshed registry audit is no longer clean. The root report contains **8 high findings** and the browser-extension report contains **5 high findings**. Each report's findings are propagation through dependency chains of the same underlying advisory, **GHSA-vfj7-8cjw-p6xm / CVE-2026-93687**, in braces <=3.0.3. These are not thirteen independent application vulnerabilities.

## Evidence and applicability

- Source reports: audit-final-dependencies.json and audit-extension-final-dependencies.json (local ignored artifacts; PowerShell UTF-16 JSON).
- [GitHub reviewed advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), checked October 4: high severity; published September 18 and updated October 2; **no patched version listed**. npm's report uses CVSS 3.1 score 7.5; the current web advisory also displays CVSS 4.0 score 8.7.
- [Upstream report](https://github.com/micromatch/braces/issues/70): sufficiently deeply nested, attacker-controlled brace patterns can exhaust recursive AST walkers and terminate a process if the exception is uncaught. This is a denial-of-service advisory, not a demonstrated authentication bypass or data disclosure in this application.
- npm view braces version --json --cache audit-artifacts/npm-cache returned **3.0.3**. The installed package is also 3.0.3. The workspace cache was used after the ordinary npm view failed to write the sandbox-excluded user cache; an ordinary PowerShell registry request also failed with a transport error.
- Root dependency paths include eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces, plus shadcn -> fast-glob / ts-morph -> @ts-morph/common. shadcn is currently a production-declared dependency, but the application source uses its CSS file via app/globals.css; no application route or client imports of its CLI or the affected pattern libraries were found in the targeted source search.
- Extension findings are in the Tailwind 3 / chokidar / fast-glob build and watch tooling. browser-extension-comment/tailwind.config.js contains a fixed repository-authored glob; no imports of the affected libraries were found in extension source or scripts.
- All **232** existing .next-audit production trace files (*.nft.json) were inspected for filenames containing braces, micromatch, or fast-glob; **zero matches**. This supports limited runtime exposure for this build. Dependency tracing and targeted source search do not prove the absence of vulnerable logic inside all bundled dependencies, nor do they constitute a complete runtime reachability analysis.

## Resolution status

**Unresolved high dependency advisory; no compatible upstream patch available at this check.** No package or lockfile changes were made in this follow-up. npm's suggested major changes (including Next lint configuration downgrade to 14 and shadcn downgrade to 1, or extension Tailwind 4 migration) are not a compatible security patch for the existing application. A broad tooling migration or locally maintained fork would introduce separate compatibility and maintenance risks and is not justified merely to suppress this audit finding.

No HTTP-input-to-vulnerable-parser path was identified in the inspected application. Build and developer tooling remain affected; avoid introducing user-supplied glob patterns into runtime code. Preserve the distinction between this bounded evidence and the advisory's general high severity.

Both CI commands remain present and unchanged:

- npm audit --audit-level=high
- npm audit --audit-level=high --prefix browser-extension-comment

With the current advisory data these security gates fail. Do not report a fully passing final pipeline or zero known vulnerabilities. Track an upstream braces fix (including the upstream report's linked fix proposal), apply a supported patch when published, regenerate the affected lockfiles, and rerun root/extension audit, lint, type checks, tests, and production builds. Until resolved or explicitly reviewed through the project's release process, the failing security gate is a release blocker.

No production systems, package installs, load tests, or exploit requests were used in this follow-up.
