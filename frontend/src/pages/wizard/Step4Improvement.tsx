import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, Loader2, ArrowLeft, Copy, RotateCcw, Check, X, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useWizard } from '@/context/WizardContext'
import { adaptResume, createVersion, analyzeMatch } from '@/api'
import { Button, CheckboxList, ConfirmDialog } from '@/components'
import type { ChangeLogEntry, SelectedImprovement } from '@/api'

type Mode = 'checkboxes' | 'review' | 'analysis'

interface PendingChange extends ChangeLogEntry {
  status: 'pending' | 'confirmed' | 'rejected'
}

export default function Step4Improvement() {
  const {
    state,
    setSelectedCheckboxes,
    setResult,
    setAnalysis,
    applyImprovedResume,
    goToPrevStep,
    reset,
  } = useWizard()
  const [mode, setMode] = useState<Mode>(state.resultText ? 'review' : 'checkboxes')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [versionTitle, setVersionTitle] = useState('')
  const [copied, setCopied] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  
  // User inputs for checkboxes that require_user_input
  const [userInputs, setUserInputs] = useState<Record<string, string>>({})
  // AI generate flags for checkboxes that require_user_input
  const [aiGenerateFlags, setAiGenerateFlags] = useState<Record<string, boolean>>({})

  const checkboxOptions = state.analysis?.checkbox_options || []

  // Build selected_improvements from checkboxes + user inputs
  const buildSelectedImprovements = (): SelectedImprovement[] => {
    return state.selectedCheckboxes.map((checkboxId) => {
      const option = checkboxOptions.find((o) => o.id === checkboxId)
      const userInput = userInputs[checkboxId]
      const aiGenerate = aiGenerateFlags[checkboxId] || false
      
      return {
        checkbox_id: checkboxId,
        user_input: userInput || null,
        ai_generate: option?.requires_user_input ? (aiGenerate || !userInput) : false,
      }
    })
  }

  // Adapt mutation
  const adaptMutation = useMutation({
    mutationFn: () =>
      adaptResume({
        resume_text: state.resumeText,
        vacancy_text: state.vacancyText,
        selected_improvements: buildSelectedImprovements(),
      }),
    onSuccess: (data) => {
      setResult(data.updated_resume_text, data.change_log)
      // Initialize pending changes for review
      setPendingChanges(
        data.change_log.map((entry) => ({
          ...entry,
          status: 'pending' as const,
        }))
      )
      setMode('review')
    },
  })

  // Re-analyze mutation - runs automatically after confirming
  const reanalyzeMutation = useMutation({
    mutationFn: (newResumeText: string) =>
      analyzeMatch({
        resume_text: newResumeText,
        vacancy_text: state.vacancyText,
      }),
    onSuccess: (data) => {
      setAnalysis(data.analysis_id, data.analysis)
      setMode('analysis')
    },
  })

  // Save version mutation
  const saveVersionMutation = useMutation({
    mutationFn: (resumeText: string) =>
      createVersion({
        type: 'adapt',
        title: versionTitle || undefined,
        resume_text: state.resumeText,
        vacancy_text: state.vacancyText,
        result_text: resumeText,
        selected_checkbox_ids: state.selectedCheckboxes,
      }),
    onSuccess: (_, resumeText) => {
      setShowSaveDialog(false)
      setVersionTitle('')
      // Apply improved resume as new base
      applyImprovedResume(resumeText)
      // Run re-analysis with new text
      reanalyzeMutation.mutate(resumeText)
    },
  })

  const handleApply = () => {
    adaptMutation.mutate()
  }

  const handleConfirmChange = (index: number) => {
    setPendingChanges((prev) =>
      prev.map((change, i) =>
        i === index ? { ...change, status: 'confirmed' as const } : change
      )
    )
  }

  const handleRejectChange = (index: number) => {
    setPendingChanges((prev) =>
      prev.map((change, i) =>
        i === index ? { ...change, status: 'rejected' as const } : change
      )
    )
  }

  const handleConfirmAll = () => {
    setPendingChanges((prev) =>
      prev.map((change) => ({ ...change, status: 'confirmed' as const }))
    )
  }

  const handleFinalizeChanges = () => {
    setShowSaveDialog(true)
  }

  const handleSaveAndAnalyze = () => {
    saveVersionMutation.mutate(state.resultText)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(state.resumeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBackToCheckboxes = () => {
    setMode('checkboxes')
    setPendingChanges([])
  }

  const handleSelectAll = () => {
    // Select all options (enabled field is deprecated, now all options are enabled)
    const allIds = checkboxOptions.map((o) => o.id)
    setSelectedCheckboxes(allIds)
  }

  const handleDeselectAll = () => {
    setSelectedCheckboxes([])
  }

  const handleContinueImproving = () => {
    // Go back to checkbox selection for more improvements
    setMode('checkboxes')
  }

  const selectedCount = state.selectedCheckboxes.length
  // Count total options (enabled field is deprecated)
  const totalCount = checkboxOptions.length
  const pendingCount = pendingChanges.filter((c) => c.status === 'pending').length
  const confirmedCount = pendingChanges.filter((c) => c.status === 'confirmed').length
  const allReviewed = pendingChanges.length > 0 && pendingCount === 0
  
  const analysis = state.analysis
  const scoreDiff = state.previousScore !== null && analysis 
    ? analysis.score - state.previousScore 
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'analysis' ? 'Результат улучшения' : 'Улучшение резюме'}
          </h1>
          <p className="text-gray-500 mt-1">
            {mode === 'checkboxes'
              ? 'Выберите улучшения для применения к резюме'
              : mode === 'review'
                ? 'Подтвердите или отклоните каждое изменение'
                : 'Анализ обновлённого резюме'}
          </p>
        </div>
      </div>

      {mode === 'checkboxes' ? (
        <div className="space-y-4">
          {/* Selection controls */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
            <span className="text-sm text-gray-600">
              Выбрано: {selectedCount} из {totalCount}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Выбрать все
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                Снять выбор
              </Button>
            </div>
          </div>

          {/* Checkbox list */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <CheckboxList
              options={checkboxOptions}
              selected={state.selectedCheckboxes}
              onChange={setSelectedCheckboxes}
              userInputs={userInputs}
              onUserInputChange={(id, value) => setUserInputs((prev) => ({ ...prev, [id]: value }))}
              aiGenerateFlags={aiGenerateFlags}
              onAiGenerateChange={(id, value) => setAiGenerateFlags((prev) => ({ ...prev, [id]: value }))}
            />
          </div>

          {adaptMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {adaptMutation.error instanceof Error
                ? adaptMutation.error.message
                : 'Ошибка при улучшении резюме'}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={goToPrevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <Button
              onClick={handleApply}
              disabled={selectedCount === 0 || adaptMutation.isPending}
              className="min-w-[200px]"
            >
              {adaptMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Применение...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Применить улучшения ({selectedCount})
                </>
              )}
            </Button>
          </div>
        </div>
      ) : mode === 'review' ? (
        <div className="space-y-4">
          {/* Review status */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <span className="text-sm text-blue-700">
              Подтверждено: {confirmedCount} из {pendingChanges.length}
              {pendingCount > 0 && ` • Ожидает: ${pendingCount}`}
            </span>
            <Button variant="ghost" size="sm" onClick={handleConfirmAll} disabled={pendingCount === 0}>
              <Check className="w-4 h-4 mr-1" />
              Подтвердить все
            </Button>
          </div>

          {/* Change review cards */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Изменения для подтверждения:</h3>
            {pendingChanges.map((change, index) => (
              <div
                key={index}
                className={`bg-white border rounded-lg p-4 transition-colors ${
                  change.status === 'confirmed'
                    ? 'border-green-300 bg-green-50'
                    : change.status === 'rejected'
                      ? 'border-red-300 bg-red-50 opacity-60'
                      : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {change.where}
                      </span>
                      {change.status === 'confirmed' && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          ✓ Подтверждено
                        </span>
                      )}
                      {change.status === 'rejected' && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                          ✗ Отклонено
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">{change.what_changed}</p>
                    {change.before_excerpt && (
                      <div className="mt-2 text-xs">
                        <span className="text-gray-500">Было: </span>
                        <span className="text-red-600 line-through">{change.before_excerpt}</span>
                      </div>
                    )}
                    {change.after_excerpt && (
                      <div className="mt-1 text-xs">
                        <span className="text-gray-500">Стало: </span>
                        <span className="text-green-600">{change.after_excerpt}</span>
                      </div>
                    )}
                  </div>
                  {change.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfirmChange(index)}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectChange(index)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBackToCheckboxes}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Изменить выбор
            </Button>
            <Button
              onClick={handleFinalizeChanges}
              disabled={!allReviewed || confirmedCount === 0}
              className="min-w-[200px]"
            >
              <Check className="w-4 h-4 mr-2" />
              Применить ({confirmedCount})
            </Button>
          </div>
        </div>
      ) : (
        /* mode === 'analysis' - Full analysis view like Step3 */
        <div className="space-y-6">
          {/* Score with comparison */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Новый балл соответствия</h2>
              <div className="flex items-center gap-4">
                {/* Score comparison */}
                {state.previousScore !== null && scoreDiff !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Было: {state.previousScore}</span>
                    <span className="text-gray-400">→</span>
                    {scoreDiff > 0 ? (
                      <span className="flex items-center text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        +{scoreDiff}
                      </span>
                    ) : scoreDiff < 0 ? (
                      <span className="flex items-center text-red-600">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        {scoreDiff}
                      </span>
                    ) : (
                      <span className="flex items-center text-gray-500">
                        <Minus className="w-4 h-4 mr-1" />
                        0
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`text-4xl font-bold ${
                    analysis && analysis.score >= 70
                      ? 'text-green-600'
                      : analysis && analysis.score >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {analysis?.score || 0}
                  <span className="text-lg text-gray-400">/100</span>
                </div>
              </div>
            </div>

            {/* Score breakdown */}
            {analysis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analysis.score_breakdown.skill_fit && (
                  <ScoreCard
                    label="Навыки"
                    value={analysis.score_breakdown.skill_fit.value}
                    maxValue={50}
                    comment={analysis.score_breakdown.skill_fit.comment}
                  />
                )}
                {analysis.score_breakdown.experience_fit && (
                  <ScoreCard
                    label="Опыт"
                    value={analysis.score_breakdown.experience_fit.value}
                    maxValue={25}
                    comment={analysis.score_breakdown.experience_fit.comment}
                  />
                )}
                {analysis.score_breakdown.ats_fit && (
                  <ScoreCard
                    label="ATS"
                    value={analysis.score_breakdown.ats_fit.value}
                    maxValue={15}
                    comment={analysis.score_breakdown.ats_fit.comment}
                  />
                )}
                {analysis.score_breakdown.clarity_evidence && (
                  <ScoreCard
                    label="Четкость"
                    value={analysis.score_breakdown.clarity_evidence.value}
                    maxValue={10}
                    comment={analysis.score_breakdown.clarity_evidence.comment}
                  />
                )}
              </div>
            )}
          </div>

          {/* Skills match */}
          {analysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Required skills */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Обязательные навыки</h3>
                <div className="space-y-2">
                  {analysis.matched_required_skills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} matched />
                  ))}
                  {analysis.missing_required_skills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} matched={false} />
                  ))}
                  {analysis.matched_required_skills.length === 0 &&
                    analysis.missing_required_skills.length === 0 && (
                      <p className="text-sm text-gray-500">Нет данных</p>
                    )}
                </div>
              </div>

              {/* Preferred skills */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Желательные навыки</h3>
                <div className="space-y-2">
                  {analysis.matched_preferred_skills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} matched />
                  ))}
                  {analysis.missing_preferred_skills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} matched={false} />
                  ))}
                  {analysis.matched_preferred_skills.length === 0 &&
                    analysis.missing_preferred_skills.length === 0 && (
                      <p className="text-sm text-gray-500">Нет данных</p>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Gaps */}
          {analysis && analysis.gaps.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">
                Оставшиеся пробелы ({analysis.gaps.length})
              </h3>
              <div className="space-y-3">
                {analysis.gaps.map((gap) => (
                  <div
                    key={gap.id}
                    className={`p-3 rounded-lg border ${
                      gap.severity === 'high'
                        ? 'bg-red-50 border-red-200'
                        : gap.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 ${
                          gap.severity === 'high'
                            ? 'text-red-500'
                            : gap.severity === 'medium'
                              ? 'text-yellow-500'
                              : 'text-blue-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{gap.message}</p>
                        {gap.suggestion && (
                          <p className="text-sm text-gray-600 mt-1">{gap.suggestion}</p>
                        )}
                        <span className="inline-block mt-1 text-xs text-gray-400">
                          {gap.target_section}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Начать заново
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Скопировано!' : 'Копировать резюме'}
              </Button>
            </div>
            {analysis && analysis.checkbox_options.length > 0 && (
              <Button onClick={handleContinueImproving}>
                <Sparkles className="w-4 h-4 mr-2" />
                Продолжить улучшение
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Save dialog */}
      <ConfirmDialog
        isOpen={showSaveDialog}
        title="Применить изменения"
        message={
          <div className="space-y-3">
            <p>
              Применить {confirmedCount} подтверждённых изменений? 
              Обновлённое резюме станет базовым для дальнейших улучшений.
            </p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Название версии (опционально)"
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
            />
          </div>
        }
        confirmText={saveVersionMutation.isPending || reanalyzeMutation.isPending ? 'Применение...' : 'Применить'}
        onConfirm={handleSaveAndAnalyze}
        onClose={() => setShowSaveDialog(false)}
      />
    </div>
  )
}

// ========================================
// Helper Components
// ========================================

function ScoreCard({
  label,
  value,
  maxValue,
  comment,
}: {
  label: string
  value: number
  maxValue: number
  comment: string
}) {
  const percentage = (value / maxValue) * 100

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium">
          {value}/{maxValue}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {comment && <p className="text-xs text-gray-500 mt-1 truncate" title={comment}>{comment}</p>}
    </div>
  )
}

function SkillBadge({ skill, matched }: { skill: string; matched: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
        matched ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}
    >
      {matched ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      {skill}
    </div>
  )
}
