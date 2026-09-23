// Loads DOM polyfills only for files running in jsdom.
if (typeof window !== 'undefined') await import('./dom-setup')

export {}
