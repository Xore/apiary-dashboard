import type { RedisLike } from './session'

/** A Redis for tests: the four commands, TTLs ignored. */
export function fakeRedis(): RedisLike & { keys: Map<string, string> } {
  const keys = new Map<string, string>()
  return {
    keys,
    set: async (key: string, value: string) => (keys.set(key, value), 'OK' as const),
    get: async (key: string) => keys.get(key) ?? null,
    getdel: (async (key: string) => {
      const value = keys.get(key) ?? null
      keys.delete(key)
      return value
    }),
    del: (async (key: string) => Number(keys.delete(key))) as never,
  }
}
