import { RetroFundingStory } from '../domains/lazy-giving/RetroFundingStory'
import { DocsPage } from './DocsPage'

export function LazyGivingDocsPage() {
  return <DocsPage diagram={<RetroFundingStory />} />
}
