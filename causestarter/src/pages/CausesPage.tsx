import { YourCauses } from '../components/YourCauses'
import { useUserCauses } from '../hooks/useUserCauses'

export function CausesPage() {
  const { causes, loading } = useUserCauses()
  return <YourCauses causes={causes} loading={loading} />
}
