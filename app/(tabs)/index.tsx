import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import { InboxScreen } from '@/components/InboxScreen';

export default function HomeScreen() {
  const { authState } = useAuth();

  // Show login screen if not authenticated
  if (authState.status !== 'authenticated') {
    return <LoginScreen />;
  }

  // Show inbox screen if authenticated
  return <InboxScreen />;
}
