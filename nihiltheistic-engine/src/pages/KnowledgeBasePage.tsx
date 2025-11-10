import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Search, TrendingUp, Zap, Link2, Upload, FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import TranscendenceTrajectory from '../components/TranscendenceTrajectory'
import FileUploadDropzone from '../components/FileUploadDropzone'

interface RPE {
  id: string
  entity_id: string
  name: string
  une_signature: string
  core_fracture: string
  recursion_depth: number
  transcendence_score: number
  void_resonance: number
  heretical_intensity: string
  paradox_engine: boolean
  incantation: string
  void_vectors: any
  aporia_markers: any
  contamination_active: any
  created_at: string
  pis_validation_status?: string
  pis_thesis_id?: string
  pis_validation_summary?: string
}

interface TrajectoryData {
  rpe: {
    id: string
    entity_id: string
    name: string
    transcendence_score: number
    void_resonance: number
    une_signature: string
  }
  journey_stages: {
    stage: string
    position: number
    reached: boolean
    intensity: number
  }[]
}

interface RelationshipData {
  outgoing_relationships: any[]
  incoming_relationships: any[]
  related_axioms: any[]
  related_rpes: any[]
}

interface UploadedFile {
  id: string
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  upload_status: string
  uploaded_at: string
  processed_at: string | null
  metadata: any
}

