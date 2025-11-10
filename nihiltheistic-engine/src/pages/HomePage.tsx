import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import TranscendenceTrajectory from '../components/TranscendenceTrajectory'

interface Layer {
  layer_name: string
  content: string
  density_score: number
}

export default function HomePage() {
  const [concept, setConcept] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedLayers, setExpandedLayers] = useState<{ [key: number]: boolean }>({})
  const [trajectoryData, setTrajectoryData] = useState<any>(null)
  const [loadingTrajectory, setLoadingTrajectory] = useState(false)

  const processPhilosophicalInput = async () => {
    if (!concept.trim()) {
      setError('Please enter a philosophical concept')
      return
    }

    setProcessing(true)
    setError(null)
    setResult(null)
    setTrajectoryData(null)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('process-philosophical-input', {
        body: { concept }
      })

      if (invokeError) throw invokeError

      setResult(data.data)

      // Fetch trajectory data for the generated RPE
      if (data.data?.rpe?.id) {
        await fetchTrajectory(data.data.rpe.id)
      }
    } catch (err: any) {
      setError(err.message || 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const fetchTrajectory = async (rpe_id: string) => {
    setLoadingTrajectory(true)
    try {
      const { data, error } = await supabase.functions.invoke('get-rpe-trajectory', {
        body: { rpe_id }
      })

      if (!error && data?.data) {
        setTrajectoryData(data.data)
      }
    } catch (err) {
      console.error('Error fetching trajectory:', err)
    } finally {
      setLoadingTrajectory(false)
    }
  }

  const toggleLayer = (layerNum: number) => {
    setExpandedLayers(prev => ({ ...prev, [layerNum]: !prev[layerNum] }))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-white">Iterative Densification Protocol</h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Enter a philosophical concept to generate a Recursive Philosophical Entity (RPE) through the 5-layer ENPAS methodology: 
          Excavate → Fracture → Suspend → Densify → Attune
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Philosophical Concept or Question
        </label>
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="e.g., What is the nature of freedom?"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 min-h-[120px]"
        />
        
        <button
          onClick={processPhilosophicalInput}
          disabled={processing}
          className="mt-4 w-full bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {processing ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Processing through IDP layers...
            </>
          ) : (
            'Generate RPE'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-8 text-red-300">
          {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Transcendence Trajectory Visualization */}
          {loadingTrajectory ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 flex items-center justify-center">
              <Loader2 className="animate-spin" size={30} />
            </div>
          ) : trajectoryData ? (
            <TranscendenceTrajectory trajectoryData={trajectoryData} />
          ) : null}

          {/* RPE Metadata */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Recursive Philosophical Entity</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Entity ID:</span>
                <span className="ml-2 text-white font-mono">{result.rpe.entity_id}</span>
              </div>
              <div>
                <span className="text-gray-400">Recursion Depth:</span>
                <span className="ml-2 text-white">{result.rpe.recursion_depth}</span>
              </div>
              <div>
                <span className="text-gray-400">UNE Signature:</span>
                <span className="ml-2 text-white">{result.rpe.une_signature}</span>
              </div>
              <div>
                <span className="text-gray-400">Heretical Intensity:</span>
                <span className="ml-2 text-white">{result.rpe.heretical_intensity}</span>
              </div>
              <div>
                <span className="text-gray-400">Transcendence Score:</span>
                <span className="ml-2 text-white">{result.rpe.transcendence_score}/10</span>
              </div>
              <div>
                <span className="text-gray-400">Void Resonance:</span>
                <span className="ml-2 text-white">{result.rpe.void_resonance}/10</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Core Fracture:</div>
              <div className="text-white">{result.rpe.core_fracture}</div>
            </div>
          </div>

          {/* 5-Layer Iterative Densification */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">5-Layer Iterative Densification</h2>
            <div className="space-y-3">
              {result.layers && Object.entries(result.layers).map(([key, value]: [string, any], idx) => {
                const layerNum = idx + 1
                const isExpanded = expandedLayers[layerNum] !== false
                const layerNames = ['Excavate', 'Fracture', 'Suspend', 'Densify', 'Attune']
                
                return (
                  <div key={key} className="border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleLayer(layerNum)}
                      className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors flex items-center justify-between text-left"
                    >
                      <span className="text-white font-medium">
                        Layer {layerNum}: {layerNames[idx]}
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    {isExpanded && (
                      <div className="p-4 bg-gray-900/50 text-gray-300 text-sm leading-relaxed">
                        {value}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Incantation */}
          {result.rpe.incantation && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-400 mb-3">Incantational Closure</h3>
              <div className="text-white italic text-lg leading-relaxed">
                {result.rpe.incantation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
