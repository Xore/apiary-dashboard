import type { KeyboardEvent, MouseEvent } from 'react'
import type { TablePlugin } from '@astryxdesign/core/Table'

type Config<T> = {
  /** `newTab` is true for ⌘/Ctrl-click and middle-click. */
  onActivate: (item: T, options: { newTab: boolean }) => void
}

/** Table plugin: clicking (or Enter/Space on) a body row activates it.
 * ⌘/Ctrl-click and middle-click ask for a new tab. Clicks on links/buttons
 * inside a row keep their own behavior. */
export function useRowActivation<T extends Record<string, unknown>>({
  onActivate,
}: Config<T>): TablePlugin<T> {
  return {
    transformBodyRow: (props, item) => {
      const fromControl = (target: EventTarget) =>
        target instanceof Element && target.closest('a, button, input, select, textarea, [role="button"]') !== null
      return {
        ...props,
        htmlProps: {
          ...props.htmlProps,
          tabIndex: 0,
          style: {
            ...props.htmlProps.style,
            cursor: 'pointer',
          },
          onClick: (event: MouseEvent<HTMLTableRowElement>) => {
            props.htmlProps.onClick?.(event)
            if (!fromControl(event.target)) onActivate(item, { newTab: event.metaKey || event.ctrlKey })
          },
          onAuxClick: (event: MouseEvent<HTMLTableRowElement>) => {
            props.htmlProps.onAuxClick?.(event)
            if (event.button === 1 && !fromControl(event.target)) onActivate(item, { newTab: true })
          },
          onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
            props.htmlProps.onKeyDown?.(event)
            if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
              event.preventDefault()
              onActivate(item, { newTab: false })
            }
          },
        },
      }
    },
  }
}
