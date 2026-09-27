import { MetadataListItem } from '@astryxdesign/core/MetadataList'
import type { ComponentProps, ReactNode } from 'react'
import { Pending } from './Pending'

/** A metadata row whose value may still be loading: the label shows at
 * once, the value is a skeleton until it is known. */
export function MetaItem({ children, ...props }: Omit<ComponentProps<typeof MetadataListItem>, 'children'> & { children?: ReactNode }) {
  return <MetadataListItem {...props}>{<Pending>{children}</Pending>}</MetadataListItem>
}
