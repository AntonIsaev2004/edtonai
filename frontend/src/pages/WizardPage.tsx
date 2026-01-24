import WizardLayout, { type WizardStep } from '@/components/WizardLayout'
import { WizardProvider } from '@/context/WizardContext'
import { useWizard } from '@/hooks'
import { Step1Resume, Step2Vacancy, Step3Analysis, Step4Improvement } from './wizard'

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Резюме', subtitle: 'Парсинг и редактирование' },
  { id: 2, title: 'Вакансия', subtitle: 'Парсинг и редактирование' },
  { id: 3, title: 'Анализ', subtitle: 'Соответствие' },
  { id: 4, title: 'Улучшение', subtitle: 'Применение рекомендаций' },
]

function WizardContent() {
  const { currentStep } = useWizard()

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Resume />
      case 2:
        return <Step2Vacancy />
      case 3:
        return <Step3Analysis />
      case 4:
        return <Step4Improvement />
      default:
        return <Step1Resume />
    }
  }

  return (
    <WizardLayout steps={WIZARD_STEPS} currentStep={currentStep}>
      {renderStep()}
    </WizardLayout>
  )
}

export default function WizardPage() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  )
}
