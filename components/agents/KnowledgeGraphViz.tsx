'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Entity, Relationship, EntityType, RelationshipType } from '@/lib/knowledge-graph-db';

interface KnowledgeGraphNode extends Entity {
  connections: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface KnowledgeGraphEdge extends Relationship {
  source: KnowledgeGraphNode;
  target: KnowledgeGraphNode;
  weight?: number;
}

interface GraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

interface KnowledgeGraphVizProps {
  data?: GraphData;
  width?: number;
  height?: number;
  centerEntityId?: string;
  onNodeClick?: (node: KnowledgeGraphNode) => void;
  onEdgeClick?: (edge: KnowledgeGraphEdge) => void;
  interactive?: boolean;
  showLabels?: boolean;
  colorScheme?: 'default' | 'type' | 'confidence';
  layoutType?: 'force' | 'circular' | 'hierarchical';
}

const entityTypeColors: Record<EntityType, string> = {
  [EntityType.PERSON]: '#FF6B6B',
  [EntityType.PROJECT]: '#4ECDC4',
  [EntityType.DOCUMENT]: '#45B7D1',
  [EntityType.CONVERSATION]: '#96CEB4',
  [EntityType.EMAIL]: '#FFEAA7',
  [EntityType.FILE]: '#DDA0DD',
  [EntityType.CONCEPT]: '#98D8C8',
  [EntityType.LOCATION]: '#F7DC6F',
  [EntityType.ORGANIZATION]: '#BB8FCE',
  [EntityType.EVENT]: '#F8C471',
  [EntityType.TASK]: '#85C1E9',
  [EntityType.TOPIC]: '#F1948A',
  [EntityType.TECHNOLOGY]: '#82E0AA',
  [EntityType.MEETING]: '#D2B4DE'
};

const relationshipTypeColors: Record<RelationshipType, string> = {
  [RelationshipType.MENTIONS]: '#cccccc',
  [RelationshipType.WORKS_ON]: '#4CAF50',
  [RelationshipType.COLLABORATES_WITH]: '#2196F3',
  [RelationshipType.CONTAINS]: '#FF9800',
  [RelationshipType.RELATES_TO]: '#9C27B0',
  [RelationshipType.DEPENDS_ON]: '#F44336',
  [RelationshipType.CREATED_BY]: '#795548',
  [RelationshipType.MODIFIED_BY]: '#607D8B',
  [RelationshipType.PART_OF]: '#3F51B5',
  [RelationshipType.SIMILAR_TO]: '#009688',
  [RelationshipType.REFERENCES]: '#FF5722',
  [RelationshipType.FOLLOWS]: '#8BC34A',
  [RelationshipType.PRECEDES]: '#FFC107',
  [RelationshipType.LOCATED_IN]: '#E91E63',
  [RelationshipType.ASSIGNED_TO]: '#00BCD4'
};

export default function KnowledgeGraphViz({
  data,
  width = 800,
  height = 600,
  centerEntityId,
  onNodeClick,
  onEdgeClick,
  interactive = true,
  showLabels = true,
  colorScheme = 'type',
  layoutType = 'force'
}: KnowledgeGraphVizProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTypes, setFilteredTypes] = useState<EntityType[]>([]);
  const [showControls, setShowControls] = useState(true);

  // Initialize and update graph data
  useEffect(() => {
    if (data) {
      setGraphData(data);
    } else {
      loadGraphData();
    }
  }, [data, centerEntityId]);

