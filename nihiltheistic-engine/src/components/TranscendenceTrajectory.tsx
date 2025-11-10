import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

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

interface Props {
  trajectoryData: TrajectoryData
}

export default function TranscendenceTrajectory({ trajectoryData }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!trajectoryData || !svgRef.current) return

    renderTrajectory()
  }, [trajectoryData])

  const renderTrajectory = () => {
    if (!svgRef.current || !trajectoryData) return

    const width = 900
    const height = 250
    const margin = { top: 40, right: 40, bottom: 40, left: 40 }

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const stages = trajectoryData.journey_stages

    // Create x scale for positions
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, innerWidth])

    // Draw path line
    const pathData = stages.map((s, i) => ({
      x: xScale(s.position),
      y: innerHeight / 2 + (Math.sin(i * Math.PI / 5) * 20),
      reached: s.reached,
    }))

    const line = d3.line<any>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveCatmullRom)

    // Background path (full journey)
    g.append('path')
      .datum(pathData)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#374151')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5')

    // Reached path (journey progress)
    const reachedData = pathData.filter(d => d.reached)
    if (reachedData.length > 0) {
      g.append('path')
        .datum(reachedData)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', '#8B5CF6')
        .attr('stroke-width', 4)
        .attr('filter', 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))')
    }

    // Draw stage nodes
    stages.forEach((stage, i) => {
      const x = xScale(stage.position)
      const y = pathData[i].y

      // Node circle
      const node = g.append('g')
        .attr('transform', `translate(${x},${y})`)

      node.append('circle')
        .attr('r', stage.reached ? 12 : 8)
        .attr('fill', stage.reached ? '#8B5CF6' : '#4B5563')
        .attr('stroke', stage.reached ? '#A78BFA' : '#6B7280')
        .attr('stroke-width', 2)
        .attr('filter', stage.reached ? 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.5))' : 'none')

      // Inner glow for reached nodes
      if (stage.reached && stage.intensity > 7) {
        node.append('circle')
          .attr('r', 6)
          .attr('fill', '#C4B5FD')
          .attr('opacity', 0.6)
      }

      // Stage label
      node.append('text')
        .text(stage.stage)
        .attr('y', -25)
        .attr('text-anchor', 'middle')
        .attr('fill', stage.reached ? '#E9D5FF' : '#9CA3AF')
        .attr('font-size', '11px')
        .attr('font-weight', stage.reached ? 600 : 400)

      // Intensity indicator (below node)
      if (stage.reached) {
        node.append('text')
          .text(`${stage.intensity.toFixed(1)}`)
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .attr('fill', '#A78BFA')
          .attr('font-size', '10px')
      }
    })

    // Add title
    svg.append('text')
      .text('Transcendence Journey')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .attr('font-weight', 600)
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white mb-2">Transcendence Trajectory</h3>
        <p className="text-sm text-gray-400">
          Visual mapping of the philosophical journey from Void to Theistic Placeholder
        </p>
      </div>

      <div className="flex items-center justify-center">
        <svg ref={svgRef} className="w-full"></svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Transcendence Score:</span>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 bg-gray-800 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${(trajectoryData.rpe.transcendence_score / 10) * 100}%` }}
              ></div>
            </div>
            <span className="text-white font-medium">{trajectoryData.rpe.transcendence_score}/10</span>
          </div>
        </div>
        <div>
          <span className="text-gray-400">Void Resonance:</span>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 bg-gray-800 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${(trajectoryData.rpe.void_resonance / 10) * 100}%` }}
              ></div>
            </div>
            <span className="text-white font-medium">{trajectoryData.rpe.void_resonance}/10</span>
          </div>
        </div>
      </div>
    </div>
  )
}
