import { Check, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export interface WizardStep {
  id: number
  title: string
  subtitle: string
}

interface WizardLayoutProps {
  steps: WizardStep[]
  currentStep: number
  children: React.ReactNode
}

export default function WizardLayout({ steps, currentStep, children }: WizardLayoutProps) {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stepper Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
              title="На главную"
            >
              <Home className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Адаптация резюме под вакансию</h1>
          </div>
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isCompleted = currentStep > step.id
                const isCurrent = currentStep === step.id

                return (
                  <li key={step.id} className="flex-1 relative">
                    <div className="flex items-center">
                      {/* Connector line - left side */}
                      {index > 0 && (
                        <div
                          className={`absolute left-0 right-1/2 top-5 h-0.5 -translate-y-1/2 ${
                            isCompleted || isCurrent ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        />
                      )}

                      {/* Connector line - right side */}
                      {index < steps.length - 1 && (
                        <div
                          className={`absolute left-1/2 right-0 top-5 h-0.5 -translate-y-1/2 ${
                            isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        />
                      )}

                      {/* Step indicator */}
                      <div className="relative flex flex-col items-center w-full">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium z-10 ${
                            isCompleted
                              ? 'bg-blue-600 text-white'
                              : isCurrent
                                ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {isCompleted ? <Check className="w-5 h-5" /> : step.id}
                        </div>
                        <div className="mt-2 text-center">
                          <div
                            className={`text-sm font-medium ${
                              isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            {step.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                            {step.subtitle}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
