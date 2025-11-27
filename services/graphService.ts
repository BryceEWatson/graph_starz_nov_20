const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface BackendGraphNode {
  id: string;
  type: 'user' | 'image' | 'attribute';
  properties: Record<string, any>;
}

export interface BackendGraphEdge {
  id: string;
  type: 'UPLOADED' | 'HAS_ATTRIBUTE' | 'SIMILAR_TO';
  source: string;
  target: string;
  properties: Record<string, any>;
}

export interface BackendGraphData {
  nodes: BackendGraphNode[];
  edges: BackendGraphEdge[];
}

/**
 * Fetch user's ego network
 */
export async function fetchEgoGraph(token: string): Promise<BackendGraphData> {
  const response = await fetch(`${API_BASE_URL}/graph/ego`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch ego graph');
  }

  return response.json();
}

/**
 * Fetch global graph sample
 */
export async function fetchGlobalGraph(
  limit: number = 100,
  skip: number = 0
): Promise<BackendGraphData> {
  const response = await fetch(
    `${API_BASE_URL}/graph/global?limit=${limit}&skip=${skip}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch global graph');
  }

  return response.json();
}
