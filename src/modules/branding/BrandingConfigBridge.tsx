/**
 * RSC component that stamps branding config as a data attribute.
 * Read by LoginBackground client component as a fallback.
 */
import React from 'react'

interface BrandingConfigBridgeProps {
  config: string
}

export const BrandingConfigBridge: React.FC<BrandingConfigBridgeProps> = ({ config }) => {
  return (
    <div
      data-branding-config={config}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  )
}
