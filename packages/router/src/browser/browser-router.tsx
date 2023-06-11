import { createRouter } from '../router'

export function createBrowserRouter() {
  return createRouter({
    history: globalThis.history,
    location: globalThis.location
  })
}
