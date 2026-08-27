import type { SDKMachinery } from '@commonality/sdk/machinery'
import { StatementPicker as SharedStatementPicker } from '../../shared'
import { atomizeCause } from '../lib/causeAssistClient'
import {
  existingPlanksForAtomize,
  recordStatementPickerEvent,
  type StatementPickerIntent,
  type StatementPickerSelection,
} from '../lib/statementPicker'

interface Props {
  intent: StatementPickerIntent
  machinery: SDKMachinery
  existingCids: readonly string[]
  existingPlankTexts?: readonly string[]
  disabled?: boolean
  onSelect: (selection: StatementPickerSelection) => void
}

export function StatementPicker({
  intent, machinery, existingCids, existingPlankTexts = [], disabled, onSelect,
}: Props) {
  return (
    <SharedStatementPicker
      intent={intent}
      machinery={machinery}
      excludeCids={existingCids}
      disabled={disabled}
      onSelect={(selection) => onSelect({ text: selection.text, cid: selection.cid, source: 'existing' })}
      onDraftSelect={(draft) => onSelect({ text: draft.text, source: 'drafted' })}
      onTelemetry={(event) => recordStatementPickerEvent(intent, event)}
      draftFetcher={async (query) => {
        const response = await atomizeCause({
          description: query,
          existingPlanks: existingPlanksForAtomize(existingPlankTexts),
          count: 4,
        })
        return response.planks
      }}
    />
  )
}
