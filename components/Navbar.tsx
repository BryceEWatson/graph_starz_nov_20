import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Bell, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { Notification } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  onUploadClick: () => void;
  notifications: Notification[];
  onClearNotification: (id: string) => void;
  onClearAllNotifications: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onUploadClick, 
  notifications, 
  onClearNotification, 
  onClearAllNotifications 
}) => {
  const { user, logout } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-10 bg-gradient-to-b from-background/90 to-transparent pointer-events-none">
      {/* Logo area */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.2" />
                <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" />
            </svg>
        </div>
        <span className="text-lg font-bold tracking-tight text-white">Graph<span className="text-primary">Starz</span></span>
      </div>

      {/* Center Search (Fake) */}
      <div className="pointer-events-auto hidden md:flex items-center bg-surface/50 backdrop-blur-md border border-gray-700 rounded-full px-4 py-2 w-96 hover:bg-surface/80 transition-colors cursor-pointer group">
        <Search className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
        <input 
            type="text" 
            placeholder="Search semantic graph..." 
            className="bg-transparent border-none outline-none text-sm text-white ml-2 w-full placeholder-gray-500"
            disabled
        />
        <div className="text-[10px] bg-gray-700 px-1.5 rounded text-gray-400 border border-gray-600">⌘K</div>
      </div>

      {/* Right Actions */}
      <div className="pointer-events-auto flex items-center gap-4">
        
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
            <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`transition-colors relative p-2 rounded-full hover:bg-white/10 ${isNotifOpen ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}
            >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-background animate-pulse"></span>
                )}
            </button>

            <NotificationDropdown 
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                notifications={notifications}
                onClear={onClearNotification}
                onClearAll={onClearAllNotifications}
            />
        </div>
        
        {/* Authenticated Actions */}
        <button 
            onClick={onUploadClick}
            className="bg-white text-background px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-white/10"
        >
            <Plus className="w-4 h-4" />
            <span>Upload</span>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
            <div 
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 border-2 border-background cursor-pointer overflow-hidden hover:border-white transition-colors"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
                {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-bold text-xs">
                    {user?.name.charAt(0)}
                    </div>
                )}
            </div>

            {isUserMenuOpen && (
                <div className="absolute top-12 right-0 w-56 bg-surface border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-700">
                        <p className="text-sm font-bold text-white">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <button className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors">
                        <UserIcon className="w-4 h-4" /> Profile
                    </button>
                    <button 
                        onClick={() => { logout(); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;