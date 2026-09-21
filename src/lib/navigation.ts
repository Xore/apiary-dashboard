import { useRouter, usePathname, useSearchParams } from '@tanstack/react-router'

export const usePathname = () => {
  const { state } = useRouter()
  return state.location.pathname
}

export const useSearchParams = () => {
  const { state } = useRouter()
  return new URLSearchParams(state.location.search)
}
