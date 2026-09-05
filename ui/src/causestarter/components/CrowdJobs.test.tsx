import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CrowdJobs } from './CrowdJobs'

describe('CrowdJobs', () => {
  it('sends each job into its daily workspace', () => {
    render(
      <MemoryRouter>
        <CrowdJobs />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('crowd-job-workspace-money')).toHaveAttribute('href', '/dashboard')
    expect(screen.getByTestId('crowd-job-workspace-attention')).toHaveAttribute('href', '/dashboard')
    expect(screen.getByTestId('crowd-job-workspace-work')).toHaveAttribute('href', '/work')
    expect(screen.getByTestId('crowd-job-workspace-wording')).toHaveAttribute('href', '/statements')
  })
})
