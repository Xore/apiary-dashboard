// @vitest-environment jsdom
// The frame every entity page shares (epic #25): tabs as route segments in
// the top bar, prev/next through the list it was opened from, and pinning.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Theme } from '@astryxdesign/core/theme'
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { saveListContext } from '#/lib/listContext'
import { getPins } from '#/lib/watchlist'
import { neutralTheme } from '#/themes/neutral/neutral'
import { EntityFrame } from './EntityFrame'
import { RouterLink } from './RouterLink'
import { ViewTabsBar } from './ViewTabs'

function Thing() {
  const { id } = thing.useParams()
  return (
    <EntityFrame
      kind="Thing"
      title={`Thing ${id}`}
      basePath={`/things/${encodeURIComponent(id)}`}
      facts={[{ label: 'Colour', value: 'teal' }]}
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'detail', label: 'Detail', count: 3 },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

const root = createRootRoute({
  component: () => (
    <>
      <nav aria-label="Page header">
        <ViewTabsBar />
      </nav>
      <Outlet />
    </>
  ),
})
const thing = createRoute({ getParentRoute: () => root, path: '/things/$id', component: Thing })
const overview = createRoute({ getParentRoute: () => thing, path: '/', component: () => <p>overview body</p> })
const detail = createRoute({ getParentRoute: () => thing, path: '/detail', component: () => <p>detail body</p> })
const list = createRoute({ getParentRoute: () => root, path: '/things', component: () => <p>the list</p> })

function renderAt(path: string) {
  const router = createRouter({
    routeTree: root.addChildren([list, thing.addChildren([overview, detail])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <Theme theme={neutralTheme}>
      <LinkProvider component={RouterLink}>
        <RouterProvider router={router} />
      </LinkProvider>
    </Theme>,
  )
  return router
}

// Tabs render as Astryx tab buttons carrying data-tab-value; the active one
// has the selected class.
const tab = async (name: RegExp) => (await screen.findAllByText(name))[0].closest<HTMLElement>('[data-tab-value]')!
const isSelected = (element: HTMLElement) => element.classList.contains('selected')

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})
afterEach(cleanup)

describe('EntityFrame', () => {
  it('shows identity, facts, and its tabs in the top bar', async () => {
    renderAt('/things/a')
    expect(await screen.findByText('overview body')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Thing a' })).toBeTruthy()
    expect(screen.getByText('teal')).toBeTruthy()
    expect(isSelected(await tab(/^Overview/))).toBe(true)
    expect(await tab(/^Detail \(3\)/)).toBeTruthy()
  })

  it('selects the tab from the path, even for ids with encoded characters', async () => {
    renderAt(`/things/${encodeURIComponent('a b|c')}/detail`)
    expect(await screen.findByText('detail body')).toBeTruthy()
    expect(isSelected(await tab(/^Detail/))).toBe(true)
  })

  it('navigates between tabs as route segments', async () => {
    const router = renderAt('/things/a')
    await screen.findByText('overview body')
    await userEvent.click(await tab(/^Detail/))
    expect(await screen.findByText('detail body')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/things/a/detail')
    await userEvent.click(await tab(/^Overview/))
    expect(await screen.findByText('overview body')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/things/a')
  })

  it('steps through the list it was opened from with J and K, keeping the tab', async () => {
    saveListContext({ listHref: '/things', listTitle: 'Things', hrefs: ['/things/a', '/things/b', '/things/c'] })
    const router = renderAt('/things/b/detail')
    await screen.findByText('detail body')
    expect(await screen.findByText('2 of 3')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to Things' })).toBeTruthy()
    await act(async () => {
      await userEvent.keyboard('j')
    })
    await screen.findByText('Thing c')
    expect(router.state.location.pathname).toBe('/things/c/detail')
    await act(async () => {
      await userEvent.keyboard('k')
    })
    await screen.findByText('Thing b')
    expect(router.state.location.pathname).toBe('/things/b/detail')
  })

  it('pins the entity to the watchlist and back', async () => {
    renderAt('/things/a')
    await screen.findByText('overview body')
    await userEvent.click(screen.getByRole('button', { name: 'Pin to watchlist' }))
    expect(getPins()).toMatchObject([{ href: '/things/a', kind: 'Thing', title: 'Thing a' }])
    await userEvent.click(screen.getByRole('button', { name: 'Unpin from watchlist' }))
    expect(getPins()).toHaveLength(0)
  })
})
