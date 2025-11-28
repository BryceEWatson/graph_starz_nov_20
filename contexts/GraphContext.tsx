import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GraphData, GraphNode, GraphLink, NodeType, RawAttribute } from '../types';
import { useAuth } from './AuthContext';
import {
  fetchEgoGraph,
  fetchGlobalGraph,
  BackendGraphData,
} from '../services/graphService';
import { fetchMuseStars, MuseStar } from '../services/museStarService';
import { normalizeAttributes, isCanonicalAttributeValue } from '../attributeDimensions';

interface GraphContextType {
  graphData: GraphData;
  isLoading: boolean;
  error: string | null;
  viewMode: 'ego' | 'global';
  setViewMode: (mode: 'ego' | 'global') => void;
  refreshGraph: () => Promise<void>;
  museStars: MuseStar[];
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

const TOKEN_KEY = 'graph_starz_jwt_token';

/**
 * Convert backend graph data to frontend format
 */
function convertBackendGraphToFrontend(
  backendData: BackendGraphData,
  museStars: MuseStar[]
): GraphData {
  const nodes: GraphNode[] = backendData.nodes.map((node) => {
    const isAttribute = node.type === 'attribute';
    const attributeType = isAttribute ? (node.properties.type || 'other') : undefined;
    const attributeValue = isAttribute ? (node.properties.value || node.id) : undefined;

    const baseNode: GraphNode = {
      id: node.id,
      type:
        node.type === 'user'
          ? NodeType.USER
          : node.type === 'image'
          ? NodeType.IMAGE
          : NodeType.ATTRIBUTE,
      label: node.properties.name || node.properties.title || node.properties.value || node.id,
      radius:
        node.type === 'user'
          ? 40
          : node.type === 'image'
          ? 45
          : 15 + Math.random() * 10,
      image: node.properties.profilePictureUrl || node.properties.url,
      description: node.properties.description,
      attributes: [],
      // For attribute nodes: set type and canonical status
      attributeType,
      attributeIsCanonical: isAttribute && attributeType && attributeValue
        ? isCanonicalAttributeValue(attributeType, attributeValue)
        : undefined,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
    };

    return baseNode;
  });

  // Build a lookup map for nodes
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build lookup of attribute node metadata: id -> { type, value }
  const attributeMeta = new Map<string, { type: string; value: string }>();
  backendData.nodes.forEach((node) => {
    if (node.type === 'attribute') {
      const type = node.properties.type || 'other';
      const value = node.properties.value || node.id;
      attributeMeta.set(node.id, { type, value });
    }
  });

  // Collect raw attributes per image from HAS_ATTRIBUTE edges
  const rawByImage = new Map<string, RawAttribute[]>();
  backendData.edges.forEach((edge) => {
    if (edge.type !== 'HAS_ATTRIBUTE') return;

    const imageId = edge.source; // backend ensures source = Image id, target = Attribute id
    const attrId = edge.target;
    const meta = attributeMeta.get(attrId);
    if (!meta) return;

    const list = rawByImage.get(imageId) || [];
    list.push({
      type: meta.type,
      value: meta.value,
      confidence:
        typeof edge.properties?.confidence === 'number'
          ? edge.properties.confidence
          : undefined,
      source: 'ai',
      canonical: edge.properties?.canonical === true,
    });
    rawByImage.set(imageId, list);
  });

  // Attach normalized AttributeChips to image nodes
  rawByImage.forEach((rawAttrs, imageId) => {
    const node = nodeMap.get(imageId);
    if (!node) return;
    node.attributes = normalizeAttributes(rawAttrs);
  });

  // Add Muse Star nodes
  const museStarNodes: GraphNode[] = museStars.map((museStar) => ({
    id: museStar.id,
    type: NodeType.MUSE_STAR,
    label: museStar.targetAttributes.map((a) => a.value).join(' + '),
    radius: 30,
    targetAttributes: museStar.targetAttributes,
    attributeGap: museStar.context.attributeGap,
    imageCount: museStar.context.imageCount,
    nearbyImages: museStar.context.nearbyImages,
    x: museStar.position?.x || Math.random() * 1000,
    y: museStar.position?.y || Math.random() * 1000,
  }));

  const links: GraphLink[] = backendData.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    type: edge.type,
    strength:
      edge.type === 'UPLOADED'
        ? 1
        : edge.type === 'HAS_ATTRIBUTE'
        ? 0.6
        : 0.4,
  }));

  return {
    nodes: [...nodes, ...museStarNodes],
    links,
  };
}

export const GraphProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, authStatus } = useAuth();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [museStars, setMuseStars] = useState<MuseStar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ego' | 'global'>('ego');

  const loadGraph = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token && viewMode === 'ego') {
      setGraphData({ nodes: [], links: [] });
      setMuseStars([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let backendData: BackendGraphData;
      let stars: MuseStar[] = [];

      if (viewMode === 'ego' && token) {
        // Fetch ego graph and Muse Stars in parallel
        const [egoData, museStarData] = await Promise.all([
          fetchEgoGraph(token),
          fetchMuseStars(token).catch(() => ({ museStars: [], message: '' })), // Graceful fallback
        ]);
        backendData = egoData;
        stars = museStarData.museStars;
      } else {
        // Fetch global graph
        backendData = await fetchGlobalGraph(100, 0);
      }

      setMuseStars(stars);
      setGraphData(convertBackendGraphToFrontend(backendData, stars));
    } catch (err: any) {
      setError(err.message || 'Failed to load graph');
      setGraphData({ nodes: [], links: [] });
      setMuseStars([]);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode]);

  const refreshGraph = useCallback(async () => {
    await loadGraph();
  }, [loadGraph]);

  // Load graph when auth status changes or view mode changes
  useEffect(() => {
    if (authStatus === 'AUTHENTICATED') {
      loadGraph();
    }
  }, [authStatus, loadGraph]);

  return (
    <GraphContext.Provider
      value={{
        graphData,
        isLoading,
        error,
        viewMode,
        setViewMode,
        refreshGraph,
        museStars,
      }}
    >
      {children}
    </GraphContext.Provider>
  );
};

export const useGraph = () => {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};
