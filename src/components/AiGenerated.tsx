import { Token } from '@astryxdesign/core/Token'
import { useShellConfig } from '#/lib/session'

/** Marks model-written text, with the deployment's own AI disclaimer. */
export function AiGenerated() {
  const disclaimer = useShellConfig().presentation.aiDisclaimer
  return (
    <span title={disclaimer || 'Written by a model. It can be wrong; check it against the evidence.'}>
      <Token size="sm" color="purple" label="AI-generated" />
    </span>
  )
}
