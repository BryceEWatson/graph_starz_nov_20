import * as d3 from 'd3';

// Add global types for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export enum NodeType {
  USER = 'USER',
  IMAGE = 'IMAGE',
  ATTRIBUTE = 'ATTRIBUTE',
  MUSE_STAR = 'MUSE_STAR',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export enum AuthStatus {
    CHECKING = 'CHECKING',
    UNAUTHENTICATED = 'UNAUTHENTICATED',
    AUTHENTICATED = 'AUTHENTICATED',
    WAITLISTED = 'WAITLISTED'
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: NodeType;
  label: string;
  image?: string; // For User and Image nodes
  radius: number;
  // Image dimensions (for rectangles)
  width?: number;
  height?: number;
  // Extended properties
  description?: string;
  timestamp?: number;
  attributes?: string[];
  // Muse Star specific
  targetAttributes?: Array<{ type: string; value: string }>;
  attributeGap?: string;
  imageCount?: number;
  nearbyImages?: string[];
  // D3 specific
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'UPLOADED' | 'HAS_ATTRIBUTE' | 'CONNECTED_TO' | 'SIMILAR_TO';
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface UploadStatus {
  stage: 'IDLE' | 'VALIDATING' | 'OPTIMIZING' | 'ANALYZING' | 'SAVING' | 'COMPLETE' | 'ERROR';
  progress: number;
  message: string;
}

export interface AnalysisResult {
  title: string;
  description: string;
  attributes: string[]; // e.g., "Sunset", "Blue", "Nature"
  visualStyle: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}