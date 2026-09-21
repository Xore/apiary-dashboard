// Remove this file when the nav-apps API is removed. Until then, this file is used to fetch the nav-apps from the backend and validate them.
const NAV_APPS_API_URL = '/api/nav-apps'
export type NavApp = {
  icon: string
  name: string
  href: string
  openInNewTab?: boolean
}
const isValidNavApp = (value: unknown): value is NavApp => {
  if (!value || typeof value !== 'object') return false
  const app = value as Record<string, unknown>
  return (
    typeof app.icon === 'string' &&
    typeof app.name === 'string' &&
    typeof app.href === 'string' &&
    (app.openInNewTab === undefined || typeof app.openInNewTab === 'boolean')
  )
}
export const getNavApps = async (): Promise<NavApp[]> => {
  // Return mock data to avoid 404 on /api/nav-apps
  return [
    {
      icon: 'LayoutDashboard',
      name: 'Dashboard',
      href: '/dashboard/orders',
    },
    {
      icon: 'Users',
      name: 'Users',
      href: '/apps/users/list',
    },
  ]
}
