// Who is signed in, for pages that gate what they offer. The layout loads
// the session once; everything below it reads it from there.
import { getRouteApi } from '@tanstack/react-router'
import type { SessionUser } from '#/data/types'

const layout = getRouteApi('/_layout')

export const useSessionUser = (): SessionUser => layout.useLoaderData()

/** Writes that change the deployment (block, purge, rotate, run, publish)
 * need the admin role; the backend refuses them for anyone else too. */
export const useIsAdmin = (): boolean => useSessionUser().roles.includes('admin')

export const ADMIN_REQUIRED = 'Admin role required.'
