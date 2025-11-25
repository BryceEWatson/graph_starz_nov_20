import React, { useState, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import GraphCanvas from './components/GraphCanvas';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import UploadModal from './components/UploadModal';
import LandingPage from './components/LandingPage';
import { INITIAL_GRAPH_DATA } from './constants';
import { GraphNode, GraphData, NodeType, AnalysisResult, Notification, AuthStatus } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { user, authStatus } = useAuth();
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_GRAPH_DATA);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
        id: 'init-welcome',
        type: 'info',
        title: 'Welcome to Graph Starz',
        message: 'You have been granted beta access.',
        timestamp: Date.now(),
        read: false
    }
  ]);

  const selectedNode = graphData.nodes.find(n => n.id === selectedNodeId) || null;

  const handleNodeSelect = useCallback((node: GraphNode | null) => {
    setSelectedNodeId(node ? node.id : null);
  }, []);

  const addNotification = (title: string, message: string, type: Notification['type'] = 'info') => {
    const newNotif: Notification = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  // Function to handle new image additions
  const handleUploadComplete = (file: File, result: AnalysisResult) => {
    if (!user) return;

    const newImageId = `img-${Date.now()}`;
    const imageUrl = URL.createObjectURL(file); // Use ObjectURL for local display

    // Ensure User Node exists in graph (if it's the first time this user uploads)
    const userNodeExists = graphData.nodes.some(n => n.id === user.id);
    const nodesToAdd: GraphNode[] = [];

    if (!userNodeExists) {
        nodesToAdd.push({
            id: user.id,
            type: NodeType.USER,
            label: user.name,
            image: user.avatar, // Use Google avatar
            radius: 40,
            attributes: [],
            x: 0, 
            y: 0
        });
    }

    const newImageNode: GraphNode = {
      id: newImageId,
      type: NodeType.IMAGE,
      label: result.title,
      description: result.description,
      radius: 45,
      image: imageUrl,
      attributes: result.attributes,
      x: 0, // D3 will position
      y: 0
    };
    nodesToAdd.push(newImageNode);

    // Identify or Create Attribute Nodes
    const newAttributeNodes: GraphNode[] = [];
    const newLinks = [];

    // Link to Current User
    newLinks.push({
      source: user.id,
      target: newImageId,
      type: 'UPLOADED' as const,
      strength: 1
    });

    result.attributes.forEach(attr => {
      // Check if attribute node exists in current graph OR in the batch we are about to add
      const existingAttrNode = graphData.nodes.find(n => n.type === NodeType.ATTRIBUTE && n.label.toLowerCase() === attr.toLowerCase());
      const newAttrNodeInBatch = newAttributeNodes.find(n => n.label.toLowerCase() === attr.toLowerCase());
      
      let attrId = existingAttrNode?.id || newAttrNodeInBatch?.id;
      
      if (!attrId) {
        attrId = `attr-${attr.toLowerCase()}-${Date.now()}`;
        newAttributeNodes.push({
          id: attrId,
          type: NodeType.ATTRIBUTE,
          label: attr,
          radius: 15 + (Math.random() * 10),
          x: Math.random() * 100, // Random start pos
          y: Math.random() * 100
        });
      }

      // Link Image -> Attribute
      newLinks.push({
        source: newImageId,
        target: attrId,
        type: 'HAS_ATTRIBUTE' as const,
        strength: 0.6
      });
    });

    // Update State
    setGraphData(prev => ({
      nodes: [...prev.nodes, ...nodesToAdd, ...newAttributeNodes],
      links: [...prev.links, ...newLinks]
    }));

    // Select the new image
    setSelectedNodeId(newImageId);

    // Notify user
    addNotification(
        'Image Published',
        `"${result.title}" was successfully added to the graph under your profile.`,
        'success'
    );
  };

  // GATE ACCESS
  if (authStatus !== AuthStatus.AUTHENTICATED) {
    return <LandingPage />;
  }

  return (
    <div className="relative w-screen h-screen bg-background text-white overflow-hidden font-sans selection:bg-primary/30">
      {/* Navbar */}
      <Navbar 
        onUploadClick={handleUploadClick} 
        notifications={notifications}
        onClearNotification={clearNotification}
        onClearAllNotifications={clearAllNotifications}
      />

      {/* Main Visualization */}
      <div className="absolute inset-0 z-0">
        <GraphCanvas 
          data={graphData} 
          onNodeSelect={handleNodeSelect} 
          selectedNodeId={selectedNodeId}
        />
      </div>

      {/* Sidebar Overlay */}
      {selectedNode && (
        <Sidebar node={selectedNode} onClose={() => setSelectedNodeId(null)} />
      )}

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

const App: React.FC = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;