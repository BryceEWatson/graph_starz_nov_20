import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthStatus } from '../types';
import { Loader2, Lock, Sparkles, AlertCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { authStatus, isConfigured, user, logout } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Render Google Button if we are unauthenticated or waitlisted (to switch accounts)
    if ((authStatus === AuthStatus.UNAUTHENTICATED || authStatus === AuthStatus.WAITLISTED) && isConfigured && window.google) {
      try {
        window.google.accounts.id.renderButton(
          googleBtnRef.current!,
          { theme: 'filled_black', size: 'large', shape: 'pill', width: 250, text: 'signin_with' }
        );
      } catch (e) {
        console.error("Failed to render Google Button", e);
      }
    }
  }, [authStatus, isConfigured]);

  if (authStatus === AuthStatus.CHECKING) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
       {/* Background Effects */}
       <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
       <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px]" />
       
       {/* Grid Overlay */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

       <nav className="p-6 z-10 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Graph<span className="text-primary">Starz</span></span>
          </div>
       </nav>

       <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 max-w-4xl mx-auto">
          
          {/* WAITLIST VIEW */}
          {authStatus === AuthStatus.WAITLISTED ? (
             <div className="bg-surface/50 backdrop-blur-xl p-8 md:p-12 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 max-w-lg w-full">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/20">
                    <Lock className="w-8 h-8 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">You're on the list!</h2>
                <p className="text-gray-400 mb-6">
                    Thanks for signing up, <span className="text-white font-medium">{user?.name}</span>. 
                    <br/>Graph Starz is currently in private beta. We've added <span className="text-indigo-300">{user?.email}</span> to our waitlist.
                </p>
                
                <div className="bg-background/50 rounded-lg p-4 border border-white/5 mb-6 text-sm text-gray-500">
                    Use <span className="text-gray-300 font-mono bg-gray-800 px-1 rounded">demo@example.com</span> if you just want to look around, or add your email to <code className="text-pink-400">constants.ts</code>.
                </div>

                <button 
                    onClick={logout}
                    className="text-gray-400 hover:text-white text-sm underline underline-offset-4"
                >
                    Sign in with a different account
                </button>
             </div>
          ) : (
            /* MAIN LANDING VIEW */
            <>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 animate-fade-in">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Access is currently limited to beta users
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 drop-shadow-2xl">
                    The Future of <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                        Semantic Graphing
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                    Upload images, discover hidden connections, and visualize your creative universe in a living, breathing global graph.
                </p>

                <div className="flex flex-col items-center gap-6">
                    
                    {/* Google Button Container */}
                    {isConfigured ? (
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-black rounded-full p-1">
                                <div ref={googleBtnRef} className="h-[44px] flex items-center justify-center overflow-hidden rounded-full"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center max-w-sm">
                            <div className="flex items-center justify-center gap-2 text-red-400 font-bold mb-1">
                                <AlertCircle className="w-5 h-5" />
                                <span>Authentication Config Missing</span>
                            </div>
                            <p className="text-xs text-gray-400">
                                To enable sign-in, please add the <code className="text-white">GOOGLE_CLIENT_ID</code> secret to your environment variables.
                            </p>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                       <span>Whitelist Enabled</span>
                       <div className="w-1 h-1 bg-gray-700 rounded-full" />
                       <span>Secure Access</span>
                    </div>
                </div>
            </>
          )}
       </main>

       <footer className="p-8 text-center text-gray-600 text-sm relative z-10">
          <p>© 2024 Graph Starz Inc. All rights reserved.</p>
       </footer>
    </div>
  );
};

export default LandingPage;