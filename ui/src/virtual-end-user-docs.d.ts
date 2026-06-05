declare module 'virtual:end-user-docs' {
  // Maps a doc path relative to docs/end-user/ (e.g. "shared/key-ideas/delegation.md")
  // to its raw markdown contents. Populated per-domain by endUserDocsPlugin.
  const docs: Record<string, string>
  export default docs
}
