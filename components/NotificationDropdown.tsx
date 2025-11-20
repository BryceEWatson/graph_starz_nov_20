import React from 'react';
import { Notification } from '../types';
import { X, Bell, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface NotificationDropdownProps {
  notifications: Notification[];
  onClear: (id: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ 
  notifications, 
  onClear, 
  onClearAll,
  isOpen,
  onClose 
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-0 w-80 bg-surface border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Bell className="w-3 h-3 text-primary" />
          Notifications
        </h3>
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <button 
              onClick={onClearAll}
              className="text-[10px] text-gray-400 hover:text-white hover:underline uppercase tracking-wide"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto custom-scrollbar flex-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
            <Bell className="w-8 h-8 opacity-20" />
            <p className="text-xs">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {notifications.map(notif => (
              <div key={notif.id} className="p-3 hover:bg-gray-800/50 transition-colors relative group flex gap-3">
                {/* Icon based on type */}
                <div className="mt-0.5 flex-shrink-0">
                  {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {notif.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                  {notif.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-200 leading-none mb-1">{notif.title}</h4>
                  <p className="text-xs text-gray-400 leading-snug">{notif.message}</p>
                  <span className="text-[10px] text-gray-600 mt-1 block">
                    {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); onClear(notif.id); }}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
