// Browser APIs jsdom lacks but Astryx components use. The DOM typings claim
// these always exist, so each is feature-checked with typeof.
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

const missing = (value: unknown) => typeof value !== 'function'

if (missing(window.matchMedia)) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

if (missing(window.ResizeObserver)) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (missing(window.HTMLElement.prototype.scrollIntoView)) window.HTMLElement.prototype.scrollIntoView = () => {}
window.scrollTo = () => {}

// jsdom has <dialog> but not its modal API.
const dialog = window.HTMLDialogElement.prototype
if (missing(dialog.showModal)) {
  dialog.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
}
if (missing(dialog.show)) {
  dialog.show = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
}
if (missing(dialog.close)) {
  dialog.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
