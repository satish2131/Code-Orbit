import { ExpoRoot } from 'expo-router';

export default function App() {
  // @ts-ignore
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}
