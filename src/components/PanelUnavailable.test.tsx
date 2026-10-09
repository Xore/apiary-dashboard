// @vitest-environment jsdom
// A panel whose read the backend does not serve yet (#221) says so, and
// does not render an empty list that reads as "nothing happened".
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '#/themes/neutral/neutral-family'
import { Timeline } from './EntityBlocks'
import { RelatedPanel } from './Related'

const detail = 'not available from the backend yet (Xore/APIARY#3554)'

const wrap = (node: React.ReactNode) => <Theme theme={neutralTheme}>{node}</Theme>

afterEach(cleanup)

describe('a panel whose data is unavailable', () => {
  it('names what is missing in the related panel', () => {
    render(wrap(<RelatedPanel center="203.0.113.4" groups={{ unavailable: detail }} />))
    expect(screen.getByText('Not available from the backend yet')).toBeTruthy()
    expect(screen.getByText(detail)).toBeTruthy()
  })

  it('names what is missing in the timeline, not the empty-range message', () => {
    render(wrap(<Timeline items={{ unavailable: detail }} />))
    expect(screen.getByText('Not available from the backend yet')).toBeTruthy()
    expect(screen.queryByText('Nothing happened in this time range.')).toBeNull()
  })

  it('still shows the empty message for a timeline the backend answered with no items', () => {
    render(wrap(<Timeline items={[]} />))
    expect(screen.getByText('Nothing happened in this time range.')).toBeTruthy()
    expect(screen.queryByText('Not available from the backend yet')).toBeNull()
  })
})
