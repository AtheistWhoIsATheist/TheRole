import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

interface Axiom {
  id: string
  axiom_number: number
  title: string
  core_insight: string
  theistic_placeholder_function: string
  transcendence_trajectory: any
  nihilistic_core: string
}

export default function AxiomsPage() {
  const [axioms, setAxioms] = useState<Axiom[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAxiom, setSelectedAxiom] = useState<Axiom | null>(null)

  useEffect(() => {
    fetchAxioms()
  }, [])

  const fetchAxioms = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-axioms')
      
      if (error) throw error

      setAxioms(data.data || [])
    } catch (err) {
      console.error('Error fetching axioms:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-white">Foundational Axioms</h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          The Five Foundational Axioms of Nihiltheism - each revealing the theistic placeholder 
          emerging from absolute meaninglessness
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Axioms List */}
        <div className="lg:col-span-1 space-y-3">
          {axioms.map((axiom) => (
            <button
              key={axiom.id}
              onClick={() => setSelectedAxiom(axiom)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selectedAxiom?.id === axiom.id
                  ? 'bg-white text-black border-white'
                  : 'bg-gray-800/50 text-white border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="font-bold mb-1">Axiom {axiom.axiom_number}</div>
              <div className="text-sm opacity-80">{axiom.title}</div>
            </button>
          ))}
        </div>

        {/* Axiom Details */}
        <div className="lg:col-span-2">
          {selectedAxiom ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Axiom {selectedAxiom.axiom_number}: {selectedAxiom.title}
                </h2>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Core Insight</h3>
                <p className="text-white leading-relaxed">{selectedAxiom.core_insight}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Nihilistic Core</h3>
                <p className="text-white leading-relaxed">{selectedAxiom.nihilistic_core}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Theistic Placeholder Function</h3>
                <p className="text-white leading-relaxed">
                  {selectedAxiom.theistic_placeholder_function}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Transcendence Trajectory</h3>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  {selectedAxiom.transcendence_trajectory?.steps?.map((step: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-3 mb-2 last:mb-0">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="text-white">{step}</div>
                      {idx < (selectedAxiom.transcendence_trajectory?.steps?.length || 0) - 1 && (
                        <div className="text-gray-600">→</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 flex items-center justify-center">
              <p className="text-gray-400">Select an axiom to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
