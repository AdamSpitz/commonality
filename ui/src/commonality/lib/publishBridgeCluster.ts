import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { WriteClients } from '@commonality/sdk/utils'
import {
  attestablePairs,
  publishCluster,
  type BridgeClusterFields,
} from './bridgeCluster'
import { publishParentToModifiedNudges } from './bridgeNudges'
import { formatPairSummary, submitPairsToAttester } from './implicationAttesterClient'
import {
  normalizeSlug,
  publishRoster,
  rosterFieldsFromCause,
  validateSlug,
} from './causeRoster'
import { type BridgeDraft } from './bridgeStore'
import {
  createCause,
  markPlankPublished,
  markRosterPublished,
  updateCause,
  type CausePlank,
} from './causeStore'
import { publishPlank } from './publishPlank'
import { parentSlotUsed, slugOrEmpty, withStandInNotice } from './bridgeClusterPageHelpers'

export async function publishBridgeClusterDraft(args: {
  draft: BridgeDraft
  address: `0x${string}`
  machinery: SDKMachinery
  writeClients: WriteClients
  submitPairs: boolean
  publishNudges: boolean
  onStatus: (status: string) => void
}): Promise<{
  fields: BridgeClusterFields
  clusterSlug: string
  clusterCid: string
  bridgeSlug: string
  bridgeRosterCid: string
  followUps: string[]
}> {
  const { draft, address, machinery, writeClients, submitPairs, publishNudges, onStatus } = args
  const clusterSlug = slugOrEmpty(draft.slug || draft.mediatorName || 'bridge')
  const slugError = validateSlug(clusterSlug)
  if (slugError) throw new Error(slugError)
  if (!draft.mediatorName.trim()) {
    throw new Error('Name the mediator. Authorship has to be loud.')
  }

  onStatus('Publishing planks and causes…')
  const publishedParents = []
  const publishedModified = []
  const publishedStandInPlanks = new Map<string, CausePlank[]>()

  const parentsToPublish = draft.parents.filter(parentSlotUsed)
  if (parentsToPublish.length === 0) {
    throw new Error('Add at least one parent cause (published or stand-in).')
  }

  for (const parent of parentsToPublish) {
    let parentOwner: `0x${string}`
    let parentSlug: string

    if (parent.kind === 'stand-in') {
      parentOwner = address.toLowerCase() as `0x${string}`
      parentSlug = slugOrEmpty(parent.slug || parent.title || `stand-in-${clusterSlug}`)
      if (validateSlug(parentSlug)) throw new Error(`Stand-in slug: ${validateSlug(parentSlug)}`)
      const standInPlanks = parent.parentPlanks.filter((p) => p.text.trim())
      if (standInPlanks.length === 0) throw new Error('A stand-in parent needs at least one plank.')
      const local = createCause()
      updateCause(local.id, {
        title: parent.title.trim() || 'Stand-in cause',
        summary: withStandInNotice(parent.summary),
        slug: parentSlug,
        planks: standInPlanks,
      })
      const nextPlanks: CausePlank[] = []
      for (const plank of standInPlanks) {
        if (plank.cid) {
          nextPlanks.push(plank)
          continue
        }
        const cid = await publishPlank({ machinery, writeClients, text: plank.text })
        markPlankPublished(local.id, plank.id, cid, plank.text)
        nextPlanks.push({ ...plank, cid })
      }
      const forRoster = updateCause(local.id, { planks: nextPlanks })
      if (!forRoster) throw new Error('Lost the stand-in cause while publishing.')
      const roster = await publishRoster({
        machinery,
        writeClients,
        slug: parentSlug,
        fields: rosterFieldsFromCause(forRoster),
      })
      markRosterPublished(local.id, {
        slug: parentSlug,
        founderAddress: address,
        rosterCid: roster.rosterCid,
      })
      publishedStandInPlanks.set(parent.id, nextPlanks)
      publishedParents.push({ owner: parentOwner, slug: parentSlug })
    } else {
      if (!parent.owner.trim() || !parent.slug.trim()) {
        throw new Error('Every published parent needs an owner and slug.')
      }
      parentOwner = parent.owner.trim().toLowerCase() as `0x${string}`
      parentSlug = normalizeSlug(parent.slug)
      publishedParents.push({ owner: parentOwner, slug: parentSlug })
    }

    if (parent.skipModified) continue

    const modifiedSlug = slugOrEmpty(parent.modified.slug || `${parentSlug}-modified`)
    if (validateSlug(modifiedSlug)) throw new Error(`Modified slug: ${validateSlug(modifiedSlug)}`)

    const local = createCause()
    const causeId = local.id
    updateCause(causeId, {
      title: parent.modified.title.trim() || `Modified ${parent.title || parentSlug}`,
      summary: parent.modified.summary,
      slug: modifiedSlug,
      planks: parent.modified.planks.filter((p) => p.text.trim()),
      bridgeCluster: {
        clusterOwner: address.toLowerCase() as `0x${string}`,
        clusterSlug,
        role: 'modified',
        parentOwner,
        parentSlug,
      },
    })

    const nextPlanks = []
    for (const plank of parent.modified.planks.filter((p) => p.text.trim())) {
      if (plank.cid) {
        nextPlanks.push(plank)
        continue
      }
      const cid = await publishPlank({ machinery, writeClients, text: plank.text })
      markPlankPublished(causeId, plank.id, cid, plank.text)
      nextPlanks.push({ ...plank, cid })
    }
    const forRoster = updateCause(causeId, { planks: nextPlanks })
    if (!forRoster) throw new Error('Lost the modified cause while publishing.')
    const roster = await publishRoster({
      machinery,
      writeClients,
      slug: modifiedSlug,
      fields: rosterFieldsFromCause(forRoster),
    })
    markRosterPublished(causeId, {
      slug: modifiedSlug,
      founderAddress: address,
      rosterCid: roster.rosterCid,
    })
    publishedModified.push({
      owner: address.toLowerCase() as `0x${string}`,
      slug: modifiedSlug,
      parentOwner,
      parentSlug,
      planks: nextPlanks,
    })
  }

  const bridgeSlug = slugOrEmpty(draft.bridge.slug || `${clusterSlug}-cause`)
  if (validateSlug(bridgeSlug)) throw new Error(`Bridge slug: ${validateSlug(bridgeSlug)}`)
  const bridgeLocal = createCause()
  updateCause(bridgeLocal.id, {
    title: draft.bridge.title.trim() || draft.mediatorName.trim(),
    summary: draft.bridge.summary,
    slug: bridgeSlug,
    planks: draft.bridge.planks.filter((p) => p.text.trim()),
    bridgeCluster: {
      clusterOwner: address.toLowerCase() as `0x${string}`,
      clusterSlug,
      role: 'bridge',
    },
  })
  const bridgePlanks: CausePlank[] = []
  for (const plank of draft.bridge.planks.filter((p) => p.text.trim())) {
    if (plank.cid) {
      bridgePlanks.push(plank)
      continue
    }
    const cid = await publishPlank({ machinery, writeClients, text: plank.text })
    markPlankPublished(bridgeLocal.id, plank.id, cid, plank.text)
    bridgePlanks.push({ ...plank, cid })
  }
  const bridgeCause = updateCause(bridgeLocal.id, { planks: bridgePlanks })
  if (!bridgeCause) throw new Error('Lost the bridge cause while publishing.')
  const bridgeRoster = await publishRoster({
    machinery,
    writeClients,
    slug: bridgeSlug,
    fields: rosterFieldsFromCause(bridgeCause),
  })
  markRosterPublished(bridgeLocal.id, {
    slug: bridgeSlug,
    founderAddress: address,
    rosterCid: bridgeRoster.rosterCid,
  })

  const idToCid = new Map<string, string>()
  for (const parent of draft.parents) {
    for (const plank of parent.parentPlanks) if (plank.cid) idToCid.set(plank.id, plank.cid)
    publishedStandInPlanks.get(parent.id)?.forEach((plank, index) => {
      const original = parent.parentPlanks.filter((p) => p.text.trim())[index]
      if (original && plank.cid) idToCid.set(original.id, plank.cid)
    })
    const publishedMod = publishedModified.find((m) => m.parentSlug === normalizeSlug(parent.slug))
    publishedMod?.planks.forEach((plank, index) => {
      const original = parent.modified.planks.filter((p) => p.text.trim())[index]
      if (original && plank.cid) idToCid.set(original.id, plank.cid)
    })
  }
  draft.bridge.planks.filter((p) => p.text.trim()).forEach((plank, index) => {
    const publishedPlank = bridgePlanks[index]
    if (publishedPlank?.cid) idToCid.set(plank.id, publishedPlank.cid)
  })

  const pairs = draft.pairs.flatMap((pair) => {
    const fromCid = idToCid.get(pair.fromPlankId)
    const toCid = idToCid.get(pair.toPlankId)
    return fromCid && toCid ? [{ fromCid, toCid, role: pair.role }] : []
  })

  const fields: BridgeClusterFields = {
    mediatorName: draft.mediatorName.trim(),
    mediatorNote: draft.mediatorNote.trim(),
    mediatorAddress: address.toLowerCase() as `0x${string}`,
    parents: publishedParents,
    modified: publishedModified.map(({ owner, slug, parentOwner, parentSlug }) => ({
      owner, slug, parentOwner, parentSlug,
    })),
    bridge: { owner: address.toLowerCase() as `0x${string}`, slug: bridgeSlug },
    pairs,
  }

  onStatus('Sealing the cluster document…')
  const result = await publishCluster({
    machinery,
    writeClients,
    slug: clusterSlug,
    fields,
  })

  const followUps: string[] = ['Published the cluster.']
  if (submitPairs) {
    onStatus('Paying the implication attester for recorded pairs…')
    const submitted = await submitPairsToAttester({
      writeClients,
      pairs: attestablePairs(fields),
    })
    followUps.push(formatPairSummary(submitted.results))
  }
  if (publishNudges) {
    onStatus('Publishing parent→modified nudge batch…')
    const batch = await publishParentToModifiedNudges({
      writeClients,
      mediatorAddress: address,
      fields,
    })
    followUps.push(`Published parent→modified nudges (${batch.batchCid.slice(0, 12)}…).`)
  }
  if (!submitPairs && !publishNudges) {
    followUps.push('Pairs are recorded as intended arrows. Submit them to the attester when you are ready; they are not invented automatically.')
  }

  return {
    fields,
    clusterSlug,
    clusterCid: result.clusterCid,
    bridgeSlug,
    bridgeRosterCid: bridgeRoster.rosterCid,
    followUps,
  }
}
