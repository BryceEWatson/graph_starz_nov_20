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
  const [dimensionsLoaded, setDimensionsLoaded] = useState(false);

  // Refs for D3 instances to allow separate styling updates
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<SVGPathElement, GraphLink, SVGGElement, unknown> | null>(null);
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown> | null>(null);
  const labelSelectionRef = useRef<d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null>(null);
  const labelGroupRef = useRef<d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown> | null>(null);

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

  // Pre-load image dimensions
  useEffect(() => {
    let cancelled = false;
    setDimensionsLoaded(false);

    const loadImageDimensions = async () => {
      const promises = data.nodes.map((node) => {
        return new Promise<void>((resolve) => {
          if ((node.type === NodeType.IMAGE || node.type === NodeType.USER) && node.image) {
            const img = new Image();
            img.onload = () => {
              if (cancelled) {
                resolve();
                return;
              }
              // Calculate dimensions - max size based on radius but maintaining aspect ratio
              const maxSize = node.radius * 2;
              const aspectRatio = img.width / img.height;

              if (aspectRatio > 1) {
                // Landscape
                node.width = maxSize;
                node.height = maxSize / aspectRatio;
              } else {
                // Portrait or square
                node.height = maxSize;
                node.width = maxSize * aspectRatio;
              }
              resolve();
            };
            img.onerror = () => {
              if (cancelled) {
                resolve();
                return;
              }
              // Fallback to square
              node.width = node.radius * 2;
              node.height = node.radius * 2;
              resolve();
            };
            img.src = node.image;
          } else {
            resolve();
          }
        });
      });

      await Promise.all(promises);
      if (!cancelled) {
        setDimensionsLoaded(true);
      }
    };

    loadImageDimensions();

    return () => {
      cancelled = true;
    };
  }, [data]);

  // 1. D3 Setup & Simulation (Runs only on data/dimension change and after image dimensions loaded)
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || !dimensionsLoaded) return;

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

    // Drop Shadow Filter for Images
    const dropShadow = defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

    dropShadow.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", "4");

    dropShadow.append("feOffset")
        .attr("dx", "0")
        .attr("dy", "2")
        .attr("result", "offsetblur");

    dropShadow.append("feComponentTransfer")
        .append("feFuncA")
        .attr("type", "linear")
        .attr("slope", "0.3");

    const feMerge2 = dropShadow.append("feMerge");
    feMerge2.append("feMergeNode");
    feMerge2.append("feMergeNode").attr("in", "SourceGraphic");

    // Clip paths for images instead of patterns
    data.nodes.forEach(node => {
      if ((node.type === NodeType.IMAGE || node.type === NodeType.USER) && node.image) {
        const width = node.width || node.radius * 2;
        const height = node.height || node.radius * 2;

        defs.append('clipPath')
          .attr('id', `clip-${node.id}`)
          .append('rect')
          .attr('x', -width / 2)
          .attr('y', -height / 2)
          .attr('width', width)
          .attr('height', height)
          .attr('rx', 8)
          .attr('ry', 8);
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

    // Force Simulation - Increased spacing with dynamic collision based on image size
    const simulation = d3.forceSimulation<GraphNode, GraphLink>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(d => d.type === 'UPLOADED' ? 120 : 220)
        .strength(d => d.type === 'UPLOADED' ? 0.6 : 0.2)
      )
      .force('charge', d3.forceManyBody()
        .strength(d => (d as GraphNode).type === NodeType.ATTRIBUTE ? -400 : -1000)
      )
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide().radius(d => {
        const node = d as GraphNode;
        if (node.type === NodeType.IMAGE || node.type === NodeType.USER) {
          // Use the larger dimension for collision
          const maxDim = Math.max(node.width || node.radius * 2, node.height || node.radius * 2);
          return maxDim / 2 + 30;
        }
        return node.radius + 40;
      }).iterations(3));

    simulationRef.current = simulation;

    // Create Elements & Store in Refs - Use paths for curved links
    const link = linkLayer.selectAll('path')
      .data(data.links)
      .enter().append('path')
      .attr('stroke-linecap', 'round')
      .attr('fill', 'none');

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

    // Node Visuals - Use actual images with clip paths for image nodes, circles for attributes
    node.each(function(d) {
      const nodeGroup = d3.select(this);

      if (d.type === NodeType.IMAGE || d.type === NodeType.USER) {
        // Use actual image dimensions
        const width = d.width || d.radius * 2;
        const height = d.height || d.radius * 2;

        // Background rectangle for shadow
        nodeGroup.append('rect')
          .attr('x', -width / 2)
          .attr('y', -height / 2)
          .attr('width', width)
          .attr('height', height)
          .attr('rx', 8)
          .attr('ry', 8)
          .attr('fill', '#1e293b')
          .attr('filter', 'url(#drop-shadow)')
          .style('cursor', 'pointer');

        // Actual image element with clip path
        if (d.image) {
          nodeGroup.append('image')
            .attr('href', d.image)
            .attr('x', -width / 2)
            .attr('y', -height / 2)
            .attr('width', width)
            .attr('height', height)
            .attr('clip-path', `url(#clip-${d.id})`)
            .attr('preserveAspectRatio', 'xMidYMid slice')
            .style('cursor', 'pointer');
        }

        // Photo-card border effect
        nodeGroup.append('rect')
          .attr('x', -width / 2)
          .attr('y', -height / 2)
          .attr('width', width)
          .attr('height', height)
          .attr('rx', 8)
          .attr('ry', 8)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255, 255, 255, 0.4)')
          .attr('stroke-width', 3)
          .style('pointer-events', 'none')
          .attr('class', 'photo-border');
      } else {
        // Circle for attribute nodes
        nodeGroup.append('circle')
          .attr('r', d.radius)
          .attr('fill', '#22d3ee')
          .style('cursor', 'pointer');
      }
    });

    // Interaction Handlers
    node
        .on('click', (event, d) => {
            event.stopPropagation();
            onNodeSelect(d);
        })
        .on('mouseenter', (event, d) => {
            setHoveredNodeId(d.id);
            const nodeGroup = d3.select(event.currentTarget);

            if (d.type === NodeType.IMAGE || d.type === NodeType.USER) {
                // Scale up image nodes - use actual dimensions
                const scaleFactor = 1.1;
                const width = (d.width || d.radius * 2) * scaleFactor;
                const height = (d.height || d.radius * 2) * scaleFactor;

                nodeGroup.selectAll('rect, image')
                    .transition()
                    .duration(200)
                    .attr('x', -width / 2)
                    .attr('y', -height / 2)
                    .attr('width', width)
                    .attr('height', height);
            } else {
                // Scale up circle nodes
                nodeGroup.select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d.radius * 1.15);
            }
        })
        .on('mouseleave', (event, d) => {
            setHoveredNodeId(null);
            const nodeGroup = d3.select(event.currentTarget);

            if (d.type === NodeType.IMAGE || d.type === NodeType.USER) {
                // Scale back image nodes - use actual dimensions
                const width = d.width || d.radius * 2;
                const height = d.height || d.radius * 2;

                nodeGroup.selectAll('rect, image')
                    .transition()
                    .duration(200)
                    .attr('x', -width / 2)
                    .attr('y', -height / 2)
                    .attr('width', width)
                    .attr('height', height);
            } else {
                // Scale back circle nodes
                nodeGroup.select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d.radius);
            }
        });

    // Labels - Add background rectangles for better readability
    const labelGroup = labelLayer.selectAll('g.label-group')
      .data(data.nodes)
      .enter().append('g')
      .attr('class', 'label-group')
      .style('pointer-events', 'none');

    // Add semi-transparent background for labels
    labelGroup.append('rect')
      .attr('class', 'label-bg')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(2, 6, 23, 0.85)')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1);

    // Add text labels with improved styling
    const label = labelGroup.append('text')
      .attr('dy', d => {
        if (d.type === NodeType.ATTRIBUTE) return d.radius + 18;
        // For image nodes, use half of height plus offset
        const height = d.height || d.radius * 2;
        return height / 2 + 24;
      })
      .attr('text-anchor', 'middle')
      .text(d => d.label)
      .style('font-size', d => d.type === NodeType.ATTRIBUTE ? '11px' : '13px')
      .style('font-weight', d => d.type === NodeType.USER ? '600' : '500')
      .attr('fill', d => d.type === NodeType.ATTRIBUTE ? '#99f6e4' : '#f1f5f9');

    // Position and size the background rectangles
    labelGroup.each(function(d) {
      const group = d3.select(this);
      const text = group.select('text').node() as SVGTextElement;
      const bbox = text.getBBox();

      group.select('rect.label-bg')
        .attr('x', bbox.x - 4)
        .attr('y', bbox.y - 2)
        .attr('width', bbox.width + 8)
        .attr('height', bbox.height + 4);
    });

    labelSelectionRef.current = label;
    labelGroupRef.current = labelGroup;

    // Simulation Tick
    simulation.on('tick', () => {
      // Update curved links
      link.attr('d', d => {
        const source = d.source as GraphNode;
        const target = d.target as GraphNode;
        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const dr = Math.sqrt(dx * dx + dy * dy);

        // Create gentle curve - stronger for longer distances
        const curvature = 0.15;
        const controlPointOffset = dr * curvature;

        // Calculate perpendicular offset for control point
        const angle = Math.atan2(dy, dx);
        const perpAngle = angle + Math.PI / 2;
        const cx = (source.x! + target.x!) / 2 + Math.cos(perpAngle) * controlPointOffset;
        const cy = (source.y! + target.y!) / 2 + Math.sin(perpAngle) * controlPointOffset;

        // Quadratic bezier curve
        return `M ${source.x!},${source.y!} Q ${cx},${cy} ${target.x!},${target.y!}`;
      });

      node.attr('transform', d => `translate(${d.x},${d.y})`);

      // Update label groups position
      labelGroup.attr('transform', d => `translate(${d.x!},${d.y!})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };

  }, [data, dimensions, dimensionsLoaded]);

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

    // Update Links with smooth transitions
    linkSelectionRef.current
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
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
             if (connectedLinkIndices.has(index)) return 2.5;
             return d.type === 'HAS_ATTRIBUTE' ? 0.5 : 1.5;
        });

    // Update Nodes with smooth transitions - handle both image and circle
    nodeSelectionRef.current.each(function(d: any) {
        const nodeGroup = d3.select(this);
        const isImageNode = d.type === NodeType.IMAGE || d.type === NodeType.USER;

        if (isImageNode) {
            // Update background rect and border rect
            nodeGroup.selectAll('rect')
                .transition()
                .duration(300)
                .ease(d3.easeCubicOut)
                .attr('opacity', () => {
                    if (!isDimmedMode) return 1;
                    return connectedNodeIds.has(d.id) ? 1 : 0.1;
                });

            // Update the photo border with highlight stroke
            nodeGroup.select('.photo-border')
                .transition()
                .duration(300)
                .ease(d3.easeCubicOut)
                .attr('stroke', () => {
                    if (d.id === focusNodeId) return '#ffffff';
                    if (connectedNodeIds.has(d.id)) return 'rgba(255,255,255,0.8)';
                    return 'rgba(255, 255, 255, 0.4)';
                })
                .attr('stroke-width', () => {
                    if (d.id === focusNodeId) return 4;
                    if (connectedNodeIds.has(d.id)) return 3;
                    return 3;
                });

            // Update image opacity and filter
            nodeGroup.select('image')
                .transition()
                .duration(300)
                .ease(d3.easeCubicOut)
                .attr('opacity', () => {
                    if (!isDimmedMode) return 1;
                    return connectedNodeIds.has(d.id) ? 1 : 0.1;
                })
                .style('filter', () => {
                    if (d.id === focusNodeId) return 'brightness(1.1)';
                    if (connectedNodeIds.has(d.id)) return 'brightness(1.05)';
                    return 'brightness(1)';
                });
        } else {
            // Update circle nodes
            nodeGroup.select('circle')
                .transition()
                .duration(300)
                .ease(d3.easeCubicOut)
                .attr('stroke', () => {
                    if (d.id === focusNodeId) return '#ffffff';
                    if (connectedNodeIds.has(d.id)) return 'rgba(255,255,255,0.6)';
                    return 'none';
                })
                .attr('stroke-width', () => {
                    if (d.id === focusNodeId) return 4;
                    if (connectedNodeIds.has(d.id)) return 3;
                    return 0;
                })
                .attr('opacity', () => {
                    if (!isDimmedMode) return 1;
                    return connectedNodeIds.has(d.id) ? 1 : 0.1;
                })
                .attr('filter', () => {
                    if (d.id === focusNodeId) return 'url(#glow)';
                    if (connectedNodeIds.has(d.id)) return 'url(#glow)';
                    if (d.type === NodeType.ATTRIBUTE && !isDimmedMode) return 'url(#glow)';
                    return null;
                });
        }
    });
    
    // Pulse Animation - matches node shape
    nodeSelectionRef.current.selectAll('.node-pulse').remove();
    if (selectedNodeId) {
        const selectedNode = nodeSelectionRef.current.filter(d => d.id === selectedNodeId);
        selectedNode.each(function(d: any) {
            const nodeGroup = d3.select(this);
            const isImageNode = d.type === NodeType.IMAGE || d.type === NodeType.USER;

            if (isImageNode) {
                // Rectangle pulse for image nodes - use actual dimensions
                const width = (d.width || d.radius * 2) * 1.2;
                const height = (d.height || d.radius * 2) * 1.2;

                nodeGroup.append('rect')
                    .attr('x', -width / 2)
                    .attr('y', -height / 2)
                    .attr('width', width)
                    .attr('height', height)
                    .attr('rx', 10)
                    .attr('ry', 10)
                    .attr('fill', 'none')
                    .attr('stroke', '#fde047')
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.5)
                    .attr('class', 'node-pulse');
            } else {
                // Circle pulse for attribute nodes
                nodeGroup.append('circle')
                    .attr('r', d.radius * 1.4)
                    .attr('fill', 'none')
                    .attr('stroke', '#fde047')
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.5)
                    .attr('class', 'node-pulse');
            }
        });
    }

    // Flow Particles on Active Links
    if (!linkSelectionRef.current) return;

    // Remove existing particles
    linkSelectionRef.current.selectAll('.flow-particle').remove();

    // Add particles to connected links
    if (focusNodeId && connectedLinkIndices.size > 0) {
        linkSelectionRef.current.each(function(d: any, i: number) {
            if (connectedLinkIndices.has(i)) {
                const link = d3.select(this);
                const pathElement = link.node() as SVGPathElement;

                // Add 2-3 particles per active link
                for (let j = 0; j < 2; j++) {
                    link.append('circle')
                        .attr('class', 'flow-particle')
                        .attr('r', 2)
                        .attr('fill', '#ffffff')
                        .attr('opacity', 0.8)
                        .each(function() {
                            const particle = d3.select(this);
                            const animateParticle = () => {
                                const pathLength = pathElement.getTotalLength();
                                const startOffset = (j / 2) * pathLength;

                                particle
                                    .transition()
                                    .duration(2000)
                                    .ease(d3.easeLinear)
                                    .attrTween('transform', () => {
                                        return (t: number) => {
                                            const offset = (startOffset + t * pathLength) % pathLength;
                                            const point = pathElement.getPointAtLength(offset);
                                            return `translate(${point.x}, ${point.y})`;
                                        };
                                    })
                                    .on('end', animateParticle);
                            };
                            animateParticle();
                        });
                }
            }
        });
    }

    // Update Labels with smooth transitions
    if (labelGroupRef.current) {
        labelGroupRef.current
            .transition()
            .duration(300)
            .ease(d3.easeCubicOut)
            .attr('opacity', d => {
                if (!isDimmedMode) return 1;
                return connectedNodeIds.has(d.id) ? 1 : 0.15;
            });

        labelSelectionRef.current
            .transition()
            .duration(300)
            .ease(d3.easeCubicOut)
            .attr('fill', d => {
                if (connectedNodeIds.has(d.id)) return '#fff';
                return d.type === NodeType.ATTRIBUTE ? '#99f6e4' : '#f1f5f9';
            })
            .style('font-weight', d => {
                if (d.id === focusNodeId) return '700';
                return d.type === NodeType.USER ? '600' : '500';
            });
    }

  }, [hoveredNodeId, selectedNodeId, data]); 

  const handleBgClick = () => {
    onNodeSelect(null);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-radial-gradient">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black pointer-events-none" />

      {/* Floating Particles for Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              background: i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#22d3ee' : '#ec4899',
              animation: `float ${15 + Math.random() * 25}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 10}s`,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

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