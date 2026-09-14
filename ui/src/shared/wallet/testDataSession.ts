import { createContext, useContext } from 'react'

/** True while CauseStarter is using an in-memory test-data signer. */
export const TestDataSessionContext = createContext(false)

export function useTestDataSession() {
  return useContext(TestDataSessionContext)
}