  const loadGraphData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'graph',
        ...(centerEntityId && { centerEntityId })
      });

      const response = await fetch(`/api/agents/knowledge-graph?${params}`);
      const result = await response.json();

      if (result.success && result.data) {
        const processedData = processGraphData(result.data);
        setGraphData(processedData);
      }
    } catch (error) {
      console.error('Error loading graph data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processGraphData = (rawData: any): GraphData => {
    const nodesMap = new Map<string, KnowledgeGraphNode>();
    const edges: KnowledgeGraphEdge[] = [];

    // Process nodes
    if (rawData.nodes) {
      rawData.nodes.forEach((node: any) => {
        nodesMap.set(node.id, {
          ...node,
          x: Math.random() * width,
          y: Math.random() * height
        });
      });
    }

    // Process edges
    if (rawData.edges) {
      rawData.edges.forEach((edge: any) => {
        const source = nodesMap.get(edge.from_entity_id);
        const target = nodesMap.get(edge.to_entity_id);

        if (source && target) {
          edges.push({
            ...edge,
            source,
            target,
            weight: edge.strength || 0.5
          });
        }
      });
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges
    };
  };

  // Initialize D3 force simulation
  useEffect(() => {
    if (!graphData.nodes.length || !svgRef.current) return;

    // Import D3 dynamically (since it's a client-side library)
    import('d3').then((d3) => {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const container = svg.append('g');

      // Add zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
          container.attr('transform', event.transform);
        });

      svg.call(zoom as any);

      // Create simulation
      const sim = d3.forceSimulation(graphData.nodes)
        .force('link', d3.forceLink(graphData.edges)
          .id((d: any) => d.id)
          .distance(d => 50 + (1 - (d.weight || 0.5)) * 100)
          .strength(d => (d.weight || 0.5) * 0.5)
        )
        .force('charge', d3.forceManyBody()
          .strength(d => -300 - (d.connections || 1) * 50)
        )
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide()
          .radius(d => Math.sqrt((d.connections || 1)) * 8 + 10)
        );

      // Create links
      const links = container.selectAll('.link')
        .data(graphData.edges)
        .enter().append('line')
        .attr('class', 'link')
        .attr('stroke', d => relationshipTypeColors[d.relationship_type] || '#999')
        .attr('stroke-width', d => Math.sqrt((d.weight || 0.5) * 4) + 1)
        .attr('stroke-opacity', 0.6)
        .style('cursor', interactive ? 'pointer' : 'default')
        .on('click', (event, d) => {
          if (interactive && onEdgeClick) {
            onEdgeClick(d);
          }
        });

      // Create nodes
      const nodes = container.selectAll('.node')
        .data(graphData.nodes)
        .enter().append('g')
        .attr('class', 'node')
        .style('cursor', interactive ? 'pointer' : 'default');

      // Add circles for nodes
      nodes.append('circle')
        .attr('r', d => Math.sqrt((d.connections || 1)) * 4 + 8)
        .attr('fill', d => getNodeColor(d))
        .attr('stroke', d => d.id === selectedNode?.id ? '#333' : '#fff')
        .attr('stroke-width', d => d.id === selectedNode?.id ? 3 : 2)
        .attr('opacity', d => getNodeOpacity(d))
        .on('click', (event, d) => {
          setSelectedNode(d);
          if (interactive && onNodeClick) {
            onNodeClick(d);
          }
        })
        .on('mouseover', function(event, d) {
          if (interactive) {
            d3.select(this).attr('stroke', '#333').attr('stroke-width', 3);
            showTooltip(event, d);
          }
        })
        .on('mouseout', function(event, d) {
          if (interactive) {
            d3.select(this)
              .attr('stroke', d.id === selectedNode?.id ? '#333' : '#fff')
              .attr('stroke-width', d.id === selectedNode?.id ? 3 : 2);
            hideTooltip();
          }
        });

      // Add labels
      if (showLabels) {
        nodes.append('text')
          .attr('dy', 4)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('font-family', 'Arial, sans-serif')
          .style('fill', '#333')
          .style('pointer-events', 'none')
          .text(d => truncateText(d.name, 15));
      }

      // Add drag behavior
      if (interactive) {
        const drag = d3.drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          });

        nodes.call(drag as any);
      }

      // Update positions on tick
      sim.on('tick', () => {
        links
          .attr('x1', d => d.source.x!)
          .attr('y1', d => d.source.y!)
          .attr('x2', d => d.target.x!)
          .attr('y2', d => d.target.y!);

        nodes.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      setSimulation(sim);
    });
  }, [graphData, width, height, selectedNode, showLabels, interactive]);

  const getNodeColor = (node: KnowledgeGraphNode): string => {
    switch (colorScheme) {
      case 'confidence':
        const intensity = node.confidence_score;
        return `hsl(120, 70%, ${30 + intensity * 40}%)`;
      case 'type':
        return entityTypeColors[node.type] || '#999';
      default:
        return '#4A90E2';
    }
  };

  const getNodeOpacity = (node: KnowledgeGraphNode): number => {
    if (!searchQuery) return 1;
    return node.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0.3;
  };

  const showTooltip = (event: any, node: KnowledgeGraphNode) => {
    // Implementation for tooltip
    console.log('Show tooltip for:', node.name);
  };

  const hideTooltip = () => {
    // Implementation for hiding tooltip
  };

  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTypeFilter = (types: EntityType[]) => {
    setFilteredTypes(types);
  };

  const centerGraph = () => {
    if (simulation) {
      simulation.alpha(1).restart();
    }
  };

  const resetZoom = () => {
    if (svgRef.current) {
      import('d3').then((d3) => {
        const svg = d3.select(svgRef.current);
        svg.transition().duration(750).call(
          d3.zoom().transform as any,
          d3.zoomIdentity
        );
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading knowledge graph...</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg">
      {/* Controls */}
      {showControls && (
        <div className="p-4 border-b">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="type">Color by Type</option>
              <option value="confidence">Color by Confidence</option>
              <option value="default">Default Color</option>
            </select>

            <button
              onClick={centerGraph}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Center Graph
            </button>

            <button
              onClick={resetZoom}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Reset Zoom
            </button>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="mr-2"
              />
              Show Labels
            </label>
          </div>
        </div>
      )}

      {/* Graph Visualization */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="border"
          style={{ background: '#fafafa' }}
        />

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-xs">
            <h3 className="font-bold text-lg mb-2">{selectedNode.name}</h3>
            <p className="text-sm text-gray-600 mb-2">Type: {selectedNode.type}</p>
            <p className="text-sm text-gray-600 mb-2">
              Connections: {selectedNode.connections}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Confidence: {(selectedNode.confidence_score * 100).toFixed(1)}%
            </p>
            {selectedNode.content && (
              <p className="text-sm text-gray-700">
                {truncateText(selectedNode.content, 100)}
              </p>
            )}
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-2 text-sm text-blue-500 hover:text-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t">
        <h4 className="font-semibold mb-2">Entity Types</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(entityTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-t bg-gray-50 flex justify-between text-sm text-gray-600">
        <span>Entities: {graphData.nodes.length}</span>
        <span>Relationships: {graphData.edges.length}</span>
        <span>
          Avg Connections: {
            graphData.nodes.length > 0
              ? (graphData.edges.length * 2 / graphData.nodes.length).toFixed(1)
              : 0
          }
        </span>
      </div>
    </div>
  );
}