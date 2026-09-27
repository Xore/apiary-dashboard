import { describe, expect, it } from 'vitest'
import { settingsItems } from './paletteSource'

describe('palette settings rows', () => {
  it('offers administration rows to admins only, on the admin page', () => {
    const viewer = settingsItems(false)
    const admin = settingsItems(true)
    expect(viewer.length).toBeGreaterThan(0)
    expect(viewer.every((s) => s.auxiliaryData?.href.startsWith('settings:'))).toBe(true)
    expect(admin.length).toBeGreaterThan(viewer.length)
    expect(admin.filter((s) => s.auxiliaryData?.group === 'Administration').every((s) => s.auxiliaryData?.href.startsWith('/admin?pane='))).toBe(true)
  })
})
