import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { useNavigate } from '@tanstack/react-router'

export type Section = { id: string; label: string }

/** Picks one section of a long view (?section=), so a view shows one focused
 * group of panels at a time instead of one long scroll. The first section is
 * the default and stays out of the URL. */
export function SectionSwitch({ label, sections, value }: { label: string; sections: readonly Section[]; value: string | undefined }) {
  const navigate = useNavigate()
  const current = sections.some((s) => s.id === value) ? value! : sections[0].id
  return (
    <SegmentedControl
      label={label}
      size="sm"
      value={current}
      onChange={(id) => void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, section: id === sections[0].id ? undefined : id }) })}
    >
      {sections.map((s) => (
        <SegmentedControlItem key={s.id} value={s.id} label={s.label} />
      ))}
    </SegmentedControl>
  )
}

/** The section a search value selects, falling back to the first. */
export const sectionOf = (sections: readonly Section[], value: unknown) => sections.find((s) => s.id === value)?.id ?? sections[0].id
