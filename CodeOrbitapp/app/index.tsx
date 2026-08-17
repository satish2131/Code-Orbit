import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function IndexScreen() {
  const { user } = useAuthStore();

  if (user) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
