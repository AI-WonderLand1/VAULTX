import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Github, Mail, Key } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'password' | 'magic_link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (loginMethod === 'magic_link') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setSuccessMessage('Magic link sent! Check your work email inbox.');
      } else {
        if (isLogin) {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password
          });
          if (error) throw error;
          if (data.user && !data.session) {
            setSuccessMessage('Identity registered! Please check your email to confirm your account before logging in.');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'GitHub authentication failed');
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] flex flex-col items-center justify-center font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm bg-[#0F1115] border border-[#1F2937] rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-bold text-lg text-white tracking-tight uppercase">VaultX</h1>
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">
            Secure Engine Login
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] p-3 rounded mb-4 font-mono">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] p-3 rounded mb-4 font-mono">
            {successMessage}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={handleGithubLogin}
            className="w-full bg-[#1A1D24] hover:bg-[#252A34] border border-[#374151] text-white py-2.5 rounded text-[11px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1F2937]"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-[#0F1115] px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="flex bg-[#1A1D24] rounded border border-[#1F2937] p-1 mb-6">
          <button
            type="button"
            onClick={() => setLoginMethod('password')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors flex items-center justify-center gap-1 ${
              loginMethod === 'password' ? 'bg-[#374151] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Key className="w-3 h-3" /> Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('magic_link')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors flex items-center justify-center gap-1 ${
              loginMethod === 'magic_link' ? 'bg-[#374151] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Mail className="w-3 h-3" /> Work Email
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all font-mono"
              placeholder="operator@vaultx.local"
            />
          </div>

          {loginMethod === 'password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Password</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={handleResetPassword}
                    className="text-[9px] text-blue-500 hover:text-blue-400 transition-colors uppercase font-bold"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-[#374151] rounded px-3 py-2 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all font-mono"
                placeholder="••••••••••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing...' : loginMethod === 'magic_link' ? 'Send Magic Link' : isLogin ? 'Authenticate' : 'Initialize Identity'}
          </button>
        </form>

        {loginMethod === 'password' && (
          <div className="mt-6 pt-4 border-t border-[#1F2937] text-center">
            <p className="text-[10px] text-gray-500">
              {isLogin ? 'No active profile?' : 'Already have an identity?'}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); }}
                className="ml-2 text-blue-500 font-bold uppercase hover:text-blue-400 transition-colors"
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-[9px] text-gray-600 font-mono text-center flex gap-4">
        <span className="text-green-500">SERVER-SIDE ENCRYPTION</span>
        <span className="text-blue-500">AES-256-GCM AT REST</span>
      </div>
    </div>
  );
}
