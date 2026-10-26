import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { expect, it } from 'vitest'
import { TestDataAreaPage } from './TestDataAreaPage'

function Destination() {
  const location = useLocation()
  return <div>{location.pathname}{location.search}</div>
}

it('redirects bookmarked area URLs to the filtered run, preserving the capability', () => {
  render(<MemoryRouter initialEntries={['/admin/test-data/run-1/areas/ai?key=capability']}>
    <Routes>
      <Route path="/admin/test-data/:runId/areas/:areaId" element={<TestDataAreaPage />} />
      <Route path="/admin/test-data/:runId" element={<Destination />} />
    </Routes>
  </MemoryRouter>)
  expect(screen.getByText('/admin/test-data/run-1?key=capability&area=ai')).toBeTruthy()
})
