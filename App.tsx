import React, { useState, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import GraphCanvas from './components/GraphCanvas';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import UploadModal from './components/UploadModal';
import MuseStarPanel from './components/MuseStarPanel';
import LandingPage from './components/LandingPage';
import { GraphNode, Notification, AuthStatus, NodeType } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GraphProvider, useGraph } from './contexts/GraphContext';

const AppContent: React.FC = () => {
  const { user, authStatus } = useAuth();
  const { graphData } = useGraph();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedMuseStar, setSelectedMuseStar] = useState<GraphNode | null>(null);
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
    if (node?.type === NodeType.MUSE_STAR) {
      // Open Muse Star panel instead of sidebar
      setSelectedMuseStar(node);
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node ? node.id : null);
      setSelectedMuseStar(null);
    }
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

  const handleUploadSuccess = () => {
    addNotification(
        'Image Published',
        'Your image was successfully added to your map.',
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

      {/* Muse Star Panel */}
      {selectedMuseStar && (
        <MuseStarPanel
          museStar={selectedMuseStar}
          onClose={() => setSelectedMuseStar(null)}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};

const App: React.FC = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <GraphProvider>
          <AppContent />
        </GraphProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;