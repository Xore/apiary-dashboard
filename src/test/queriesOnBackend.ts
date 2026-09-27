// For tests that run real routes: the data seam's module with every query
// answered by the mock backend in-process, in place of the server functions
// (which need Start's request runtime). Use it as the factory of
//   vi.mock('#/data/queries', () => import('#/test/queriesOnBackend').then((m) => m.queriesOnBackend()))
export async function queriesOnBackend() {
  const [{ backend }, shared] = await Promise.all([import('#/data/backend'), import('#/data/shared')])
  return { ...shared, ...backend() }
}
