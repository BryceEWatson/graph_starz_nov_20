import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink, NodeType } from '../types';

interface GraphCanvasProps {
  data: GraphData;
  onNodeSelect: (node: GraphNode | null) => void;
  selectedNodeId: string | null;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ data, onNodeSelect, selectedNodeId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for interactions
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Refs for D3 instances to allow separate styling updates
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, GraphLink, SVGGElement, unknown> | null>(null);
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown> | null>(null);
  const labelSelectionRef = useRef<d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null>(null);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 1. D3 Setup & Simulation (Runs only on data/dimension change)
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Define Gradients & Filters
    const defs = svg.append('defs');

    // Glow Filter
    const filter = defs.append("filter")
        .attr("id", "glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
    
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "3")
        .attr("result", "coloredBlur");
    
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Image Patterns
    data.nodes.forEach(node => {
      if ((node.type === NodeType.IMAGE || node.type === NodeType.USER) && node.image) {
        defs.append('pattern')
          .attr('id', `img-${node.id}`)
          .attr('patternContentUnits', 'objectBoundingBox')
          .attr('width', '1')
          .attr('height', '1')
          .append('image')
          .attr('href', node.image)
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', '1')
          .attr('height', '1')
          .attr('preserveAspectRatio', 'xMidYMid slice');
      }
    });

    // Layers
    const container = svg.append('g').attr('class', 'zoom-container');
    const linkLayer = container.append('g').attr('class', 'links');
    const nodeLayer = container.append('g').attr('class', 'nodes');
    const labelLayer = container.append('g').attr('class', 'labels');

    // Zoom Behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4]) 
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);
    
    // Initial Zoom & Pan
    const initialScale = 0.6;
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(dimensions.width/2, dimensions.height/2)
      .scale(initialScale));

    // Force Simulation
    const simulation = d3.forceSimulation<GraphNode, GraphLink>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(d => d.type === 'UPLOADED' ? 80 : 180)
        .strength(d => d.type === 'UPLOADED' ? 0.8 : 0.25)
      )
      .force('charge', d3.forceManyBody()
        .strength(d => (d as GraphNode).type === NodeType.ATTRIBUTE ? -200 : -600)
      )
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide().radius(d => (d as GraphNode).radius + 20).iterations(2));

    simulationRef.current = simulation;

    // Create Elements & Store in Refs
    const link = linkLayer.selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke-linecap', 'round');
    
    linkSelectionRef.current = link;

    const node = nodeLayer.selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );
    
    nodeSelectionRef.current = node;

    // Node Visuals
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        if (d.image) return `url(#img-${d.id})`;
        if (d.type === NodeType.ATTRIBUTE) return '#22d3ee'; 
        return '#6366f1';
      })
      .style('cursor', 'pointer');

    // Interaction Handlers
    node
        .on('click', (event, d) => {
            event.stopPropagation();
            onNodeSelect(d);
        })
        .on('mouseenter', (event, d) => {
            setHoveredNodeId(d.id);
        })
        .on('mouseleave', () => {
            setHoveredNodeId(null);
        });

    // Labels - Fix visibility by setting initial fill
    const label = labelLayer.selectAll('text')
      .data(data.nodes)
      .enter().append('text')
      .attr('dy', d => d.type === NodeType.ATTRIBUTE ? d.radius + 12 : d.radius + 20)
      .attr('text-anchor', 'middle')
      .text(d => d.label)
      .style('pointer-events', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', '#020617') 
      .style('stroke-width', '3px')
      .style('stroke-linecap', 'butt')
      .style('stroke-linejoin', 'round')
      .attr('fill', d => d.type === NodeType.ATTRIBUTE ? '#99f6e4' : '#e2e8f0'); // Initial color
    
    labelSelectionRef.current = label;

    // Simulation Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
      
      label
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };

  }, [data, dimensions]);

  // 2. Styling Effect (Runs whenever hover/select state changes)
  useEffect(() => {
    if (!nodeSelectionRef.current || !linkSelectionRef.current || !labelSelectionRef.current) return;

    const focusNodeId = hoveredNodeId || selectedNodeId;
    const isDimmedMode = !!focusNodeId;

    let connectedNodeIds = new Set<string>();
    let connectedLinkIndices = new Set<number>();

    if (focusNodeId) {
        // Perform 2-Level BFS for expanded context
        const result = getConnectedGraph(focusNodeId, data.links);
        connectedNodeIds = result.nodes;
        connectedLinkIndices = result.linkIndices;
    }

    // Update Links
    linkSelectionRef.current
        .attr('stroke', d => {
             const index = (d as any).index;
             if (connectedLinkIndices.has(index)) return '#ffffff';
             if (d.type === 'HAS_ATTRIBUTE') return '#22d3ee';
             return '#6366f1';
        })
        .attr('stroke-opacity', d => {
            const index = (d as any).index;
            if (connectedLinkIndices.has(index)) return 1;
            if (isDimmedMode) return 0.05; 
            return d.type === 'HAS_ATTRIBUTE' ? 0.2 : 0.4;
        })
        .attr('stroke-width', d => {
             const index = (d as any).index;
             if (connectedLinkIndices.has(index)) return 2;
             return d.type === 'HAS_ATTRIBUTE' ? 0.5 : 1.5;
        });

    // Update Nodes
    nodeSelectionRef.current.select('circle')
        .attr('stroke', d => {
             if (d.id === focusNodeId) return '#ffffff'; 
             if (connectedNodeIds.has(d.id)) return 'rgba(255,255,255,0.6)'; 
             
             if (d.type === NodeType.USER) return '#ec4899';
             if (d.type === NodeType.IMAGE) return '#6366f1';
             return 'none';
        })
        .attr('stroke-width', d => {
            if (d.id === focusNodeId) return 4;
            if (connectedNodeIds.has(d.id)) return 2;
            return d.type === NodeType.ATTRIBUTE ? 0 : 3;
        })
        .attr('opacity', d => {
            if (!isDimmedMode) return 1;
            return connectedNodeIds.has(d.id) ? 1 : 0.1;
        })
        .attr('filter', d => {
            if (d.id === focusNodeId) return 'url(#glow)';
            if (connectedNodeIds.has(d.id)) return 'url(#glow)';
            if (d.type === NodeType.ATTRIBUTE && !isDimmedMode) return 'url(#glow)';
            return null;
        });
    
    // Pulse Animation
    nodeSelectionRef.current.selectAll('.node-pulse').remove();
    if (selectedNodeId) {
        const selectedNode = nodeSelectionRef.current.filter(d => d.id === selectedNodeId);
        selectedNode.append('circle')
            .attr('r', d => d.radius * 1.4)
            .attr('fill', 'none')
            .attr('stroke', '#fde047')
            .attr('stroke-width', 2)
            .attr('opacity', 0.5)
            .attr('class', 'node-pulse');
    }

    // Update Labels
    labelSelectionRef.current
        .attr('opacity', d => {
             if (!isDimmedMode) return d.type === NodeType.ATTRIBUTE ? 0.7 : 1;
             return connectedNodeIds.has(d.id) ? 1 : 0.1;
        })
        .attr('fill', d => {
             if (connectedNodeIds.has(d.id)) return '#fff';
             return d.type === NodeType.ATTRIBUTE ? '#99f6e4' : '#e2e8f0';
        })
        .attr('font-weight', d => {
            if (d.id === focusNodeId) return 'bold';
            return d.type === NodeType.USER ? 'bold' : 'normal';
        });

  }, [hoveredNodeId, selectedNodeId, data]); 

  const handleBgClick = () => {
    onNodeSelect(null);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-radial-gradient">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black pointer-events-none" />
      
      <svg 
        ref={svgRef} 
        width="100%" 
        height="100%" 
        className="absolute inset-0 cursor-move active:cursor-grabbing z-0"
        onClick={handleBgClick}
      />
      
      <div className="absolute bottom-4 left-4 pointer-events-none z-10">
        <div className="bg-surface/40 backdrop-blur-md p-3 rounded-lg text-xs text-gray-400 border border-white/10 shadow-lg">
          <p className="font-mono text-primary">Nodes: {data.nodes.length} | Links: {data.links.length}</p>
          <p className="mt-1 opacity-70">Scroll to Zoom • Drag to Pan • Click Node</p>
        </div>
      </div>
    </div>
  );
};

