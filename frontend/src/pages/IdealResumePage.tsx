import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Sparkles, Loader2, Copy, Save, FileText, Settings } from 'lucide-react'
import { generateIdeal, createVersion } from '@/api'
import { Button, TextAreaWithCounter, ConfirmDialog } from '@/components'

const MAX_CHARS = 10000

type Mode = 'input' | 'result'

interface Options {
  language: 'ru' | 'en' | null
  template: 'default' | 'harvard' | null
  seniority: 'junior' | 'middle' | 'senior' | null
}

export default function IdealResumePage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('input')
  const [vacancyText, setVacancyText] = useState('')
  const [resultText, setResultText] = useState('')
  const [metadata, setMetadata] = useState<{
    keywords_used: string[]
    structure: string[]
    assumptions: string[]
    language?: string
    template?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [versionTitle, setVersionTitle] = useState('')
  const [options, setOptions] = useState<Options>({
    language: null,
    template: null,
    seniority: null,
  })

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: () =>
      generateIdeal({
        vacancy_text: vacancyText,
        options: {
          language: options.language || undefined,
          template: options.template || undefined,
          seniority: options.seniority || undefined,
        },
      }),
    onSuccess: (data) => {
      setResultText(data.ideal_resume_text)
      setMetadata(data.metadata)
      setMode('result')
    },
  })

  // Save version mutation
  const saveVersionMutation = useMutation({
    mutationFn: () =>
      createVersion({
        type: 'ideal',
        title: versionTitle || undefined,
        resume_text: '', // No original resume for ideal
        vacancy_text: vacancyText,
        result_text: resultText,
        selected_checkbox_ids: [],
      }),
    onSuccess: () => {
      setShowSaveDialog(false)
      setVersionTitle('')
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate()
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resultText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBack = () => {
    if (mode === 'result') {
      setMode('input')
    } else {
      navigate('/')
    }
  }

  const isGenerateDisabled = vacancyText.length < 10 || vacancyText.length > MAX_CHARS

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Идеальное резюме</h1>
              <p className="text-sm text-slate-400">
                {mode === 'input' ? 'Вставьте вакансию для генерации' : 'Результат генерации'}
              </p>
            </div>
          </div>
          {mode === 'result' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Скопировано!' : 'Копировать'}
              </Button>
              <Button onClick={() => setShowSaveDialog(true)}>
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {mode === 'input' ? (
          <div className="space-y-6">
            {/* Vacancy input */}
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
              <TextAreaWithCounter
                value={vacancyText}
                onChange={setVacancyText}
                maxLength={MAX_CHARS}
                label="Текст вакансии"
                placeholder="Вставьте текст вакансии здесь...

Например:
Senior Python Developer
Company XYZ
Requirements:
- 5+ years of Python experience
- FastAPI, PostgreSQL, Docker
..."
                minHeight={300}
              />
            </div>

            {/* Options panel */}
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-white">Настройки генерации</span>
                </div>
                <span className="text-sm text-slate-500">
                  {showOptions ? 'Скрыть' : 'Показать'}
                </span>
              </button>

              {showOptions && (
                <div className="px-6 pb-6 space-y-4 border-t border-slate-700 pt-4">
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Язык резюме
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: null, label: 'Авто' },
                        { value: 'ru' as const, label: 'Русский' },
                        { value: 'en' as const, label: 'English' },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => setOptions((p) => ({ ...p, language: opt.value }))}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.language === opt.value
                            ? 'bg-brand-900/50 text-brand-300 border-2 border-brand-500/50'
                            : 'bg-slate-900 text-slate-400 border-2 border-transparent hover:bg-slate-700'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Шаблон
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: null, label: 'Стандартный' },
                        { value: 'harvard' as const, label: 'Harvard' },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => setOptions((p) => ({ ...p, template: opt.value }))}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.template === opt.value
                            ? 'bg-brand-900/50 text-brand-300 border-2 border-brand-500/50'
                            : 'bg-slate-900 text-slate-400 border-2 border-transparent hover:bg-slate-700'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seniority */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Уровень опыта
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: null, label: 'Любой' },
                        { value: 'junior' as const, label: 'Junior' },
                        { value: 'middle' as const, label: 'Middle' },
                        { value: 'senior' as const, label: 'Senior' },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => setOptions((p) => ({ ...p, seniority: opt.value }))}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.seniority === opt.value
                            ? 'bg-brand-900/50 text-brand-300 border-2 border-brand-500/50'
                            : 'bg-slate-900 text-slate-400 border-2 border-transparent hover:bg-slate-700'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {generateMutation.isError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {generateMutation.error instanceof Error
                  ? generateMutation.error.message
                  : 'Ошибка при генерации резюме'}
              </div>
            )}

            {/* Generate button */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={isGenerateDisabled || generateMutation.isPending}
                className="min-w-[250px] py-3"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Сгенерировать идеальное резюме
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Result */}
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
              <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-400" />
                  <span className="font-medium text-white">Идеальное резюме</span>
                </div>
                {generateMutation.data?.cache_hit && (
                  <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                    из кэша
                  </span>
                )}
              </div>
              <pre className="p-6 text-sm text-slate-300 whitespace-pre-wrap font-mono max-h-[600px] overflow-y-auto">
                {resultText}
              </pre>
            </div>

            {/* Metadata */}
            {metadata && (
              <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
                <h3 className="font-medium text-white mb-4">Информация о генерации</h3>
                <div className="grid grid-cols-2 gap-4">
                  {metadata.keywords_used.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">ATS ключевые слова</h4>
                      <div className="flex flex-wrap gap-1">
                        {metadata.keywords_used.map((kw, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-brand-900/50 text-brand-300 rounded"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {metadata.structure.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Структура</h4>
                      <div className="flex flex-wrap gap-1">
                        {metadata.structure.map((s, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {metadata.assumptions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Допущения</h4>
                    <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                      {metadata.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setMode('input')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Изменить вакансию
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Save dialog */}
      <ConfirmDialog
        isOpen={showSaveDialog}
        title="Сохранить версию"
        message={
          <div className="space-y-3">
            <p>Сохранить идеальное резюме в историю версий?</p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              placeholder="Название версии (опционально)"
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
            />
          </div>
        }
        confirmText={saveVersionMutation.isPending ? 'Сохранение...' : 'Сохранить'}
        onConfirm={() => saveVersionMutation.mutate()}
        onClose={() => setShowSaveDialog(false)}
      />
    </div>
  )
}
