import { useRef, useEffect, ChangeEvent } from 'react'

interface TextAreaWithCounterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label: string
  maxLength: number
  disabled?: boolean
  readOnly?: boolean
  minHeight?: number
}

export default function TextAreaWithCounter({
  value,
  onChange,
  placeholder,
  label,
  maxLength,
  disabled = false,
  readOnly = false,
  minHeight = 200,
}: TextAreaWithCounterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const charCount = value.length
  const isOverLimit = charCount > maxLength
  const percentage = Math.min((charCount / maxLength) * 100, 100)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
    }
  }, [value, minHeight])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span
          className={`text-xs ${
            isOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'
          }`}
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>

      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full h-full p-3 border rounded-lg text-sm font-mono leading-relaxed transition-colors ${
            isOverLimit
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
          } focus:outline-none focus:ring-2 ${
            readOnly ? 'bg-gray-50 cursor-default' : 'bg-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ minHeight: `${minHeight}px` }}
        />

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 rounded-b-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isOverLimit ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-primary-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {isOverLimit && (
        <p className="mt-1 text-xs text-red-600">
          Text exceeds maximum length by {(charCount - maxLength).toLocaleString()} characters
        </p>
      )}
    </div>
  )
}
