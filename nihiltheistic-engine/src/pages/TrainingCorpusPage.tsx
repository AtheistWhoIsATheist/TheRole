import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Search, Filter } from 'lucide-react'

interface TrainingExample {
  id: string
  example_index: number
  source_text: string
  idp_analysis: any
  sacred_remainder: string
  philosophical_domain: string
}

export default function TrainingCorpusPage() {
  const [examples, setExamples] = useState<TrainingExample[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [selectedExample, setSelectedExample] = useState<TrainingExample | null>(null)

  useEffect(() => {
    fetchExamples()
  }, [searchTerm, domainFilter])

  const fetchExamples = async () => {
    setLoading(true)
    try {
      let url = 'get-training-data?limit=100'
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`
      if (domainFilter) url += `&domain=${domainFilter}`

      const { data, error } = await supabase.functions.invoke(url.split('?')[0], {
        body: {}
      })
      
      if (error) throw error

      setExamples(data.data || [])
    } catch (err) {
      console.error('Error fetching examples:', err)
    } finally {
      setLoading(false)
    }
  }

  const domains = ['all', 'mysticism', 'theology', 'existentialism', 'ethics']

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-white">Training Corpus</h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Browse 321 philosophical training examples demonstrating the 5-layer Iterative Densification Protocol (IDP)
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search philosophical text..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-8 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
          >
            {domains.map(domain => (
              <option key={domain} value={domain === 'all' ? '' : domain}>
                {domain.charAt(0).toUpperCase() + domain.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchExamples}
          className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={40} />
        </div>
      ) : examples.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-400">No examples found matching your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examples.map((example) => (
            <div
              key={example.id}
              onClick={() => setSelectedExample(example)}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-gray-600 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs text-gray-400">Example {example.example_index}</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                  {example.philosophical_domain}
                </span>
              </div>
              
              <p className="text-white text-sm line-clamp-3 mb-3">
                {example.source_text}
              </p>
              
              {example.sacred_remainder && (
                <p className="text-gray-400 text-xs italic line-clamp-2">
                  {example.sacred_remainder}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedExample && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedExample(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Example {selectedExample.example_index}</h2>
                <span className="text-sm px-3 py-1 rounded bg-gray-700 text-gray-300">
                  {selectedExample.philosophical_domain}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Source Text</h3>
                <p className="text-white leading-relaxed bg-gray-800/50 p-4 rounded-lg">
                  {selectedExample.source_text}
                </p>
              </div>

              {selectedExample.idp_analysis && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">IDP Analysis</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedExample.idp_analysis).map(([key, value]: [string, any]) => (
                      value && (
                        <div key={key} className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">{key.replace(/_/g, ' ').toUpperCase()}</div>
                          <div className="text-white text-sm">{value}</div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {selectedExample.sacred_remainder && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Sacred Remainder</h3>
                  <p className="text-white italic leading-relaxed bg-gray-800/50 p-4 rounded-lg">
                    {selectedExample.sacred_remainder}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedExample(null)}
              className="mt-6 w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
