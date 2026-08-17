import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEditorStore } from '../../store/editorStore';
import { APP_COLORS } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const APP_THEMES = [
  {
    id: 'dark',
    name: 'Red & Black',
    background: '#000000',
    surface: '#121215',
    text: '#ffffff',
    primary: '#EF4444',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: '#0f0f23',
    surface: '#1a1a3e',
    text: '#e0e0e0',
    primary: '#7C6FFF',
  },
  {
    id: 'navy',
    name: 'Navy',
    background: '#0a1929',
    surface: '#132f4c',
    text: '#ffffff',
    primary: '#1976d2',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    background: '#1e1e1e',
    surface: '#2d2d2d',
    text: '#ffffff',
    primary: '#bb86fc',
  },
  {
    id: 'light',
    name: 'Light',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#1a1a1a',
    primary: '#6C63FF',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    background: '#f4ecd8',
    surface: '#ebe3cb',
    text: '#5c4b37',
    primary: '#8b6914',
  },
];

export default function ThemeScreen() {
  const router = useRouter();
  const { currentTheme, setTheme } = useEditorStore();
  const [selectedAppTheme, setSelectedAppTheme] = useState('dark');

  // Safe initial values so screen is always visible
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
    }, [opacityAnim, slideAnim])
  );

  const handleBack = () => {
    router.replace('/(main)/profile');
  };

  const handleSelectTheme = (theme: typeof APP_THEMES[0]) => {
    setSelectedAppTheme(theme.id);
  };

  const activeTheme = APP_THEMES.find(t => t.id === selectedAppTheme);
  const themeSurface = activeTheme?.surface || APP_COLORS.surface;
  const themePrimary = activeTheme?.primary || APP_COLORS.primary;
  const themeText = activeTheme?.text || APP_COLORS.text;

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          flex: 1,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theme</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: themeSurface }]}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewDot, { backgroundColor: APP_COLORS.error }]} />
                <View style={[styles.previewDot, { backgroundColor: APP_COLORS.warning }]} />
                <View style={[styles.previewDot, { backgroundColor: APP_COLORS.success }]} />
              </View>
              <View style={styles.previewCode}>
                <Text style={[styles.previewKeyword, { color: themePrimary }]}>const</Text>
                <Text style={[styles.previewText, { color: themeText }]}> hello</Text>
                <Text style={[styles.previewText, { color: themeText }]}>() {"{"}</Text>
              </View>
              <View style={styles.previewCode}>
                <Text style={[styles.previewText, { color: themeText }]}>  console.</Text>
                <Text style={[styles.previewFunction, { color: themePrimary }]}>log</Text>
                <Text style={[styles.previewText, { color: themeText }]}>('world');</Text>
              </View>
              <View style={styles.previewCode}>
                <Text style={[styles.previewText, { color: themeText }]}>{"}"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.themeSection}>
            <Text style={styles.sectionTitle}>App Theme</Text>
            <View style={styles.themeGrid}>
              {APP_THEMES.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: theme.surface },
                    selectedAppTheme === theme.id && styles.themeCardSelected,
                  ]}
                  onPress={() => handleSelectTheme(theme)}
                >
                  <View style={styles.themeCardHeader}>
                    <View style={[styles.themeMiniPreview, { backgroundColor: theme.background }]}>
                      <View style={[styles.miniLine, { backgroundColor: theme.primary, width: '60%' }]} />
                      <View style={[styles.miniLine, { backgroundColor: theme.text, width: '80%' }]} />
                      <View style={[styles.miniLine, { backgroundColor: theme.text, width: '40%' }]} />
                    </View>
                    {selectedAppTheme === theme.id && (
                      <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.themeName, { color: theme.text }]}>{theme.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.editorSection}>
            <Text style={styles.sectionTitle}>Editor Theme</Text>
            {[
              { id: 'dark', name: 'Dark+' },
              { id: 'light', name: 'Light' },
              { id: 'solarized', name: 'Solarized Dark' },
              { id: 'dracula', name: 'Dracula' },
              { id: 'monokai', name: 'Monokai' },
              { id: 'highcontrast', name: 'High Contrast' },
            ].map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[styles.editorThemeItem, currentTheme.id === theme.id && styles.editorThemeItemActive]}
                onPress={() => {
                  const { EDITOR_THEMES } = require('../../constants');
                  const found = EDITOR_THEMES.find((t: any) => t.id === theme.id);
                  if (found) setTheme(found);
                }}
              >
                <View style={[styles.editorThemePreview, { backgroundColor: currentTheme.id === theme.id ? APP_COLORS.primary + '20' : APP_COLORS.surfaceLight }]}>
                  <Ionicons name="code-slash" size={20} color={currentTheme.id === theme.id ? APP_COLORS.primary : APP_COLORS.textSecondary} />
                </View>
                <Text style={[styles.editorThemeName, currentTheme.id === theme.id && styles.editorThemeNameActive]}>
                  {theme.name}
                </Text>
                {currentTheme.id === theme.id && (
                  <Ionicons name="checkmark-circle" size={22} color={APP_COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={handleBack}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.applyButtonText}>Apply Theme</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
    backgroundColor: APP_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border + '40',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  previewSection: {
    marginBottom: 32,
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  previewHeader: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewCode: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  previewKeyword: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  previewText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  previewFunction: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  themeSection: {
    marginBottom: 32,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    width: '47%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardSelected: {
    borderColor: APP_COLORS.primary,
  },
  themeCardHeader: {
    position: 'relative',
    marginBottom: 8,
  },
  themeMiniPreview: {
    height: 60,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    gap: 4,
  },
  miniLine: {
    height: 6,
    borderRadius: 3,
  },
  checkmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeName: {
    fontSize: 13,
    fontWeight: '500',
  },
  editorSection: {
    marginBottom: 32,
  },
  editorThemeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  editorThemeItemActive: {
    backgroundColor: APP_COLORS.surfaceLight,
  },
  editorThemePreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  editorThemeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: APP_COLORS.text,
  },
  editorThemeNameActive: {
    color: APP_COLORS.primary,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
