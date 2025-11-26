import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { AuthStatus } from '../types';
import { Loader2, Lock, Sparkles, AlertCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { authStatus, isConfigured, user, login, logout, joinWaitlist } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        setIsLoggingIn(true);
        setError(null);
        await login(codeResponse.code);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      } finally {
        setIsLoggingIn(false);
      }
    },
    onError: (error) => {
      setError('Failed to authenticate with Google');
      setIsLoggingIn(false);
    },
    flow: 'auth-code',
  });

  const handleJoinWaitlist = async () => {
    try {
      setIsJoiningWaitlist(true);
      setError(null);
      await joinWaitlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join waitlist');
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  if (authStatus === AuthStatus.CHECKING || isLoggingIn || isJoiningWaitlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Not whitelisted, not on waitlist - show join waitlist option
  if (authStatus === AuthStatus.UNAUTHENTICATED && user) {
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
            <div className="bg-surface/50 backdrop-blur-xl p-8 md:p-12 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 max-w-lg w-full">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                  <Lock className="w-8 h-8 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Graph Starz is in Private Beta</h2>
              <p className="text-gray-400 mb-6">
                  Hello <span className="text-white font-medium">{user?.name}</span>,
                  <br/>We're currently in a limited private beta. Join our waitlist to get early access when we open up!
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                  onClick={handleJoinWaitlist}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all mb-4"
              >
                  Join Waitlist
              </button>

              <button
                  onClick={logout}
                  className="text-gray-400 hover:text-white text-sm underline underline-offset-4"
              >
                  Sign in with a different account
              </button>
            </div>
         </main>

         <footer className="p-8 text-center text-gray-600 text-sm relative z-10">
            <p>© 2024 Graph Starz Inc. All rights reserved.</p>
         </footer>
      </div>
    );
  }

  // Waitlisted user view
  if (authStatus === AuthStatus.WAITLISTED) {
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
            <div className="bg-surface/50 backdrop-blur-xl p-8 md:p-12 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 max-w-lg w-full">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/20">
                  <Lock className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Thanks for your interest!</h2>
              <p className="text-gray-400 mb-6">
                  Hello <span className="text-white font-medium">{user?.name}</span>,
                  <br/>Graph Starz is currently in private beta. We've added <span className="text-indigo-300">{user?.email}</span> to our waitlist.
              </p>

              <div className="bg-background/50 rounded-lg p-4 border border-white/5 mb-6 text-sm text-gray-400">
                We'll notify you by email when access becomes available. In the meantime, follow us on social media for updates!
              </div>

              <button
                  onClick={logout}
                  className="text-gray-400 hover:text-white text-sm underline underline-offset-4"
              >
                  Sign in with a different account
              </button>
            </div>
         </main>

         <footer className="p-8 text-center text-gray-600 text-sm relative z-10">
            <p>© 2024 Graph Starz Inc. All rights reserved.</p>
         </footer>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Now with backend authentication
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
              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center max-w-sm mb-4">
                  <div className="flex items-center justify-center gap-2 text-red-400 font-bold mb-1">
                    <AlertCircle className="w-5 h-5" />
                    <span>Authentication Error</span>
                  </div>
                  <p className="text-xs text-gray-400">{error}</p>
                </div>
              )}

              {/* Google Login Button */}
              {isConfigured ? (
                  <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                      <button
                        onClick={() => googleLogin()}
                        className="relative bg-white text-gray-900 font-semibold py-3 px-8 rounded-full flex items-center gap-3 hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                      </button>
                  </div>
              ) : (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center max-w-sm">
                      <div className="flex items-center justify-center gap-2 text-red-400 font-bold mb-1">
                          <AlertCircle className="w-5 h-5" />
                          <span>Authentication Config Missing</span>
                      </div>
                      <p className="text-xs text-gray-400">
                          To enable sign-in, please add the <code className="text-white">VITE_GOOGLE_CLIENT_ID</code> environment variable.
                      </p>
                  </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                 <span>Secure OAuth Flow</span>
                 <div className="w-1 h-1 bg-gray-700 rounded-full" />
                 <span>Backend Verified</span>
              </div>
          </div>
       </main>

       <footer className="p-8 text-center text-gray-600 text-sm relative z-10">
          <p>© 2024 Graph Starz Inc. All rights reserved.</p>
       </footer>
    </div>
  );
};

export default LandingPage;