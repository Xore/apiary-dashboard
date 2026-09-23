// @vitest-environment jsdom
// Shell composition (#4): one shell, one content region, navigation metadata
// driving active item and breadcrumbs, and the palette's keyboard contract.
import { describe, expect, it } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Theme } from '@astryxdesign/core/theme'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { NAV_SECTIONS } from '#/lib/nav'
import { neutralTheme } from '#/themes/neutral/neutral'
import { RouterLink } from './RouterLink'
import { ShellAppShell } from './ShellAppShell'

const user = { name: 'Test Operator', email: 'op@example.test', roles: ['admin'] }

function renderShell(path: string) {
  const root = createRootRoute({ component: () => <ShellAppShell user={user} /> })
  const page = (routePath: string, text: string) =>
    createRoute({ getParentRoute: () => root, path: routePath, component: () => <p>{text}</p> })
  const router = createRouter({
    routeTree: root.addChildren([
      page('/', 'overview content'),
      page('/events', 'events content'),
      page('/event/$id', 'event detail content'),
      page('/alerts', 'alerts content'),
      page('/settings', 'settings content'),
    ]),
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

describe('ShellAppShell', () => {

  it('renders exactly one shell with one content region', async () => {
    renderShell('/alerts')
    expect(await screen.findByText('alerts content')).toBeTruthy()
    const regions = screen.getAllByRole('main')
    expect(regions).toHaveLength(1)
    expect(within(regions[0]).getByText('alerts content')).toBeTruthy()
    expect(screen.getAllByRole('navigation', { name: 'Side navigation' })).toHaveLength(1)
    expect(screen.getAllByRole('navigation', { name: 'Page header' })).toHaveLength(1)
  })

  it('renders the full sidebar from navigation metadata', async () => {
    renderShell('/')
    await screen.findByText('overview content')
    for (const section of ['Monitor', 'Investigate', 'Operations', 'Reports', 'Tools', 'Evidence']) {
      expect(screen.getAllByText(section).length).toBeGreaterThan(0)
    }
    const sidebar = screen.getByRole('navigation', { name: 'Side navigation' })
    for (const item of NAV_SECTIONS.flatMap((section) => section.items)) {
      expect(within(sidebar).getByRole('link', { name: item.label }).getAttribute('href')).toBe(item.to)
    }
  })

  it('marks the parent nav item and breadcrumbs for a drill-down route', async () => {
    renderShell('/event/evt-123')
    await screen.findByText('event detail content')
    const sidebar = screen.getByRole('navigation', { name: 'Side navigation' })
    const active = within(sidebar).getByRole('link', { name: 'Event explorer' })
    expect(active.getAttribute('aria-current')).toBe('page')
    const crumbs = screen.getByRole('navigation', { name: 'Current page' })
    expect(crumbs.textContent).toContain('Investigate')
    expect(crumbs.textContent).toContain('Event explorer')
    expect(crumbs.textContent).toContain('Event detail')
  })

  it('shows the signed-in user in the account menu', async () => {
    renderShell('/')
    await screen.findByText('overview content')
    expect(screen.getByRole('button', { name: /Test Operator/ })).toBeTruthy()
  })

  it('opens the palette with Ctrl+K and navigates to the chosen page', async () => {
    const router = renderShell('/')
    await screen.findByText('overview content')
    const u = userEvent.setup()
    await u.keyboard('{Control>}k{/Control}')
    const dialog = await screen.findByRole('dialog')
    await u.keyboard('Alerts')
    await u.click(await within(dialog).findByText('Alerts'))
    await act(async () => {})
    expect(router.state.location.pathname).toBe('/alerts')
    expect(await screen.findByText('alerts content')).toBeTruthy()
  })
})
