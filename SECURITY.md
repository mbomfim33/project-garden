# Security

This is a personal tool. It runs entirely in the browser, has no server, no
accounts, and sends nothing anywhere. The only data it keeps is in your own
browser storage.

If you find a problem, open an issue on the repository.

## What is in place

- Every dependency is pinned to an exact version. `npm ci` installs only what
  the lockfile says, and CI fails if the lockfile changes.
- `.npmrc` sets `ignore-scripts=true`, so no package can run code during
  install.
- GitHub Actions are pinned to a commit hash rather than a tag, because a tag
  can be moved to point at different code.
- Workflows are read-only by default and do not keep credentials in the
  checkout.
- The built page carries a content security policy that allows nothing from
  anywhere else. `public/_headers` repeats it for hosts that can send real
  headers, plus `nosniff`, `no-referrer` and frame blocking.
- CodeQL runs on pushes, on pull requests, and weekly.

## Worth turning on for the repository itself

These are settings, not files, so they cannot live in the source:

- Require the CI check to pass before merging to `main`.
- Require signed commits, if you sign yours.
- Turn on secret scanning and push protection.
- Restrict who can change Actions permissions.
