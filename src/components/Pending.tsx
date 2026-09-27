import { Skeleton } from '@astryxdesign/core/Skeleton'
import type { ReactNode } from 'react'

/** A value still loading: a skeleton the size of the text it will be. */
export function Pending({ children, width = 96 }: { children?: ReactNode; width?: number | string }) {
  return children === undefined || children === null ? <Skeleton width={width} height={14} /> : <>{children}</>
}
