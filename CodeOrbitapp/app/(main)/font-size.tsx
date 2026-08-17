import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FONT_SIZES = [
  { id: 'small', label: 'Small', size: 12, preview: 12 },
  { id: 'medium', label: 'Medium', size: 14, preview: 14 },
  { id: 'large', label: 'Large', size: 16, preview: 16 },
  { id: 'xlarge', label: 'Extra Large', size: 18, preview: 18 },
];

export default function FontSizeScreen() {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState('medium');
  const [editorFontSize, setEditorFontSize] = useState(14);

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
          <Text style={styles.headerTitle}>Font Size</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <Text style={[styles.previewText, { fontSize: FONT_SIZES.find(s => s.id === selectedSize)?.size || 14 }]}>
                The quick brown fox jumps over the lazy dog
              </Text>
              <Text style={[styles.previewCode, { fontSize: FONT_SIZES.find(s => s.id === selectedSize)?.size || 14 }]}>
                {'const hello = () => {\n  console.log("world");\n};'}
              </Text>
            </View>
          </View>

          <View style={styles.sizeSection}>
            <Text style={styles.sectionTitle}>App Font Size</Text>
            {FONT_SIZES.map((size) => (
              <TouchableOpacity
                key={size.id}
                style={[styles.sizeOption, selectedSize === size.id && styles.sizeOptionActive]}
                onPress={() => setSelectedSize(size.id)}
              >
                <View style={styles.sizeInfo}>
                  <Text style={[styles.sizeLabel, { fontSize: size.preview }]}>{size.label}</Text>
                  <Text style={styles.sizeValue}>{size.size}px</Text>
                </View>
                {selectedSize === size.id && (
                  <Ionicons name="checkmark-circle" size={22} color={APP_COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.editorSection}>
            <Text style={styles.sectionTitle}>Editor Font Size</Text>
            <View style={styles.counterControl}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setEditorFontSize(Math.max(10, editorFontSize - 1))}
              >
                <Ionicons name="remove" size={20} color={APP_COLORS.text} />
              </TouchableOpacity>

              <View style={styles.counterValueBox}>
                <Text style={styles.counterValue}>{editorFontSize}px</Text>
              </View>

              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setEditorFontSize(Math.min(24, editorFontSize + 1))}
              >
                <Ionicons name="add" size={20} color={APP_COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={handleBack}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.applyButtonText}>Save Font Preferences</Text>
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
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  previewSection: {
    marginBottom: 28,
  },
  previewCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  previewText: {
    color: APP_COLORS.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  previewCode: {
    color: APP_COLORS.primary,
    fontFamily: 'monospace',
    lineHeight: 20,
    backgroundColor: APP_COLORS.surfaceLight,
    padding: 12,
    borderRadius: 8,
  },
  sizeSection: {
    marginBottom: 28,
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: APP_COLORS.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  sizeOptionActive: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primary + '10',
  },
  sizeInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  sizeLabel: {
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  sizeValue: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  editorSection: {
    marginBottom: 28,
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    padding: 12,
    gap: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: APP_COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValueBox: {
    paddingHorizontal: 24,
  },
  counterValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: APP_COLORS.text,
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
