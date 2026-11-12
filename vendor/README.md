# Temporary verifier package

`adamspitz-verifier-b362ace.tgz` is an npm package built from the standalone
`@adamspitz/verifier` repository at commit
`b362aceba788bdfde3014f6667fe34a86c9335f1` (clean source tree).
It was produced with `npm pack`, which runs the package's TypeScript build.

The registry's current `0.1.2` release does not support the skipped status,
expense metadata, or tree views used by this workspace. This archive includes
the built runtime so a fresh checkout and CI do not need a sibling verifier
checkout or its build toolchain. The archive retains upstream's `0.1.2` package
version; its commit-specific filename and lockfile integrity identify this build.

Replace this archive dependency with a published release containing that commit
once one is available, then remove the archive and this note.
