import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Thesis {
  id: string
  statement: string
  domain: string
  status: string
  gate_g1: boolean
  gate_g2: boolean
  gate_g3: boolean
  gate_g4: boolean
  gate_g5: boolean
  gate_g6: boolean
  validation_summary: string
  created_at: string
  objection_count: number
  rpe_name: string
  gate_success_rate: number
}

interface PhiQLResult {
  query_type: string
  result: any
}

export default function PhilosophyNotebookPage() {
  const [theses, setTheses] = useState<Thesis[]>([])
  const [selectedThesis, setSelectedThesis] = useState<Thesis | null>(null)
  const [loading, setLoading] = useState(true)
  const [phiQLQuery, setPhiQLQuery] = useState('')
  const [phiQLType, setPhiQLType] = useState('WHY')
  const [phiQLResult, setPhiQLResult] = useState<PhiQLResult | null>(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [statistics, setStatistics] = useState<any>(null)

  useEffect(() => {
    loadTheses()
  }, [filterStatus])

  async function loadTheses() {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('list-pis-theses', {
        body: { 
          status: filterStatus === 'all' ? null : filterStatus,
          limit: 100
        }
      })

      if (error) throw error

      setTheses(data.theses || [])
      setStatistics(data.statistics)
    } catch (error) {
      console.error('Error loading theses:', error)
    } finally {
      setLoading(false)
    }
  }

  async function executePhiQLQuery() {
    if (!selectedThesis) return

    try {
      setQueryLoading(true)
      const { data, error } = await supabase.functions.invoke('phi-ql-query', {
        body: {
          query_type: phiQLType,
          entity_type: 'thesis',
          entity_id: selectedThesis.id,
          parameters: {}
        }
      })

      if (error) throw error

      setPhiQLResult(data)
    } catch (error) {
      console.error('Phi-QL query error:', error)
      setPhiQLResult({ query_type: phiQLType, result: { error: 'Query failed' } })
    } finally {
      setQueryLoading(false)
    }
  }

  async function runAdversarialLoop(thesisId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('adversarial-loop', {
        body: {
          thesis_id: thesisId,
          max_iterations: 3
        }
      })

      if (error) throw error

      alert(`Adversarial loop completed in ${data.iterations.length} iterations. Status: ${data.final_assessment.converged ? 'Converged' : 'Incomplete'}`)
      loadTheses()
    } catch (error) {
      console.error('Adversarial loop error:', error)
      alert('Adversarial loop failed')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      validated: { bg: 'bg-green-900/50', text: 'text-green-400', label: 'Validated' },
      rejected: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', label: 'Rejected' },
      unverified: { bg: 'bg-red-900/50', text: 'text-red-400', label: 'Unverified' },
      validating: { bg: 'bg-orange-900/50', text: 'text-orange-400', label: 'Validating' }
    }

    const badge = badges[status] || badges.unverified
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getGateIcon = (passed: boolean) => (
    <span className={`inline-block w-3 h-3 rounded-full ${passed ? 'bg-green-500' : 'bg-red-500'}`} />
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Philosophy Notebook IDE</h1>
        <p className="text-gray-400">
          Interactive validation browser and Phi-QL query console for the Philosophical Inference System
        </p>
      </div>

      {/* Statistics Dashboard */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400">Total Theses</div>
            <div className="text-2xl font-bold text-white">{statistics.total}</div>
          </div>
          <div className="bg-green-900/20 p-4 rounded-lg border border-green-700">
            <div className="text-sm text-gray-400">Validated</div>
            <div className="text-2xl font-bold text-green-400">{statistics.validated}</div>
          </div>
          <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-700">
            <div className="text-sm text-gray-400">Rejected</div>
            <div className="text-2xl font-bold text-yellow-400">{statistics.rejected}</div>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
            <div className="text-sm text-gray-400">Avg Gate Success</div>
            <div className="text-2xl font-bold text-white">{statistics.average_gate_success.toFixed(1)}%</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Thesis Browser */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Thesis Browser</h2>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-1"
            >
              <option value="all">All Status</option>
              <option value="validated">Validated</option>
              <option value="rejected">Rejected</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading theses...</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {theses.map((thesis) => (
                <div
                  key={thesis.id}
                  onClick={() => setSelectedThesis(thesis)}
                  className={`p-4 rounded border cursor-pointer transition-all ${
                    selectedThesis?.id === thesis.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800/80'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    {getStatusBadge(thesis.status)}
                    <span className="text-xs text-gray-500">
                      {new Date(thesis.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                    {thesis.statement}
                  </p>
                  {thesis.rpe_name && (
                    <div className="text-xs text-gray-500 mb-2">
                      RPE: {thesis.rpe_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Gates:</span>
                    {getGateIcon(thesis.gate_g1)}
                    {getGateIcon(thesis.gate_g2)}
                    {getGateIcon(thesis.gate_g3)}
                    {getGateIcon(thesis.gate_g4)}
                    {getGateIcon(thesis.gate_g5)}
                    {getGateIcon(thesis.gate_g6)}
                    <span className="ml-auto text-gray-400">
                      {thesis.gate_success_rate.toFixed(0)}%
                    </span>
                  </div>
                  {thesis.objection_count > 0 && (
                    <div className="mt-2 text-xs text-yellow-400">
                      {thesis.objection_count} objection(s)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Phi-QL Console */}
        <div className="space-y-6">
          {/* Query Console */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Phi-QL Query Console</h2>

            {!selectedThesis ? (
              <div className="text-center py-12 text-gray-500">
                Select a thesis to query
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Query Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['WHY', 'COUNTEREX', 'REPAIR', 'TRACE'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setPhiQLType(type)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          phiQLType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Selected Thesis</label>
                  <div className="bg-gray-900/50 p-3 rounded text-sm text-gray-300 border border-gray-700">
                    {selectedThesis.statement.substring(0, 150)}...
                  </div>
                </div>

                <button
                  onClick={executePhiQLQuery}
                  disabled={queryLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-medium transition-colors"
                >
                  {queryLoading ? 'Executing Query...' : `Execute ${phiQLType} Query`}
                </button>

                <button
                  onClick={() => runAdversarialLoop(selectedThesis.id)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-medium transition-colors"
                >
                  Run Adversarial Loop
                </button>
              </div>
            )}
          </div>

          {/* Query Results */}
          {phiQLResult && (
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                {phiQLResult.query_type} Results
              </h3>
              <div className="bg-gray-900/50 p-4 rounded text-sm text-gray-300 max-h-96 overflow-y-auto font-mono border border-gray-700">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(phiQLResult.result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Gate Details */}
          {selectedThesis && (
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Gate Verification Status</h3>
              <div className="space-y-2">
                {[
                  { gate: 'G1', name: 'Vocabulary Consistency', passed: selectedThesis.gate_g1 },
                  { gate: 'G2', name: 'Formalization Success', passed: selectedThesis.gate_g2 },
                  { gate: 'G3', name: 'Proof Soundness', passed: selectedThesis.gate_g3 },
                  { gate: 'G4', name: 'Countermodel Adequacy', passed: selectedThesis.gate_g4 },
                  { gate: 'G5', name: 'Repair Convergence', passed: selectedThesis.gate_g5 },
                  { gate: 'G6', name: 'Integration Coherence', passed: selectedThesis.gate_g6 }
                ].map((gate) => (
                  <div
                    key={gate.gate}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      {getGateIcon(gate.passed)}
                      <span className="font-medium text-white">{gate.gate}</span>
                      <span className="text-sm text-gray-400">{gate.name}</span>
                    </div>
                    <span className={gate.passed ? 'text-green-400' : 'text-red-400'}>
                      {gate.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
