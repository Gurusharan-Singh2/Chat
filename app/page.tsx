import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Video,
  Phone,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users to the chat application
  if (user) {
    redirect('/chat');
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/20 via-violet-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            PulseChat
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60 rounded-xl transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-medium mb-8 backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>100% Free Tier • WebRTC P2P • Next.js 15 App Router</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-[1.15] mb-6">
          Real-Time Chat & HD Calls{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-sky-400 bg-clip-text text-transparent">
            Powered by WebRTC
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          High-performance 1:1 messaging, presence indicators, crystal-clear voice, and low-latency video calls deployed seamlessly on Vercel using Supabase Realtime signaling.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
          >
            <span>Launch Application</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-semibold text-sm transition"
          >
            Sign In with Email
          </Link>
        </div>

        {/* Features Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full text-left">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between group hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/70 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 mb-1">
                Real-Time Messaging
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Postgres Changes subscription with message history, typing indicators, and double-check read receipts.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between group hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 mb-1">
                HD Voice & Video
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct WebRTC peer-to-peer audio and video streaming with incoming ringtone popup, mute controls, and camera flip.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between group hover:border-violet-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-violet-950/70 border border-violet-800/40 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 mb-1">
                Free Vercel Deployment
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Signaling handled entirely via Supabase Broadcast without requiring custom WebSocket servers. Zero server costs.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-400 z-10">
        <p>Built with Next.js 15, Tailwind CSS, Supabase, and WebRTC • 100% Free Tier Architecture</p>
      </footer>
    </div>
  );
}
