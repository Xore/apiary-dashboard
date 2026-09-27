// Signs a check script in, the way an operator does: through the mock
// identity provider's callback, which answers with the session cookie.
import type { BrowserContext } from 'playwright-core'

export async function sessionCookie(base: string, role: 'admin' | 'viewer' = 'admin'): Promise<{ name: string; value: string; header: string }> {
  const response = await fetch(`${base}/auth/callback?code=mock&role=${role}`, { redirect: 'manual' })
  const cookie = response.headers.get('set-cookie')?.split(';')[0]
  if (!cookie) throw new Error(`sign-in failed: ${response.status}`)
  const [name, ...rest] = cookie.split('=')
  return { name, value: rest.join('='), header: cookie }
}

/** Signs a browser context in by visiting the callback, as a person's
 * browser would (a __Host- cookie cannot be injected for an http origin). */
export async function signInContext(context: BrowserContext, base: string, role: 'admin' | 'viewer' = 'admin'): Promise<void> {
  const page = await context.newPage()
  await page.goto(`${base}/auth/callback?code=mock&role=${role}&return_to=%2Fhealthz`, { waitUntil: 'load' })
  await page.close()
}
