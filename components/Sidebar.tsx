import React from 'react';
import { GraphNode, NodeType } from '../types';
import { X, Tag, Calendar, User, Image as ImageIcon } from 'lucide-react';

interface SidebarProps {
  node: GraphNode | null;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="absolute top-4 right-4 w-80 bg-surface/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden animate-in slide-in-from-right duration-300 z-20">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-start relative">
         <div className="flex items-center gap-2">
            {node.type === NodeType.USER && <User className="w-5 h-5 text-pink-500" />}
            {node.type === NodeType.IMAGE && <ImageIcon className="w-5 h-5 text-indigo-500" />}
            {node.type === NodeType.ATTRIBUTE && <Tag className="w-5 h-5 text-cyan-500" />}
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{node.type}</span>
         </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Header */}
      {node.image && (
        <div className="w-full aspect-video bg-black relative group overflow-hidden">
          <img 
            src={node.image} 
            alt={node.label} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-xl font-bold text-white drop-shadow-lg leading-tight">{node.label}</h2>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {!node.image && (
            <h2 className="text-2xl font-bold text-white mb-2">{node.label}</h2>
        )}

        {node.description && (
          <div className="text-sm text-gray-300 leading-relaxed">
            {node.description}
          </div>
        )}

        {/* Metadata Attributes */}
        {node.attributes && node.attributes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Tag className="w-3 h-3" /> Associated Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {node.attributes.map((attr, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-blue-300 hover:border-blue-500/50 hover:text-blue-200 transition-colors cursor-default"
                >
                  #{attr}
                </span>
              ))}
            </div>
          </div>
        )}

        {node.type === NodeType.USER && (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <p className="text-sm text-indigo-200">
              User since 2024. Whitelisted for Beta access.
            </p>
          </div>
        )}

         <div className="text-xs text-gray-600 flex items-center gap-2 pt-4 border-t border-gray-800">
            <Calendar className="w-3 h-3" />
            <span>Created: {new Date().toLocaleDateString()}</span>
            <span className="ml-auto font-mono text-gray-700">ID: {node.id}</span>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;