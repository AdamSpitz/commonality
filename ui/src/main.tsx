import { activeManifest } from '@ui-active-domain'
import { injectActiveDomain } from './domains/activeDomain'
import { bootUi } from './bootUi'

injectActiveDomain(activeManifest)
void bootUi()
