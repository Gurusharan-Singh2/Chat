import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChatShell } from '@/components/ChatShell';
import { Profile } from '@/lib/types';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch or ensure user profile exists
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const username =
      user.user_metadata?.username ||
      user.email?.split('@')[0] ||
      `user_${user.id.substring(0, 5)}`;

    const avatarUrl =
      user.user_metadata?.avatar_url ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    const { data: createdProfile } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username,
        avatar_url: avatarUrl,
      })
      .select('*')
      .single();

    profile = createdProfile;
  }

  return (
    <ChatShell currentUser={profile as Profile}>
      {children}
    </ChatShell>
  );
}