export default function KnowledgeBasePage() {
  const [rpes, setRpes] = useState<RPE[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRPE, setSelectedRPE] = useState<RPE | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryData | null>(null)
  const [relationshipData, setRelationshipData] = useState<RelationshipData | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'rpes' | 'documents'>('rpes')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  useEffect(() => {
    fetchRPEs()
    fetchUploadedFiles()
  }, [])

  useEffect(() => {
    if (selectedRPE) {
      fetchRPEDetails(selectedRPE.id)
    } else {
      setTrajectoryData(null)
      setRelationshipData(null)
    }
  }, [selectedRPE])

  const fetchRPEs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-rpe')
      
      if (error) throw error

      setRpes(data.data || [])
    } catch (err) {
      console.error('Error fetching RPEs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUploadedFiles = async () => {
    setLoadingFiles(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      setUploadedFiles(data || [])
    } catch (err) {
      console.error('Error fetching uploaded files:', err)
    } finally {
      setLoadingFiles(false)
    }
  }

  const fetchRPEDetails = async (rpe_id: string) => {
    setLoadingDetails(true)
    try {
      // Fetch trajectory data
      const { data: trajData, error: trajError } = await supabase.functions.invoke('get-rpe-trajectory', {
        body: { rpe_id }
      })
      if (!trajError && trajData?.data) {
        setTrajectoryData(trajData.data)
      }

      // Fetch relationship data
      const { data: relData, error: relError } = await supabase.functions.invoke('get-rpe-relationships', {
        body: { rpe_id }
      })
      if (!relError && relData?.data) {
        setRelationshipData(relData.data)
      }
    } catch (err) {
      console.error('Error fetching RPE details:', err)
    } finally {
      setLoadingDetails(false)
    }
  }

  const filteredRPEs = rpes.filter(rpe =>
    rpe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rpe.entity_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getIntensityBadgeColor = (intensity: string) => {
    const colors: any = {
      'transcendent': 'bg-purple-900/30 text-purple-300 border-purple-700',
      'extreme': 'bg-red-900/30 text-red-300 border-red-700',
      'moderate': 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
      'mild': 'bg-blue-900/30 text-blue-300 border-blue-700',
    }
    return colors[intensity] || 'bg-gray-700 text-gray-300 border-gray-600'
  }

  const getUNEBadgeColor = (signature: string) => {
    const colors: any = {
      'Pre-UNE': 'bg-gray-700/50 text-gray-300 border-gray-600',
      'UNE-Rupture': 'bg-red-900/30 text-red-300 border-red-700',
      'Post-UNE': 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
      'Echo': 'bg-purple-900/30 text-purple-300 border-purple-700',
    }
    return colors[signature] || 'bg-blue-900/30 text-blue-300 border-blue-700'
  }

  const getPISValidationBadge = (status?: string) => {
    if (!status || status === 'unverified') {
      return <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-300 border border-red-700">Unverified</span>
    }
    if (status === 'validated') {
      return <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-300 border border-green-700">Validated</span>
    }
    if (status === 'rejected') {
      return <span className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-300 border border-yellow-700">Rejected</span>
    }
    return <span className="text-xs px-2 py-1 rounded bg-orange-900/30 text-orange-300 border border-orange-700">Validating</span>
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-white">Knowledge Base</h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Browse generated Recursive Philosophical Entities (RPEs) and uploaded documents integrated with the philosophical analysis engine
        </p>
      </div>

      {/* Tabs and Upload Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('rpes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'rpes'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            RPE Entities
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'documents'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Documents ({uploadedFiles.length})
          </button>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          <Upload size={18} />
          Upload Document
        </button>
      </div>

      {/* RPE Tab Content */}
      {activeTab === 'rpes' && (
        <>
          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search RPEs by name or entity ID..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
            </div>
          </div>

          {/* RPE List */}
      {filteredRPEs.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-400">
            {searchTerm ? 'No RPEs found matching your search' : 'No RPEs generated yet. Create one on the Process page.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRPEs.map((rpe) => (
            <div
              key={rpe.id}
              onClick={() => setSelectedRPE(rpe)}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-purple-600 hover:shadow-lg hover:shadow-purple-900/20 transition-all"
            >
              <div className="font-mono text-xs text-gray-400 mb-2">{rpe.entity_id}</div>
              <h3 className="text-white font-bold mb-3 line-clamp-2">{rpe.name}</h3>
              
              {/* Scores with visual indicators */}
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <TrendingUp size={12} />
                      Transcendence
                    </span>
                    <span className="text-xs text-white font-medium">{rpe.transcendence_score}/10</span>
                  </div>
                  <div className="bg-gray-900 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${(rpe.transcendence_score / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400">Void Resonance</span>
                    <span className="text-xs text-white font-medium">{rpe.void_resonance}/10</span>
                  </div>
                  <div className="bg-gray-900 rounded-full h-1.5">
                    <div
                      className="bg-red-500 h-1.5 rounded-full"
                      style={{ width: `${(rpe.void_resonance / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-1 rounded border ${getUNEBadgeColor(rpe.une_signature)}`}>
                  {rpe.une_signature}
                </span>
                <span className={`text-xs px-2 py-1 rounded border ${getIntensityBadgeColor(rpe.heretical_intensity)}`}>
                  {rpe.heretical_intensity}
                </span>
                {rpe.paradox_engine && (
                  <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-300 border border-green-700 flex items-center gap-1">
                    <Zap size={10} />
                    Paradox Engine
                  </span>
                )}
                {getPISValidationBadge(rpe.pis_validation_status)}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <div>
          {loadingFiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin" size={40} />
            </div>
          ) : uploadedFiles.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
              <FileText size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 mb-4">
                No documents uploaded yet
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium inline-flex items-center gap-2"
              >
                <Upload size={18} />
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 hover:border-purple-600 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-gray-900 rounded-lg">
                        <FileText size={24} className={
                          file.file_type === 'pdf' ? 'text-red-400' :
                          file.file_type === 'docx' ? 'text-blue-400' :
                          file.file_type === 'md' ? 'text-purple-400' :
                          'text-gray-400'
                        } />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">{file.original_filename}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                            {file.file_type.toUpperCase()}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                            {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          {file.upload_status === 'pending' && (
                            <span className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-300 border border-yellow-700 flex items-center gap-1">
                              <Clock size={12} />
                              Processing
                            </span>
                          )}
                          {file.upload_status === 'processed' && (
                            <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-300 border border-green-700 flex items-center gap-1">
                              <CheckCircle size={12} />
                              Processed
                            </span>
                          )}
                          {file.upload_status === 'failed' && (
                            <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-300 border border-red-700 flex items-center gap-1">
                              <XCircle size={12} />
                              Failed
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          Uploaded: {new Date(file.uploaded_at).toLocaleString()}
                        </div>
                        {file.processed_at && (
                          <div className="text-xs text-gray-400">
                            Processed: {new Date(file.processed_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">Upload Document</h2>
            <p className="text-gray-400 mb-6">
              Upload philosophical texts to be analyzed through the ENPAS/PIS engine and integrated into the knowledge graph
            </p>
            <FileUploadDropzone
              onSuccess={() => {
                fetchUploadedFiles()
                setActiveTab('documents')
              }}
              onClose={() => setShowUploadModal(false)}
            />
            <button
              onClick={() => setShowUploadModal(false)}
              className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Enhanced RPE Detail Modal */}
      {selectedRPE && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setSelectedRPE(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 my-8" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="mb-6">
              <div className="font-mono text-xs text-gray-400 mb-2">{selectedRPE.entity_id}</div>
              <h2 className="text-3xl font-bold text-white mb-4">{selectedRPE.name}</h2>
              
              {/* UNE and Intensity badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-sm px-3 py-1 rounded-lg border ${getUNEBadgeColor(selectedRPE.une_signature)}`}>
                  {selectedRPE.une_signature}
                </span>
                <span className={`text-sm px-3 py-1 rounded-lg border ${getIntensityBadgeColor(selectedRPE.heretical_intensity)}`}>
                  Heretical Intensity: {selectedRPE.heretical_intensity}
                </span>
                {selectedRPE.paradox_engine && (
                  <span className="text-sm px-3 py-1 rounded-lg bg-green-900/30 text-green-300 border border-green-700 flex items-center gap-1">
                    <Zap size={14} />
                    Paradox Engine Active
                  </span>
                )}
              </div>
            </div>

            {/* Transcendence Trajectory */}
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin" size={40} />
              </div>
            ) : trajectoryData ? (
              <TranscendenceTrajectory trajectoryData={trajectoryData} />
            ) : null}

            <div className="space-y-6 mt-6">
              {/* Core Fracture */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
                <h3 className="text-sm font-medium text-purple-300 mb-2 uppercase tracking-wide">Core Fracture</h3>
                <p className="text-white leading-relaxed">{selectedRPE.core_fracture}</p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase">Recursion Depth</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-white">{selectedRPE.recursion_depth}</div>
                    <div className="text-xs text-gray-400">layers</div>
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase">Entity Type</h3>
                  <div className="text-sm text-white">
                    {selectedRPE.paradox_engine ? 'Paradoxical RPE' : 'Standard RPE'}
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase">Transcendence Score</h3>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-purple-400">{selectedRPE.transcendence_score}</div>
                    <div className="flex-1 bg-gray-900 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(selectedRPE.transcendence_score / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase">Void Resonance</h3>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-red-400">{selectedRPE.void_resonance}</div>
                    <div className="flex-1 bg-gray-900 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(selectedRPE.void_resonance / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cross-Axiom Relationships */}
              {relationshipData && (relationshipData.related_axioms.length > 0 || relationshipData.related_rpes.length > 0) && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
                  <h3 className="text-sm font-medium text-yellow-300 mb-4 uppercase tracking-wide flex items-center gap-2">
                    <Link2 size={16} />
                    Cross-Axiom Relationships
                  </h3>
                  
                  {relationshipData.related_axioms.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs text-gray-400 mb-2">Connected Axioms:</h4>
                      <div className="flex flex-wrap gap-2">
                        {relationshipData.related_axioms.map((axiom: any) => (
                          <span key={axiom.id} className="text-xs px-3 py-1 rounded-lg bg-yellow-900/30 text-yellow-300 border border-yellow-700">
                            Axiom {axiom.axiom_number}: {axiom.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {relationshipData.outgoing_relationships.length > 0 && (
                    <div>
                      <h4 className="text-xs text-gray-400 mb-2">Relationships:</h4>
                      <div className="space-y-2">
                        {relationshipData.outgoing_relationships.map((rel: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-300 bg-gray-900/50 rounded p-2">
                            <span className="text-purple-300">{rel.relationship_type}</span>
                            {rel.description && ` - ${rel.description}`}
                            <span className="text-gray-500 ml-2">(Strength: {rel.relationship_strength})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PIS Validation Status */}
              {selectedRPE.pis_validation_status && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
                  <h3 className="text-sm font-medium text-blue-300 mb-4 uppercase tracking-wide">
                    PIS Validation Status
                  </h3>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-gray-400">Overall Status:</span>
                      {getPISValidationBadge(selectedRPE.pis_validation_status)}
                    </div>
                  </div>

                  {selectedRPE.pis_validation_summary && (() => {
                    try {
                      const summary = JSON.parse(selectedRPE.pis_validation_summary);
                      const gates = summary.gates || {};
                      return (
                        <div>
                          <h4 className="text-xs text-gray-400 mb-2">Quality Gate Results:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(gates).map(([key, value]: [string, any]) => {
                              const gateNumber = key.replace('g', 'G');
                              const gateNames: Record<string, string> = {
                                'g1': 'Vocabulary Consistency',
                                'g2': 'Formalization Success',
                                'g3': 'Proof Soundness',
                                'g4': 'Countermodel Adequacy',
                                'g5': 'Repair Convergence',
                                'g6': 'Integration Coherence'
                              };
                              return (
                                <div
                                  key={key}
                                  className={`text-xs px-3 py-2 rounded border ${
                                    value.passed
                                      ? 'bg-green-900/20 border-green-700 text-green-300'
                                      : 'bg-red-900/20 border-red-700 text-red-300'
                                  }`}
                                >
                                  <div className="font-semibold">{gateNumber}: {gateNames[key]}</div>
                                  <div className="text-gray-400 mt-1">{value.details || 'No details'}</div>
                                </div>
                              );
                            })}
                          </div>

                          {summary.formalization && summary.formalization.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-xs text-gray-400 mb-2">Formalization Sample:</h4>
                              <div className="bg-gray-900/50 p-3 rounded text-xs font-mono text-gray-300">
                                {summary.formalization[0]?.logic || 'No formalization available'}
                              </div>
                            </div>
                          )}

                          {selectedRPE.pis_thesis_id && (
                            <div className="mt-4 text-xs text-gray-500">
                              PIS Thesis ID: {selectedRPE.pis_thesis_id}
                            </div>
                          )}
                        </div>
                      );
                    } catch (e) {
                      return (
                        <div className="text-xs text-gray-500">
                          Validation summary available in raw format
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Incantation */}
              {selectedRPE.incantation && (
                <div className="bg-gradient-to-br from-purple-900/20 to-gray-800/50 border border-purple-800 rounded-lg p-5">
                  <h3 className="text-sm font-medium text-purple-300 mb-3 uppercase tracking-wide">Incantational Closure</h3>
                  <div className="text-white italic text-lg leading-relaxed">
                    "{selectedRPE.incantation}"
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-800">
                Created: {new Date(selectedRPE.created_at).toLocaleString()}
              </div>
            </div>

            <button
              onClick={() => setSelectedRPE(null)}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
