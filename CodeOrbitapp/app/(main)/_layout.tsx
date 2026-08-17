import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Dimensions } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Elevate floating tab bar above Android 3-button navigation bar / gesture bar / iOS home indicator
  const bottomOffset = insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 26 : 14);

  const currentRouteName = state.routes[state.index]?.name;
  const hiddenRoutes = [
    'ai-assistant',
    'create-session',
    'join-session',
    'qr-scanner',
    'waiting-room',
    'edit-profile',
    'theme',
    'terms',
    'privacy',
    'font-size',
    'notifications',
    'upgrade',
    'contact',
    'chat-thread',
    'user-search',
  ];

  if (
    hiddenRoutes.includes(currentRouteName) ||
    hiddenRoutes.some((r) => pathname.endsWith(`/${r}`) || pathname.includes(`/${r}`))
  ) {
    return null;
  }

  // Clean 4-tab configuration (Home, History, Messages, Profile)
  const tabs = [
    { key: 'home', route: 'home', label: 'Home', iconFocused: 'home', iconUnfocused: 'home-outline' },
    { key: 'history', route: 'history', label: 'History', iconFocused: 'time', iconUnfocused: 'time-outline' },
    { key: 'messages', route: 'messages', label: 'Messages', iconFocused: 'chatbubbles', iconUnfocused: 'chatbubbles-outline' },
    { key: 'profile', route: 'profile', label: 'Profile', iconFocused: 'person', iconUnfocused: 'person-outline' },
  ];

  return (
    <View style={[styles.tabBarWrapper, { bottom: bottomOffset }]}>
      <View style={styles.tabBarContainer}>
        {tabs.map((tab) => {
          const currentRoute = state.routes[state.index]?.name || '';
          const isFocused =
            currentRoute === tab.route ||
            currentRoute.startsWith(tab.key) ||
            pathname.includes(tab.key);

          const color = isFocused ? '#EF4444' : APP_COLORS.textSecondary;
          const iconName = isFocused ? tab.iconFocused : tab.iconUnfocused;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              style={styles.tabItem}
              onPress={() => {
                if (tab.key === 'home') router.push('/(main)/home');
                else if (tab.key === 'history') router.push('/(main)/history');
                else if (tab.key === 'messages') router.push('/(main)/messages');
                else if (tab.key === 'profile') router.push('/(main)/profile');
              }}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isFocused }}
            >
              <Ionicons name={iconName as any} size={21} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MainLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="chat-thread" options={{ href: null }} />
      <Tabs.Screen name="user-search" options={{ href: null }} />
      <Tabs.Screen name="create-session" options={{ href: null }} />
      <Tabs.Screen name="join-session" options={{ href: null }} />
      <Tabs.Screen name="waiting-room" options={{ href: null }} />
      <Tabs.Screen name="ai-assistant" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="theme" options={{ href: null }} />
      <Tabs.Screen name="font-size" options={{ href: null }} />
      <Tabs.Screen name="upgrade" options={{ href: null }} />
      <Tabs.Screen name="contact" options={{ href: null }} />
      <Tabs.Screen name="terms" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="qr-scanner" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 26 : 14,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: 58,
    backgroundColor: '#202022',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#303030',
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
