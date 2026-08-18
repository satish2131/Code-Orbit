import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { APP_COLORS } from '../constants';

export default function IndexScreen() {
  const { status } = useAuthStore();

  if (status === 'AUTHENTICATED') {
    return <Redirect href="/(main)/home" />;
  }

  if (status === 'UNAUTHENTICATED') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#17181A',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="small" color={APP_COLORS.primary} />
    </View>
  );
}
