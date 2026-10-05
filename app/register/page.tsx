'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Lock, Mail, User, ArrowRight, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('pulse_user');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed || 'user'}`;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      setErrorMsg('Username must be at least 3 alphanumeric characters.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            avatar_url: avatarUrl,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      // If session exists immediately (Email confirmation disabled in Supabase)
      if (data.session) {
        await supabase.from('profiles').upsert({
          id: data.user!.id,
          username: cleanUsername,
          avatar_url: avatarUrl,
        });

        router.push('/chat');
        router.refresh();
      } else {
        // Attempt instant sign in in case user is auto-confirmed
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError) {
          router.push('/chat');
          router.refresh();
        } else {
          setInfoMsg(
            'Registration successful! Please sign in with your email and password.'
          );
        }
      }
    } catch {
      setErrorMsg('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateAvatar = () => {
    setAvatarSeed(Math.random().toString(36).substring(7));
  };

  return (
    <div className="min-h-screen bg-[#111b21] flex flex-col justify-between items-center relative overflow-hidden select-none">
      {/* WhatsApp Web Green Top Banner (Iconic WhatsApp Web Header) */}
      <div className="absolute top-0 inset-x-0 h-52 sm:h-56 bg-[#00a884] z-0 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 pt-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shadow-inner">
            <MessageSquare className="w-6 h-6 fill-current" />
          </div>
          <span className="text-white font-bold text-base tracking-wider uppercase">
            PulseChat Web
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-lg z-10 px-4 pt-20 sm:pt-24 pb-8 my-auto">
        <div className="bg-[#202c33] border border-[#222e35] rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          {/* Card Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-light text-[#e9edef] tracking-tight">
              Create an Account
            </h1>
            <p className="text-xs text-[#8696a0] mt-1.5 leading-relaxed">
              Join PulseChat for real-time messaging, voice notes, and HD WebRTC calls.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3.5 bg-[#00a884]/10 border border-[#00a884]/30 rounded-xl text-[#25d366] text-xs">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Avatar Selector */}
            <div className="flex items-center gap-4 p-3 bg-[#111b21] border border-[#222e35] rounded-2xl">
              <div className="w-13 h-13 rounded-full overflow-hidden bg-[#202c33] border-2 border-[#00a884]/50 shrink-0 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt="Selected Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-[#e9edef] block">
                  Profile Avatar
                </span>
                <button
                  type="button"
                  onClick={regenerateAvatar}
                  className="inline-flex items-center gap-1.5 text-xs text-[#00a884] hover:text-[#25d366] font-medium transition cursor-pointer mt-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Randomize Avatar</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8696a0] mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_dev"
                  className="w-full bg-[#111b21] border border-[#222e35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition"
                />
              </div>
            </div>

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
                  placeholder="alex@example.com"
                  className="w-full bg-[#111b21] border border-[#222e35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#111b21] border border-[#222e35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition"
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
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#222e35] flex items-center justify-between text-xs">
            <span className="text-[#8696a0]">Already have an account?</span>
            <Link
              href="/login"
              className="text-[#00a884] hover:text-[#25d366] font-semibold underline underline-offset-2 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* WhatsApp Bottom Lock Notice */}
      <div className="z-10 pb-6 flex items-center gap-2 text-xs text-[#8696a0]">
        <ShieldCheck className="w-4 h-4 text-[#00a884]" />
        <span>End-to-End Encrypted Communication</span>
      </div>
    </div>
  );
}
