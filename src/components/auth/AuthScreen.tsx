import React, { useState } from 'react';
import {
  MessageSquare,
  Phone,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { User } from '../../types';
import {
  registerWithEmail,
  loginWithCredentials,
  loginWithGoogle,
  checkUsernameAvailable,
  sanitizeUsername,
} from '../../lib/firebase';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [rawUsername, setRawUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  // Live username availability check on blur/type
  const handleUsernameChange = (val: string) => {
    let clean = sanitizeUsername(val);
    if (clean.length > 25) clean = clean.slice(0, 25);
    setRawUsername(clean);
    setError(null);
    setIsUsernameAvailable(null);

    if (isSignUp && clean.length >= 3) {
      setIsCheckingUsername(true);
      checkUsernameAvailable(clean)
        .then((available) => {
          setIsUsernameAvailable(available);
          setIsCheckingUsername(false);
        })
        .catch(() => {
          setIsCheckingUsername(false);
        });
    }
  };

  const formattedUsername = rawUsername ? `@${rawUsername.toLowerCase()}` : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error('Please enter your full display name.');
        }
        if (rawUsername.trim().length < 3) {
          throw new Error('Unique username must be at least 3 characters.');
        }
        if (isUsernameAvailable === false) {
          throw new Error(`@${rawUsername} is already taken. Please choose another handle.`);
        }
        if (!email.trim() || !email.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const newUser = await registerWithEmail(
          email.trim(),
          password,
          displayName.trim(),
          rawUsername.trim()
        );
        onLoginSuccess(newUser);
      } else {
        // Sign in mode: supports both @username or email
        if (!rawUsername.trim()) {
          throw new Error('Please enter your @username or email address.');
        }
        if (!password) {
          throw new Error('Please enter your password.');
        }

        const user = await loginWithCredentials(rawUsername.trim(), password);
        onLoginSuccess(user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setError('Invalid username/email or password. Please try again.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('This email address is already registered. Please sign in instead.');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginWithGoogle(rawUsername);
      onLoginSuccess(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-sky-900/5 border border-slate-200/80 overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 px-8 pt-8 pb-7 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
            <div className="relative">
              <MessageSquare className="w-7 h-7 text-white" />
              <Phone className="w-3.5 h-3.5 text-sky-200 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ArfaChat</h1>
          <p className="text-xs text-sky-100 mt-1 max-w-xs mx-auto">
            Secure Firebase Authentication & Realtime Messaging Platform
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-blue-900/30 rounded-xl backdrop-blur-sm border border-white/15">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isSignUp ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 inline mr-1.5" />
              Sign In
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isSignUp ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Subarfa"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {isSignUp ? 'Unique Username' : 'Username or Email'}
                </label>
                {isSignUp && rawUsername.length >= 3 && (
                  <div>
                    {isCheckingUsername ? (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                      </span>
                    ) : isUsernameAvailable === true ? (
                      <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> @{rawUsername} available
                      </span>
                    ) : isUsernameAvailable === false ? (
                      <span className="text-[11px] font-medium text-rose-600">
                        @{rawUsername} taken
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-blue-600 font-semibold text-sm select-none">
                  @
                </span>
                <input
                  type="text"
                  placeholder={isSignUp ? 'subarfa' : 'subarfa or email'}
                  value={rawUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all text-slate-900 font-mono placeholder:text-slate-400"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isSignUp
                  ? 'Case-insensitive. Your contacts will use this unique handle to connect.'
                  : 'Enter your @handle (e.g. subarfa) or registered email address.'}
              </p>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="subarfaofficial@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all text-slate-900 placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSignUp ? 'Creating Firebase Account...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create ArfaChat Account' : 'Sign In to ArfaChat'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign In option */}
          <div className="mt-4">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>

        {/* Footer info with package name */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>ArfaChat · CallingApp</span>
          <span className="font-mono text-[10px]">com.arfachat.subarfa</span>
        </div>
      </div>
    </div>
  );
};
