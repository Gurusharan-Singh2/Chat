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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError || !conv) {
    notFound();
  }

  // Verify that the current user is a participant
  if (conv.user1_id !== user.id && conv.user2_id !== user.id) {
    redirect('/chat');
  }

  // Identify the other participant
  const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

  // Fetch both profiles
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
