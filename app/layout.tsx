import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulseChat — Real-Time Chat & WebRTC Calling',
  description:
    'Free real-time 1:1 messaging, presence indicators, HD voice, and video calling app powered by Next.js, Supabase, and WebRTC.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#111b21',
  colorScheme: 'dark',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0d14] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
