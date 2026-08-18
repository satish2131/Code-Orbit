import { View } from 'react-native';
import { useAuthStore } from '../store/authStore';

// index.tsx is intentionally empty — navigation is handled exclusively by
// the AuthGate component in _layout.tsx, which is the single authoritative
// redirect mechanism. Rendering <Redirect> here would race with AuthGate
// during the AUTH_LOADING phase, causing a double-navigation crash.
export default function IndexScreen() {
  // During AUTH_LOADING the AuthGate will navigate us away once status resolves.
  // Return a plain background screen so nothing flashes.
  return <View style={{ flex: 1, backgroundColor: '#17181A' }} />;
}
