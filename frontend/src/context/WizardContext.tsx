import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import type {
  ParsedResume,
  ParsedVacancy,
  MatchAnalysis,
  ChangeLogEntry,
} from '@/api'

interface WizardState {
  // Step 1 - Resume
  resumeText: string
  resumeId: string | null
  parsedResume: ParsedResume | null
  
  // Step 2 - Vacancy
  vacancyText: string
  vacancyId: string | null
  parsedVacancy: ParsedVacancy | null
  
  // Step 3 - Analysis
  analysis: MatchAnalysis | null
  analysisId: string | null
  previousScore: number | null  // Store score before improvement for comparison
  
  // Step 4 - Improvement
  selectedCheckboxes: string[]
  resultText: string
  changeLog: ChangeLogEntry[]
}

interface WizardContextType {
  state: WizardState
  currentStep: number
  setCurrentStep: (step: number) => void
  
  // Step 1 actions
  setResumeText: (text: string) => void
  setResumeData: (id: string, parsed: ParsedResume) => void
  updateParsedResume: (parsed: ParsedResume) => void
  
  // Step 2 actions
  setVacancyText: (text: string) => void
  setVacancyData: (id: string, parsed: ParsedVacancy) => void
  updateParsedVacancy: (parsed: ParsedVacancy) => void
  
  // Step 3 actions
  setAnalysis: (analysisId: string, analysis: MatchAnalysis) => void
  
  // Step 4 actions
  setSelectedCheckboxes: (ids: string[]) => void
  toggleCheckbox: (id: string) => void
  setResult: (text: string, changeLog: ChangeLogEntry[]) => void
  applyImprovedResume: (newResumeText: string) => void  // Make improved resume the new base
  
  // Navigation
  canGoToStep: (step: number) => boolean
  goToNextStep: () => void
  goToPrevStep: () => void
  
  // Reset
  reset: () => void
}

const initialState: WizardState = {
  resumeText: '',
  resumeId: null,
  parsedResume: null,
  vacancyText: '',
  vacancyId: null,
  parsedVacancy: null,
  analysis: null,
  analysisId: null,
  previousScore: null,
  selectedCheckboxes: [],
  resultText: '',
  changeLog: [],
}

const WizardContext = createContext<WizardContextType | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState)
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1 actions
  const setResumeText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, resumeText: text }))
  }, [])

  const setResumeData = useCallback((id: string, parsed: ParsedResume) => {
    setState((prev) => ({
      ...prev,
      resumeId: id,
      parsedResume: parsed,
    }))
  }, [])

  const updateParsedResume = useCallback((parsed: ParsedResume) => {
    setState((prev) => ({ ...prev, parsedResume: parsed }))
  }, [])

  // Step 2 actions
  const setVacancyText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, vacancyText: text }))
  }, [])

  const setVacancyData = useCallback((id: string, parsed: ParsedVacancy) => {
    setState((prev) => ({
      ...prev,
      vacancyId: id,
      parsedVacancy: parsed,
    }))
  }, [])

  const updateParsedVacancy = useCallback((parsed: ParsedVacancy) => {
    setState((prev) => ({ ...prev, parsedVacancy: parsed }))
  }, [])

  // Step 3 actions
  const setAnalysis = useCallback((analysisId: string, analysis: MatchAnalysis) => {
    setState((prev) => ({
      ...prev,
      analysisId,
      // Save previous score for comparison (only if we already had one)
      previousScore: prev.analysis?.score ?? prev.previousScore,
      analysis,
      // Pre-select high-priority checkboxes
      selectedCheckboxes: analysis.checkbox_options
        .filter((o) => o.enabled && (o.priority ?? 0) >= 2)
        .map((o) => o.id),
    }))
  }, [])

  // Step 4 actions
  const setSelectedCheckboxes = useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, selectedCheckboxes: ids }))
  }, [])

  const toggleCheckbox = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedCheckboxes: prev.selectedCheckboxes.includes(id)
        ? prev.selectedCheckboxes.filter((cid) => cid !== id)
        : [...prev.selectedCheckboxes, id],
    }))
  }, [])

  const setResult = useCallback(
    (text: string, changeLog: ChangeLogEntry[]) => {
      setState((prev) => ({
        ...prev,
        resultText: text,
        changeLog,
      }))
    },
    []
  )

  // Apply improved resume as the new base (after user confirms changes)
  const applyImprovedResume = useCallback((newResumeText: string) => {
    setState((prev) => ({
      ...prev,
      resumeText: newResumeText,  // New base resume text
      resultText: '',              // Clear result
      changeLog: [],               // Clear change log
      selectedCheckboxes: [],      // Clear selections
    }))
  }, [])

  // Navigation
  const canGoToStep = useCallback(
    (step: number) => {
      switch (step) {
        case 1:
          return true
        case 2:
          return !!state.parsedResume
        case 3:
          return !!state.parsedResume && !!state.parsedVacancy
        case 4:
          return !!state.analysis
        default:
          return false
      }
    },
    [state.parsedResume, state.parsedVacancy, state.analysis]
  )

  const goToNextStep = useCallback(() => {
    if (currentStep < 4 && canGoToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep, canGoToStep])

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  // Reset
  const reset = useCallback(() => {
    setState(initialState)
    setCurrentStep(1)
  }, [])

  // eslint-disable-next-line react-refresh/only-export-components
  const value: WizardContextType = {
    state,
    currentStep,
    setCurrentStep,
    setResumeText,
    setResumeData,
    updateParsedResume,
    setVacancyText,
    setVacancyData,
    updateParsedVacancy,
    setAnalysis,
    setSelectedCheckboxes,
    toggleCheckbox,
    setResult,
    applyImprovedResume,
    canGoToStep,
    goToNextStep,
    goToPrevStep,
    reset,
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWizard() {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}
