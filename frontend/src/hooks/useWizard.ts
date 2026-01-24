import { useContext } from 'react'
import { WizardContext } from '@/context/WizardContext'
import type { WizardContextType } from '@/context/WizardContext'

export function useWizard(): WizardContextType {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}
