// The top-bar tab models are pure functions of route state, which is what
// lets the bar draw them before a page's data arrives.
import { describe, expect, it } from 'vitest'
import { entityTabs, searchTabs } from './ViewTabs'

describe('entityTabs', () => {
  const spec = entityTabs({
    label: 'Thing views',
    basePath: (params) => `/things/${encodeURIComponent(params.id)}`,
    tabs: (loaded) => [
      { id: 'overview', label: 'Overview' },
      { id: 'detail', label: 'Detail', count: (loaded as { n: number } | undefined)?.n },
    ],
  })

  it('draws labels without counts before the data loads, then with them', () => {
    const before = spec({ params: { id: 'a' }, search: {}, pathname: '/things/a', data: undefined })
    expect(before.tabs.map((t) => t.count)).toEqual([undefined, undefined])
    const after = spec({ params: { id: 'a' }, search: {}, pathname: '/things/a', data: { n: 4 } })
    expect(after.tabs[1].count).toBe(4)
  })

  it('selects the tab from the path, encoded or not, and links tabs as segments', () => {
    const model = spec({ params: { id: 'a b|c' }, search: {}, pathname: '/things/a b|c/detail', data: undefined })
    expect(model.value).toBe('detail')
    expect(model.href?.('overview')).toBe('/things/a%20b%7Cc')
    expect(model.href?.('detail')).toBe('/things/a%20b%7Cc/detail')
    expect(spec({ params: { id: 'a' }, search: {}, pathname: '/things/a', data: undefined }).value).toBe('overview')
  })
})

describe('searchTabs', () => {
  const spec = searchTabs({ label: 'Views', param: 'view', tabs: () => [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }] })

  it('reads the tab from the search param, defaulting to the first', () => {
    expect(spec({ params: {}, search: {}, pathname: '/', data: undefined }).value).toBe('one')
    expect(spec({ params: {}, search: { view: 'two' }, pathname: '/', data: undefined }).value).toBe('two')
    expect(spec({ params: {}, search: { view: 'nope' }, pathname: '/', data: undefined }).value).toBe('one')
  })

  it('keeps the default out of the URL', () => {
    const model = spec({ params: {}, search: {}, pathname: '/', data: undefined })
    expect(model.search?.('one')).toEqual({ view: undefined })
    expect(model.search?.('two')).toEqual({ view: 'two' })
  })
})
