import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const store = await cookies();
  const jwt = store.get('jwt')?.value;
  if (!jwt) {
    redirect('/login');
  }
  redirect('/(protected)');
}
