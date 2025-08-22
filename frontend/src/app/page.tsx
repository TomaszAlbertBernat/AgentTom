import { redirect } from 'next/navigation';
import { isAuthenticated, needsSetup } from '@/lib/auth/local-mode';

export default async function Home() {
  const auth = await isAuthenticated();
  
  if (!auth.authenticated) {
    redirect('/login');
  }
  
  // If in local mode and setup is needed, redirect to setup
  if (auth.isLocal && await needsSetup()) {
    redirect('/setup');
  }
  
  redirect('/(protected)');
}
