import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Copy, ArrowLeftRight } from 'lucide-react'
import { Button, DiffViewer } from '@/components'
import { getVersions, getVersion, type VersionItem } from '@/api'

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [versionAId, setVersionAId] = useState<string>(searchParams.get('a') || '')
  const [versionBId, setVersionBId] = useState<string>(searchParams.get('b') || '')

  // Fetch versions list
  const { data: versionsData, isLoading: isLoadingList } = useQuery({
    queryKey: ['versions'],
    queryFn: () => getVersions(100, 0),
  })

  // Fetch version A
  const { data: versionA, isLoading: isLoadingA } = useQuery({
    queryKey: ['version', versionAId],
    queryFn: () => getVersion(versionAId),
    enabled: !!versionAId,
  })

  // Fetch version B
  const { data: versionB, isLoading: isLoadingB } = useQuery({
    queryKey: ['version', versionBId],
    queryFn: () => getVersion(versionBId),
    enabled: !!versionBId,
  })

  const versions = versionsData?.items || []
  const isLoading = isLoadingList || isLoadingA || isLoadingB
  const canCompare = versionA && versionB

  // Update URL params when selections change
  const handleSelectA = (id: string) => {
    setVersionAId(id)
    const params = new URLSearchParams(searchParams)
    if (id) {
      params.set('a', id)
    } else {
      params.delete('a')
    }
    setSearchParams(params)
  }

  const handleSelectB = (id: string) => {
    setVersionBId(id)
    const params = new URLSearchParams(searchParams)
    if (id) {
      params.set('b', id)
    } else {
      params.delete('b')
    }
    setSearchParams(params)
  }

  // Swap versions
  const handleSwap = () => {
    const tempA = versionAId
    handleSelectA(versionBId)
    handleSelectB(tempA)
  }

  // Copy after text
  const handleCopyAfter = async () => {
    if (versionB) {
      try {
        await navigator.clipboard.writeText(versionB.result_text)
        alert('Copied to clipboard!')
      } catch {
        alert('Failed to copy')
      }
    }
  }

  // Format version for select
  const formatVersionOption = (v: VersionItem) => {
    const date = new Date(v.created_at).toLocaleDateString()
    const title = v.title || (v.type === 'adapt' ? 'Adapted' : 'Ideal')
    return `${title} (${date})`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Compare Versions</h1>

      {/* Selection controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version A (Before)
            </label>
            <select
              value={versionAId}
              onChange={(e) => handleSelectA(e.target.value)}
              disabled={isLoadingList}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === versionBId}>
                  {formatVersionOption(v)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwap}
            disabled={!versionAId || !versionBId}
            className="mt-6 p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Swap versions"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version B (After)
            </label>
            <select
              value={versionBId}
              onChange={(e) => handleSelectB(e.target.value)}
              disabled={isLoadingList}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === versionAId}>
                  {formatVersionOption(v)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Diff viewer */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          Loading...
        </div>
      ) : canCompare ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700">
              Comparing: {versionA.title || 'Version A'} → {versionB.title || 'Version B'}
            </h2>
            <Button variant="secondary" size="sm" onClick={handleCopyAfter}>
              <Copy className="w-4 h-4 mr-1" />
              Copy Result
            </Button>
          </div>
          <div className="h-[500px]">
            <DiffViewer before={versionA.result_text} after={versionB.result_text} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          Select two versions to compare
        </div>
      )}

      {/* Version details */}
      {canCompare && (
        <div className="grid grid-cols-2 gap-6">
          <VersionSummary version={versionA} label="Version A" />
          <VersionSummary version={versionB} label="Version B" />
        </div>
      )}
    </div>
  )
}

interface VersionSummaryProps {
  version: {
    id: string
    created_at: string
    type: string
    title?: string
    vacancy_text: string
  }
  label: string
}

function VersionSummary({ version, label }: VersionSummaryProps) {
  const [showVacancy, setShowVacancy] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">{label}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            version.type === 'adapt'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {version.type}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <p>
          <strong>Title:</strong> {version.title || 'Untitled'}
        </p>
        <p>
          <strong>Created:</strong> {new Date(version.created_at).toLocaleString()}
        </p>
      </div>

      <button
        onClick={() => setShowVacancy(!showVacancy)}
        className="mt-3 text-xs text-primary-600 hover:text-primary-700"
      >
        {showVacancy ? 'Hide vacancy' : 'Show vacancy'}
      </button>

      {showVacancy && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 max-h-32 overflow-auto">
          <pre className="whitespace-pre-wrap font-mono">{version.vacancy_text}</pre>
        </div>
      )}
    </div>
  )
}
