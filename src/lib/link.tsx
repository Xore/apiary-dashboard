import React from 'react'
import { Link as TanStackLink } from '@tanstack/react-router'

export default function Link({ children, ...props }: any) {
  return (
    <TanStackLink {...props}>
      {typeof children === 'string' ? <span key="link-text">{children}</span> : children}
    </TanStackLink>
  )
}
