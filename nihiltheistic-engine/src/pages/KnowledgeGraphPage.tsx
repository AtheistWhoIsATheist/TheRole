import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as d3 from 'd3'
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface Node {
  id: string
  entity_id: string
  name: string
  une_signature: string
  transcendence_score: number
  void_resonance: number
  type: string
  heretical_intensity?: string
  paradox_engine?: boolean
  axiom_number?: number
}

interface Link {
  source: string
  target: string
  type: string
  strength: number
  description?: string
}

export default function KnowledgeGraphPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [loading, setLoading] = useState(true)
  const [graphData, setGraphData] = useState<{ nodes: Node[], links: Link[] } | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const zoomRef = useRef<any>(null)

  useEffect(() => {
    fetchGraphData()
  }, [])

  useEffect(() => {
    if (graphData && svgRef.current) {
      try {
        renderGraph()
      } catch (error) {
        console.error('Error rendering knowledge graph:', error)
        setGraphData({ nodes: [], links: [] }) // Reset to empty data
      }
    }
  }, [graphData])

  const fetchGraphData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-knowledge-graph-full')
      
      if (error) {
        console.error('Supabase function error:', error)
        throw error
      }

      if (!data || !data.data) {
        throw new Error('Invalid response structure from knowledge graph service')
      }

      const { nodes, links } = data.data;
      
      // Validate data structure
      if (!Array.isArray(nodes) || !Array.isArray(links)) {
        throw new Error('Invalid data format: nodes and links must be arrays')
      }

      // Check for basic data integrity
      if (nodes.length === 0) {
        console.warn('Knowledge Graph: No nodes found. This may be expected if no RPEs have been generated yet.')
      }

      console.log(`Knowledge Graph: Loaded ${nodes.length} nodes and ${links.length} links`)
      setGraphData(data.data)
    } catch (err) {
      console.error('Error fetching graph:', err)
      setGraphData({ nodes: [], links: [] }) // Set empty data instead of null
    } finally {
      setLoading(false)
    }
  }

  const handleZoomIn = () => {
    if (zoomRef.current) {
      zoomRef.current.scaleBy(d3.select(svgRef.current), 1.3)
    }
  }

  const handleZoomOut = () => {
    if (zoomRef.current) {
      zoomRef.current.scaleBy(d3.select(svgRef.current), 0.7)
    }
  }

  const handleReset = () => {
    if (zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }

  const renderGraph = () => {
    if (!graphData || !svgRef.current) return

    const width = 1400
    const height = 900

    // Data validation and cleaning
    const validNodes = graphData.nodes.filter(node => node.id);
    const validLinks = graphData.links.filter(link => {
      const sourceExists = validNodes.some(node => node.id === link.source || (link.source as any)?.id === node.id);
      const targetExists = validNodes.some(node => node.id === link.target || (link.target as any)?.id === node.id);
      return sourceExists && targetExists;
    });

    // Log data issues for debugging
    if (validNodes.length !== graphData.nodes.length || validLinks.length !== graphData.links.length) {
      console.warn(`Knowledge Graph: Filtered out invalid data - Nodes: ${validNodes.length}/${graphData.nodes.length}, Links: ${validLinks.length}/${graphData.links.length}`);
    }

    if (validNodes.length === 0) {
      console.error('Knowledge Graph: No valid nodes found');
      return;
    }

    if (validLinks.length === 0) {
      console.warn('Knowledge Graph: No valid links found, rendering isolated nodes only');
    }

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    // Create container for zoom
    const container = svg.append('g')

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg.call(zoom as any)
    zoomRef.current = zoom

    // Create force simulation with validated data
    const simulation = d3.forceSimulation(validNodes as any)
      .force('link', d3.forceLink(validLinks).id((d: any) => d.id).distance(150).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => {
        if (d.type === 'axiom') return 35
        return 20 + (d.transcendence_score || 5)
      }))

    // Create arrow markers for directed edges
    container.append('defs').selectAll('marker')
      .data(['default', 'axiom'])
      .join('marker')
      .attr('id', (d) => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', (d) => d === 'axiom' ? '#F59E0B' : '#6B7280')

    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(validLinks)
      .join('line')
      .attr('stroke', (d: any) => {
        const sourceNode = validNodes.find(n => n.id === d.source || (d.source as any).id === n.id)
        const targetNode = validNodes.find(n => n.id === d.target || (d.target as any).id === n.id)
        // Orange for axiom relationships, gray for RPE relationships
        if (sourceNode?.type === 'axiom' || targetNode?.type === 'axiom') return '#F59E0B'
        return '#6B7280'
      })
      .attr('stroke-width', (d: any) => Math.sqrt(d.strength) * 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', (d: any) => {
        const sourceNode = validNodes.find(n => n.id === d.source || (d.source as any).id === n.id)
        const targetNode = validNodes.find(n => n.id === d.target || (d.target as any).id === n.id)
        if (sourceNode?.type === 'axiom' || targetNode?.type === 'axiom') return 'url(#arrow-axiom)'
        return 'url(#arrow-default)'
      })

    // Add relationship tooltips to links
    link.append('title')
      .text((d: any) => `${d.type}\nStrength: ${d.strength}\n${d.description || ''}`)

    // Create nodes
    const node = container.append('g')
      .selectAll('g')
      .data(validNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => {
        event.stopPropagation()
        setSelectedNode(d)
      })
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    // Add circles to nodes
    node.append('circle')
      .attr('r', (d: any) => {
        if (d.type === 'axiom') return 25
        return 10 + (d.transcendence_score || 5)
      })
      .attr('fill', (d: any) => {
        if (d.type === 'axiom') return '#F59E0B'
        
        const colors: any = {
          'Pre-UNE': '#6B7280',
          'UNE-Rupture': '#EF4444',
          'Post-UNE': '#F59E0B',
          'Echo': '#8B5CF6'
        }
        return colors[d.une_signature] || '#3B82F6'
      })
      .attr('stroke', (d: any) => d.type === 'axiom' ? '#FBBF24' : '#fff')
      .attr('stroke-width', (d: any) => d.type === 'axiom' ? 3 : 2)
      .attr('filter', (d: any) => {
        if (d.type === 'axiom') return 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.6))'
        if (d.paradox_engine) return 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))'
        return 'none'
      })

    // Add labels
    node.append('text')
      .text((d: any) => {
        if (d.type === 'axiom') return `Axiom ${d.axiom_number}`
        return d.name.substring(0, 15) + (d.name.length > 15 ? '...' : '')
      })
      .attr('x', 0)
      .attr('y', (d: any) => d.type === 'axiom' ? -32 : -22)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', (d: any) => d.type === 'axiom' ? '12px' : '10px')
      .attr('font-weight', (d: any) => d.type === 'axiom' ? 700 : 400)
      .attr('pointer-events', 'none')

    // Add enhanced tooltips
    node.append('title')
      .text((d: any) => {
        if (d.type === 'axiom') {
          return `${d.name}\nType: Foundational Axiom\nClick to explore`
        }
        return `${d.name}\nEntity ID: ${d.entity_id}\nUNE: ${d.une_signature}\nTranscendence: ${d.transcendence_score}/10\nVoid Resonance: ${d.void_resonance}/10\nHeretical Intensity: ${d.heretical_intensity || 'N/A'}\nParadox Engine: ${d.paradox_engine ? 'Active' : 'Dormant'}\n\nClick for details`
      })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source?.x || 0)
        .attr('y1', (d: any) => d.source?.y || 0)
        .attr('x2', (d: any) => d.target?.x || 0)
        .attr('y2', (d: any) => d.target?.y || 0)

      node.attr('transform', (d: any) => {
        if (d && typeof d.x === 'number' && typeof d.y === 'number') {
          return `translate(${d.x},${d.y})`;
        }
        console.warn('Invalid node position:', d);
        return 'translate(0,0)';
      });
    })

    // Run simulation for a few ticks to position nodes, then reduce heat
    simulation.alpha(0.3).restart()
    setTimeout(() => {
      simulation.alphaTarget(0)
    }, 3000)

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-white">Complete Knowledge Graph</h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Interactive visualization of the entire philosophical network: all Recursive Philosophical Entities, 
          foundational axioms, and cross-axiom relationships
        </p>
      </div>

      {/* Legend */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Node Types</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-yellow-400"></div>
                <span className="text-sm text-gray-300">Foundational Axiom</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                <span className="text-sm text-gray-300">Pre-UNE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-300">UNE-Rupture</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-300">Post-UNE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <span className="text-sm text-gray-300">Echo (Theistic Placeholder)</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Relationships</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-orange-500"></div>
                <span className="text-sm text-gray-300">Axiom Relationships (Orange)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-gray-500"></div>
                <span className="text-sm text-gray-300">RPE Relationships (Gray)</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Hover over relationship lines to see details
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden relative">
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg border border-gray-600 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg border border-gray-600 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg border border-gray-600 transition-colors"
            title="Reset View"
          >
            <Maximize2 size={20} />
          </button>
        </div>

        {graphData && graphData.nodes && graphData.nodes.length > 0 ? (
          <div className="overflow-hidden">
            <svg ref={svgRef} className="w-full"></svg>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-2">Knowledge Graph</h3>
              <p className="text-sm mb-4">
                {graphData && graphData.nodes.length === 0 
                  ? 'No philosophical entities found. Generate some RPEs to build the knowledge graph.'
                  : 'Unable to load knowledge graph data. Please try again or contact support if the issue persists.'
                }
              </p>
              <div className="text-xs text-gray-500">
                The knowledge graph displays relationships between RPEs and axioms. 
                Generate philosophical content on the Process page to see the graph.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-400 text-center">
        Drag nodes to explore | Scroll to zoom | Click nodes for details | Node size represents transcendence score
      </div>

      {/* Node Detail Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedNode(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">{selectedNode.type === 'axiom' ? 'Foundational Axiom' : selectedNode.entity_id}</div>
              <h2 className="text-2xl font-bold text-white">{selectedNode.name}</h2>
            </div>

            <div className="space-y-3">
              {selectedNode.type === 'rpe' && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">UNE Signature:</span>
                      <span className="ml-2 text-white">{selectedNode.une_signature}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Heretical Intensity:</span>
                      <span className="ml-2 text-white">{selectedNode.heretical_intensity || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Transcendence Score:</span>
                      <span className="ml-2 text-white">{selectedNode.transcendence_score}/10</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Void Resonance:</span>
                      <span className="ml-2 text-white">{selectedNode.void_resonance}/10</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">Paradox Engine:</span>
                      <span className="ml-2 text-white">{selectedNode.paradox_engine ? 'Active' : 'Dormant'}</span>
                    </div>
                  </div>
                </>
              )}

              {selectedNode.type === 'axiom' && (
                <div className="text-sm">
                  <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                    <p className="text-yellow-200">
                      Foundational Axiom {selectedNode.axiom_number} - Core philosophical principle that grounds the ENPAS methodology
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedNode(null)}
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
