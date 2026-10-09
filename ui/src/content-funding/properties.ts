/** A configured content check. Its board is the attested-item list for that check. */
export interface ContentProperty {
  id: string
  label: string
  summary: string
  /**
   * When set, the property statement and topic are the baked noninflammatory
   * meta-statement (`VITE_NONINFLAMMATORY_TOPIC_CID`), not a second CID.
   */
  usesNoninflammatoryTopic?: boolean
}

export const CONTENT_PROPERTIES: readonly ContentProperty[] = [
  {
    id: 'civility',
    label: 'Noninflammatory',
    summary: 'Posts a trusted attester has marked as political writing a reasonable opponent could read without contempt, caricature, or inflammatory framing.',
    usesNoninflammatoryTopic: true,
  },
]

export function getContentProperty(id: string): ContentProperty | undefined {
  return CONTENT_PROPERTIES.find((property) => property.id === id)
}
