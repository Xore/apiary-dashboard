import { DropdownMenu, DropdownMenuDivider, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu'
import { Icon } from '@astryxdesign/core/Icon'
import { BeakerIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { INCIDENTS, resolveAll, simulate } from '#/data/mock/incidents'
import { SCENARIOS, isScenario } from '#/data/scenario'

const SIGN_IN_PAGES = [
  { label: 'Show: sign-in', href: '/auth/login' },
  { label: 'Show: sign-in attempt expired', href: '/auth/callback?code=expired' },
  { label: 'Show: sign-in refused by the provider', href: '/auth/callback?error=invalid_request' },
  { label: 'Show: sign-in could not complete', href: '/auth/callback?code=failed' },
  { label: 'Show: sign-in unavailable', href: '/auth/login?fail=unavailable' },
]

/** The "Mock data" badge, as a switch: pick how the mock backend behaves
 * (empty, failing, slow, viewer role) and every page follows, or simulate
 * an operational incident to see the toasts. */
export function MockScenarioMenu({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const raw = useSearch({ strict: false, select: (search: Record<string, unknown>) => search.mock })
  const current = isScenario(raw) ? raw : 'normal'
  const active = SCENARIOS.find((s) => s.id === current)!
  return (
    <DropdownMenu
      placement="below"
      alignment="end"
      menuWidth={300}
      button={{
        label: current === 'normal' ? 'Mock data' : `Mock: ${active.label}`,
        icon: <Icon icon={BeakerIcon} size="sm" />,
        size: 'sm',
        variant: current === 'normal' ? 'secondary' : 'primary',
        // Narrow screens: the icon, with the scenario in its tooltip.
        ...(compact ? { isIconOnly: true, tooltip: current === 'normal' ? 'Mock data' : `Mock: ${active.label}` } : {}),
      }}
    >
      {SCENARIOS.map((scenario) => (
        <DropdownMenuItem
          key={scenario.id}
          label={scenario.label}
          description={scenario.description}
          endContent={scenario.id === current ? <Icon icon={CheckIcon} size="sm" /> : undefined}
          onClick={() => void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, mock: scenario.id === 'normal' ? undefined : scenario.id }) })}
        />
      ))}
      <DropdownMenuDivider />
      {/* Operational incidents: change source health in this tab, so the
          toasts and health pages can be seen raising and resolving. */}
      {INCIDENTS.map((incident) => (
        <DropdownMenuItem key={incident.id} label={`Simulate: ${incident.label.toLowerCase()}`} onClick={() => simulate(incident.id)} />
      ))}
      <DropdownMenuItem label="Simulate: everything recovers" onClick={resolveAll} />
      <DropdownMenuDivider />
      {/* The pages outside the shell: sign-in and the ways it fails. */}
      {SIGN_IN_PAGES.map((page) => (
        <DropdownMenuItem key={page.href} label={page.label} onClick={() => void navigate({ href: page.href })} />
      ))}
    </DropdownMenu>
  )
}
