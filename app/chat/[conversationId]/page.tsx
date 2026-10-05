import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ConversationClient } from '@/components/ConversationClient';
import { Profile } from '@/lib/types';

interface PageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;
  const supabase = await createClient();

  // Run user auth check and conversation fetch concurrently
  const [userRes, convRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single(),
  ]);

  const user = userRes.data?.user;
  const conv = convRes.data;

  if (!user) {
    redirect('/login');
  }

  if (convRes.error || !conv) {
    notFound();
  }

  if (conv.user1_id !== user.id && conv.user2_id !== user.id) {
    redirect('/chat');
  }

  const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

  // Fetch both participant profiles concurrently
  const [currentUserRes, otherUserRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', otherUserId).single(),
  ]);

  if (!currentUserRes.data || !otherUserRes.data) {
    notFound();
  }

  return (
    <ConversationClient
      conversationId={conversationId}
      currentUser={currentUserRes.data as Profile}
      otherUser={otherUserRes.data as Profile}
    />
  );
}
