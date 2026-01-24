import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FileText, Loader2, ArrowRight, Edit3, Save, Check } from 'lucide-react'
import { useWizard } from '@/hooks'
import { parseResume, updateResume } from '@/api'
import { Button, TextAreaWithCounter } from '@/components'
import ResumeEditor from '@/components/ResumeEditor'
import type { ParsedResume } from '@/api'

const MAX_CHARS = 15000

type Mode = 'input' | 'parsed'

export default function Step1Resume() {
  const { state, setResumeText, setResumeData, updateParsedResume, goToNextStep } = useWizard()
  const [mode, setMode] = useState<Mode>(state.parsedResume ? 'parsed' : 'input')
  const [localText, setLocalText] = useState(state.resumeText)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Parse mutation
  const parseMutation = useMutation({
    mutationFn: () => parseResume({ resume_text: localText }),
    onSuccess: (data) => {
      setResumeText(localText)
      setResumeData(data.resume_id, data.parsed_resume)
      setMode('parsed')
      setHasUnsavedChanges(false)
    },
  })

  // Save mutation (separate from navigation)
  const saveMutation = useMutation({
    mutationFn: (parsed: ParsedResume) =>
      updateResume(state.resumeId!, { parsed_data: parsed }),
    onSuccess: (data) => {
      if (data.parsed_data) {
        updateParsedResume(data.parsed_data)
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
    if (state.parsedResume && state.resumeId) {
      saveMutation.mutate(state.parsedResume)
    }
  }

  const handleNext = () => {
    goToNextStep()
  }

  const handleParsedChange = (parsed: ParsedResume) => {
    updateParsedResume(parsed)
    setHasUnsavedChanges(true)
    setSaveSuccess(false)
  }

  const isParseDisabled = localText.length < 10 || localText.length > MAX_CHARS

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Резюме</h1>
          <p className="text-gray-500 mt-1">
            {mode === 'input'
              ? 'Вставьте текст резюме для парсинга'
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
            label="Текст резюме"
            placeholder="Вставьте текст резюме здесь...

Например:
Иван Петров
Senior Backend Developer

Опыт работы:
- ООО «Технологии», Backend Developer, 2020-2023
  • Разработал микросервисную архитектуру
  • Оптимизировал производительность API

Навыки: Python, FastAPI, PostgreSQL, Docker, Kubernetes"
            minHeight={400}
          />

          <div className="flex justify-end">
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
                  <FileText className="w-4 h-4 mr-2" />
                  Распознать резюме
                </>
              )}
            </Button>
          </div>

          {parseMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {parseMutation.error instanceof Error
                ? parseMutation.error.message
                : 'Ошибка при парсинге резюме'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {state.parsedResume && (
            <ResumeEditor
              data={state.parsedResume}
              onChange={handleParsedChange}
            />
          )}

          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              ⚠ Есть несохранённые изменения
            </div>
          )}

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={handleEditText}>
              Изменить текст
            </Button>
            
            <div className="flex gap-3">
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
