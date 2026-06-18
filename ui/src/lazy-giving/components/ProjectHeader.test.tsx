import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProjectHeader } from './ProjectHeader'

function makeProject(overrides: Record<string, any> = {}): any {
  const now = Math.floor(Date.now() / 1000)
  return {
    id: '0x1234567890abcdef1234567890abcdef12345678',
    erc1155Address: '0xaaaa000000000000000000000000000000000001',
    recipient: '0xbbbb000000000000000000000000000000000002',
    threshold: '1000000000000000000',
    deadline: String(now + 86400),
    totalReceived: '500000000000000000',
    metadataCid: 'bafytest123',
    createdAt: '1700000000',
    ...overrides,
  }
}

describe('ProjectHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders project name from metadata', () => {
    const project = makeProject()
    const metadata = { name: 'My Cool Project', description: 'A great project' }
    render(<ProjectHeader project={project} metadata={metadata} />)
    expect(screen.getByRole('heading', { name: 'My Cool Project' })).toBeInTheDocument()
  })

  it('renders truncated address when no metadata name', () => {
    const project = makeProject()
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText(/Project 0x12345678\.\.\./)).toBeInTheDocument()
  })

  it('renders description from metadata', () => {
    const project = makeProject()
    const metadata = { name: 'Test', description: 'A detailed description' }
    render(<ProjectHeader project={project} metadata={metadata} />)
    expect(screen.getByText('A detailed description')).toBeInTheDocument()
  })

  it('does not render description when metadata has no description', () => {
    const project = makeProject()
    const metadata = { name: 'Test' }
    render(<ProjectHeader project={project} metadata={metadata} />)
    expect(screen.queryByText('A detailed description')).not.toBeInTheDocument()
  })

  it('renders an external progress updates link from metadata', () => {
    const project = makeProject()
    const metadata = { name: 'Test', updatesUrl: 'https://updates.example/project' }
    render(<ProjectHeader project={project} metadata={metadata} />)

    expect(screen.getByText(/progress updates/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'https://updates.example/project' })
    expect(link).toHaveAttribute('href', 'https://updates.example/project')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders truncated recipient address with a copy button', () => {
    const project = makeProject()
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText(/Recipient:/)).toBeInTheDocument()
    expect(screen.getByText(/0xbbbb\.\.\.0002/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy recipient address/i })).toBeInTheDocument()
  })

  it('displays Funding status badge for active projects', () => {
    const project = makeProject()
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText('Funding')).toBeInTheDocument()
  })

  it('displays Succeeded status badge when threshold met', () => {
    const project = makeProject({ totalReceived: '2000000000000000000' })
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
  })

  it('displays Refunding status badge when deadline passed and threshold not met', () => {
    const now = Math.floor(Date.now() / 1000)
    const project = makeProject({ deadline: String(now - 86400) })
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText('Refunding')).toBeInTheDocument()
  })

  it('displays deadline relative time', () => {
    const now = Math.floor(Date.now() / 1000)
    const project = makeProject({ deadline: String(now + 86400 * 3 + 3600 * 5) })
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText(/3d 5h left/)).toBeInTheDocument()
  })

  it('displays Ended for past deadlines', () => {
    const now = Math.floor(Date.now() / 1000)
    const project = makeProject({ deadline: String(now - 86400) })
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText('Ended')).toBeInTheDocument()
  })

  it('displays funding progress as ETH amounts', () => {
    const project = makeProject()
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText('0.5 of 1 ETH raised')).toBeInTheDocument()
  })

  it('displays funding percentage', () => {
    const project = makeProject()
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('caps progress at 100% when over threshold', () => {
    const project = makeProject({ totalReceived: '5000000000000000000' })
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('labels threshold-zero projects as having no minimum', () => {
    const project = makeProject({ threshold: '0', totalReceived: '0' })
    render(<ProjectHeader project={project} metadata={null} />)
    expect(screen.getAllByText(/No minimum/).length).toBeGreaterThan(0)
  })
})
