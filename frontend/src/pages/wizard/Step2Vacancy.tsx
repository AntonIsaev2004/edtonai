import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Briefcase, Loader2, ArrowRight, ArrowLeft, Edit3, Save, Check } from 'lucide-react'
import { useWizard } from '@/context/WizardContext'
import { parseVacancy, updateVacancy } from '@/api'
import { Button, TextAreaWithCounter } from '@/components'
import VacancyEditor from '@/components/VacancyEditor'
import type { ParsedVacancy } from '@/api'

const MAX_CHARS = 10000

type Mode = 'input' | 'parsed'

export default function Step2Vacancy() {
  const {
    state,
    setVacancyText,
    setVacancyData,
    updateParsedVacancy,
    goToNextStep,
    goToPrevStep,
  } = useWizard()
  const [mode, setMode] = useState<Mode>(state.parsedVacancy ? 'parsed' : 'input')
  const [localText, setLocalText] = useState(state.vacancyText)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Parse mutation
  const parseMutation = useMutation({
    mutationFn: () => parseVacancy({ vacancy_text: localText }),
    onSuccess: (data) => {
      setVacancyText(localText)
      setVacancyData(data.vacancy_id, data.parsed_vacancy)
      setMode('parsed')
      setHasUnsavedChanges(false)
    },
  })

  // Save mutation (separate from navigation)
  const saveMutation = useMutation({
    mutationFn: (parsed: ParsedVacancy) =>
      updateVacancy(state.vacancyId!, { parsed_data: parsed }),
    onSuccess: (data) => {
      if (data.parsed_data) {
        updateParsedVacancy(data.parsed_data)
      }
      setHasUnsavedChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    },
  })

  const handleParse = () => {
    parseMutation.mutate()
  }

  const handleEditText = () => {
    setMode('input')
  }

  const handleSave = () => {
    if (state.parsedVacancy && state.vacancyId) {
      saveMutation.mutate(state.parsedVacancy)
    }
  }

  const handleNext = () => {
    goToNextStep()
  }

  const handleParsedChange = (parsed: ParsedVacancy) => {
    updateParsedVacancy(parsed)
    setHasUnsavedChanges(true)
    setSaveSuccess(false)
  }

  const isParseDisabled = localText.length < 10 || localText.length > MAX_CHARS

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Вакансия</h1>
          <p className="text-gray-500 mt-1">
            {mode === 'input'
              ? 'Вставьте текст вакансии для парсинга'
              : 'Проверьте и отредактируйте распознанные данные'}
          </p>
        </div>
        {mode === 'parsed' && (
          <Button variant="outline" onClick={handleEditText}>
            <Edit3 className="w-4 h-4 mr-2" />
            Изменить текст
          </Button>
        )}
      </div>

      {/* Content */}
      {mode === 'input' ? (
        <div className="space-y-4">
          <TextAreaWithCounter
            value={localText}
            onChange={setLocalText}
            maxLength={MAX_CHARS}
            label="Текст вакансии"
            placeholder="Вставьте текст вакансии здесь...

Например:
Senior Backend Developer
Компания: ООО «Инновации»

Требования:
- Python 3+ (обязательно)
- FastAPI или Django (обязательно)
- PostgreSQL (обязательно)
- Docker, Kubernetes (желательно)
- Опыт от 3 лет

Обязанности:
- Разработка backend-сервисов
- Проектирование API
- Code review"
            minHeight={400}
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={goToPrevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <Button
              onClick={handleParse}
              disabled={isParseDisabled || parseMutation.isPending}
              className="min-w-[180px]"
            >
              {parseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Парсинг...
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4 mr-2" />
                  Распознать вакансию
                </>
              )}
            </Button>
          </div>

          {parseMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {parseMutation.error instanceof Error
                ? parseMutation.error.message
                : 'Ошибка при парсинге вакансии'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {state.parsedVacancy && (
            <VacancyEditor
              data={state.parsedVacancy}
              onChange={handleParsedChange}
            />
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={goToPrevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleEditText}>
                Изменить текст
              </Button>
              
              {/* Separate Save button */}
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saveMutation.isPending}
                className="min-w-[150px]"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Сохранено
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить
                  </>
                )}
              </Button>
              
              {/* Next button (navigation only) */}
              <Button
                onClick={handleNext}
                className="min-w-[150px]"
              >
                Далее
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cache indicator */}
      {parseMutation.data?.cache_hit && (
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          ✓ Результат получен из кэша
        </div>
      )}
    </div>
  )
}
