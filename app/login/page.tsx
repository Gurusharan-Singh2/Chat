'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push('/chat');
        router.refresh();
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111b21] flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* WhatsApp Green Top Accent Line */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-[#00a884]" />

      <div className="w-full max-w-md z-10 py-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#00a884] shadow-lg shadow-[#00a884]/20 mb-3">
            <MessageSquare className="w-7 h-7 text-white fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-[#e9edef] tracking-tight">
            PulseChat
          </h1>
          <p className="text-xs text-[#8696a0] mt-1">
            Real-time chat, file sharing & HD WebRTC calls
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#202c33] border border-[#222e35] rounded-3xl p-6 sm:p-8 shadow-2xl">
          {errorMsg && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8696a0] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#111b21] border border-[#222e35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8696a0] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#111b21] border border-[#222e35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/25 transition disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#222e35] text-center">
            <p className="text-xs text-[#8696a0]">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-[#00a884] hover:text-[#25d366] font-semibold underline underline-offset-2"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
