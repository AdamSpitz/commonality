export const ARTIFACT_TYPES = [
  'cause',
  'goal',
  'belief',
  'plank',
  'statement',
  'project',
] as const

export type ArtifactType = (typeof ARTIFACT_TYPES)[number]

export interface ArtifactKind {
  id: ArtifactType
  label: string
  hint: string
}

export const ARTIFACT_KINDS: ArtifactKind[] = [
  {
    id: 'cause',
    label: 'Cause',
    hint: 'Named campaign, board, or publication someone could join — a title or one-sentence summary, not a slogan.',
  },
  {
    id: 'goal',
    label: 'Goal',
    hint: 'A desired future state or outcome (“I want 285,000 homes in Toronto by 2031”).',
  },
  {
    id: 'belief',
    label: 'Belief',
    hint: 'A proposition someone would sign as true (“Abortion should be legal in all or most cases”). Not a survey question.',
  },
  {
    id: 'plank',
    label: 'Plank',
    hint: 'One independently signable civic claim, specific enough to align a project with.',
  },
  {
    id: 'statement',
    label: 'Statement',
    hint: 'Generic signable issue-statement when the finer role is unclear.',
  },
  {
    id: 'project',
    label: 'Project',
    hint: 'Concrete work toward a goal (a garden, a library, a protocol) — not a funding mechanism.',
  },
]

export function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as readonly string[]).includes(value)
}