// BFS Helper for 2-level depth
const getConnectedGraph = (startNodeId: string, links: GraphLink[]) => {
    const nodes = new Set<string>();
    const linkIndices = new Set<number>();

    const getId = (n: string | GraphNode) => (typeof n === 'object' ? n.id : n);

    // Adjacency list: ID -> Array of Links
    const adj = new Map<string, GraphLink[]>();
    links.forEach(l => {
        const s = getId(l.source);
        const t = getId(l.target);
        if(!adj.has(s)) adj.set(s, []);
        if(!adj.has(t)) adj.set(t, []);
        adj.get(s)!.push(l);
        adj.get(t)!.push(l);
    });

    const queue: {id: string, depth: number}[] = [{id: startNodeId, depth: 0}];
    nodes.add(startNodeId);

    while(queue.length > 0) {
        const {id, depth} = queue.shift()!;
        if(depth >= 2) continue; // Stop expanding at depth 2

        const neighbors = adj.get(id) || [];
        neighbors.forEach(l => {
            // Always include links traversed from current node
            linkIndices.add((l as any).index);

            const s = getId(l.source);
            const t = getId(l.target);
            const otherId = s === id ? t : s;

            // Get the actual node object to check type
            // Note: l.source/l.target are GraphNodes because this runs after simulation
            const otherNode = (l.source as GraphNode).id === otherId ? l.source : l.target;

            if (!nodes.has(otherId)) {
                nodes.add(otherId);
                
                // CONSTRAINT: If the neighbor is a USER node, stop traversal here.
                // We want to see the User, but NOT go through the User to see all their other images.
                // Unless the User is the Start Node, in which case we do want to expand.
                if ((otherNode as GraphNode).type !== NodeType.USER) {
                    queue.push({id: otherId, depth: depth + 1});
                }
            }
        });
    }
    
    return { nodes, linkIndices };
};

export default GraphCanvas;