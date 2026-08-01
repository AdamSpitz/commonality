// Which absolute hrefs in the public docs are meant to resolve as app routes.
//
// Two trees are deployed as files rather than as routes, so they appear in no
// route table and must be excluded from route-resolution checks:
//   /docs/      — the end-user docs themselves, validated instead by
//                 scripts/check-docs-links.sh
//   /api-docs/  — the generated SDK and contract references, which
//                 scripts/deploy-ui.sh copies into each domain's bundle
//
// Everything else is expected to resolve as a route. That is deliberate: a link
// into a repo-internal tree (/specs/, /workflow/, ...) resolves on disk but is
// never published, so failing the route lookup is the correct outcome.
// scripts/check-docs-inventory.mjs catches the same mistake earlier with a more
// specific message.
const deployedFileTrees = ['/docs/', '/api-docs/']

export function isRouteResolvableDocLink(rawHref: string): boolean {
  if (!rawHref.startsWith('/')) return false
  return !deployedFileTrees.some((tree) => rawHref.startsWith(tree))
}
