/**
 * RSC component that stamps the list views config as a data attribute.
 * This bridges server-side config to client-side components without props serialization issues.
 */

import React from 'react'

interface ListViewsConfigBridgeProps {
  config: string // JSON string of the list views config map
}

export const ListViewsConfigBridge: React.FC<ListViewsConfigBridgeProps> = ({ config }) => {
  return (
    <div
      data-list-views-config={config}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  )
}
