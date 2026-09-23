import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Tab, TabList } from '@astryxdesign/core/TabList'

export type ViewTab = { id: string; label: string }

type Registration = {
  label: string
  tabs: ViewTab[]
  value: string
  onChange: (id: string) => void
}

// A tiny external store: pages write their views here and only the top-bar
// strip subscribes, so registering never re-renders the page itself.
let current: Registration | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Puts a page's views (Overview's five, one per sensor, the reports steps…)
 * in the top navigation bar while the page is mounted. Keep the active view
 * in the URL so it can be linked to. */
export function useViewTabs({ label, tabs, value, onChange }: Registration) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const key = JSON.stringify([label, tabs, value])

  useEffect(() => {
    const registration: Registration = { label, tabs, value, onChange: (id) => onChangeRef.current(id) }
    current = registration
    emit()
    return () => {
      if (current === registration) {
        current = null
        emit()
      }
    }
    // `key` captures label/tabs/value by content, not identity.
  }, [key])
}

/** The strip the shell renders in the top bar. */
export function ViewTabsBar() {
  const registration = useSyncExternalStore(subscribe, () => current, () => null)
  if (!registration || registration.tabs.length < 2) return null
  return (
    <TabList value={registration.value} onChange={registration.onChange} size="sm">
      {registration.tabs.map((tab) => (
        <Tab key={tab.id} value={tab.id} label={tab.label} />
      ))}
    </TabList>
  )
}
