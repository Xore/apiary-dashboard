import type { KeyboardEvent, MouseEvent } from 'react'
import type { TablePlugin } from '@astryxdesign/core/Table'

type Config<T> = {
  getId: (item: T) => string
  selectedId: string | null
  onActivate: (item: T) => void
}

/** Table plugin: clicking (or Enter/Space on) a body row activates it, and the
 * active row is marked aria-selected with the accent wash, matching the
 * selection plugin's highlight. Clicks on links/buttons inside a row keep
 * their own behavior. */
export function useRowActivation<T extends Record<string, unknown>>({
  getId,
  selectedId,
  onActivate,
}: Config<T>): TablePlugin<T> {
  return {
    transformBodyRow: (props, item) => {
      const isSelected = getId(item) === selectedId
      const fromControl = (target: EventTarget) =>
        target instanceof Element && target.closest('a, button, input, select, textarea, [role="button"]') !== null
      return {
        ...props,
        htmlProps: {
          ...props.htmlProps,
          tabIndex: 0,
          'aria-selected': isSelected,
          style: {
            ...props.htmlProps.style,
            cursor: 'pointer',
            background: isSelected ? 'var(--color-accent-muted)' : undefined,
          },
          onClick: (event: MouseEvent<HTMLTableRowElement>) => {
            props.htmlProps.onClick?.(event)
            if (!fromControl(event.target)) onActivate(item)
          },
          onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
            props.htmlProps.onKeyDown?.(event)
            if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
              event.preventDefault()
              onActivate(item)
            }
          },
        },
      }
    },
  }
}
