import { useNavigate } from 'react-router-dom'
import { FileText, Sparkles, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            EdtonAI - Оптимизатор резюме
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Используйте возможности ИИ для создания резюме, которое пройдёт ATS-системы 
            и привлечёт внимание рекрутеров
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Wizard Mode */}
          <button
            onClick={() => navigate('/wizard')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <FileText className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Адаптация под вакансию</h2>
                <span className="text-sm text-blue-600 font-medium">Пошаговый мастер</span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Загрузите резюме и описание вакансии. ИИ проанализирует соответствие 
              и предложит конкретные улучшения для максимальной релевантности.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">1</span>
                Загрузка резюме
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">2</span>
                Загрузка вакансии
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">3</span>
                Анализ соответствия
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">4</span>
                Улучшения и результат
              </div>
            </div>

            <div className="flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
              Начать <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>

          {/* Ideal Resume Mode */}
          <button
            onClick={() => navigate('/ideal-resume')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                <Sparkles className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Идеальное резюме</h2>
                <span className="text-sm text-purple-600 font-medium">Генерация с нуля</span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Создайте идеальное резюме для целевой вакансии. ИИ сгенерирует 
              структуру и контент, оптимизированные под требования работодателя.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-medium">1</span>
                Ваши данные и опыт
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-medium">2</span>
                Целевая вакансия
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-medium">3</span>
                Генерация резюме
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-medium">4</span>
                Редактирование
              </div>
            </div>

            <div className="flex items-center text-purple-600 font-medium group-hover:gap-2 transition-all">
              Начать <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          Powered by AI • Ваши данные не сохраняются после сессии
        </p>
      </div>
    </div>
  )
}
