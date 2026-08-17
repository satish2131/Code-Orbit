import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useSessionSocket } from '../../../hooks/useSessionSocket';
import { useSessionStore } from '../../../store/sessionStore';

export default function SessionLayout() {
  const { initializeSocket } = useSessionSocket();
  const { currentSession } = useSessionStore();

  useEffect(() => {
    const cleanup = initializeSocket();
    return cleanup;
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="room" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
