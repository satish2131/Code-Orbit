import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Easing,
  Image,
  ActionSheetIOS,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { APP_COLORS } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatar_url || (user as any)?.avatarUrl || null
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [focusedInput, setFocusedInput] = useState<'name' | 'bio' | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  // Safe initial values so screen is immediately visible and never blank
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Sync state and ensure screen visibility whenever focused
  useFocusEffect(
    useCallback(() => {
      const currentUser = useAuthStore.getState().user;
      setName(currentUser?.name || '');
      setAvatarUri(currentUser?.avatar_url || (currentUser as any)?.avatarUrl || null);
      setSaveStatus('idle');

      // Ensure fully visible
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
    }, [opacityAnim, slideAnim])
  );

  const initialName = user?.name || '';
  const initialEmail = user?.email || '';
  const initialBio = '';
  const initialAvatar = user?.avatar_url || (user as any)?.avatarUrl || null;

  const hasChanges =
    name.trim() !== initialName.trim() ||
    bio.trim() !== initialBio.trim() ||
    avatarUri !== initialAvatar;

  const handleBack = () => {
    router.replace('/(main)/profile');
  };

  const handlePickFromLibrary = async () => {
    setShowPhotoOptions(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'We need access to your photo gallery to choose a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setAvatarUri(uri);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', 'Failed to pick image from photo gallery.');
    }
  };

  const handleTakePhoto = async () => {
    setShowPhotoOptions(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'We need camera permission to take a new profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setAvatarUri(uri);
      }
    } catch (error) {
      console.error('Take photo error:', error);
      Alert.alert('Error', 'Failed to take photo with camera.');
    }
  };

  const handleRemovePhoto = () => {
    setShowPhotoOptions(false);
    setAvatarUri(null);
  };

  const handleOpenPhotoMenu = () => {
    if (Platform.OS === 'ios') {
      const options = ['Take Photo', 'Choose from Photos'];
      if (avatarUri) options.push('Remove Photo');
      options.push('Cancel');

      const destructiveButtonIndex = avatarUri ? 2 : undefined;
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: 'Profile Photo',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleTakePhoto();
          else if (buttonIndex === 1) handlePickFromLibrary();
          else if (avatarUri && buttonIndex === 2) handleRemovePhoto();
        }
      );
    } else {
      setShowPhotoOptions(true);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }
    if (!hasChanges) return;

    setSaveStatus('saving');
    try {
      const finalAvatar = avatarUri !== null ? avatarUri : '';

      // 1. Persist to backend server API
      let serverUser = null;
      try {
        const res = await api.auth.updateProfile({
          name: name.trim(),
          avatarUrl: finalAvatar,
        });
        if (res?.user) {
          serverUser = res.user;
        }
      } catch (apiErr) {
        console.warn('Backend profile update notice:', apiErr);
      }

      // 2. Update local Zustand state & SecureStore
      await updateUser({
        name: name.trim(),
        avatar_url: finalAvatar || undefined,
        avatarUrl: finalAvatar || undefined,
        ...(serverUser || {}),
      } as any);

      setSaveStatus('saved');
      setTimeout(() => {
        handleBack();
      }, 600);
    } catch (err) {
      setSaveStatus('idle');
      Alert.alert('Error', 'Failed to save profile changes.');
    }
  };

  const bioLength = bio.length;
  const isNearLimit = bioLength >= 170;
  const isAtLimit = bioLength >= 200;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View
        style={{
          flex: 1,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        {/* Header with Smart Save State */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={saveStatus === 'saving'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#E0E0E0" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Edit Profile</Text>

          <TouchableOpacity
            style={[
              styles.headerSaveButton,
              (!hasChanges || saveStatus === 'saving') && styles.headerSaveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            activeOpacity={0.8}
          >
            {saveStatus === 'saving' ? (
              <View style={styles.saveLoadingRow}>
                <ActivityIndicator size="small" color={APP_COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.saveLoadingText}>Saving…</Text>
              </View>
            ) : saveStatus === 'saved' ? (
              <Text style={styles.saveSuccessText}>Saved ✓</Text>
            ) : (
              <Text
                style={[
                  styles.headerSaveText,
                  hasChanges ? styles.headerSaveTextActive : styles.headerSaveTextInactive,
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Consolidated Avatar & Tap to Change Photo */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarTouchable}
              onPress={handleOpenPhotoMenu}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {name.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenPhotoMenu}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <Text style={styles.changePhotoPrompt}>Tap to change photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields with Focus Border & Read-Only Email */}
          <View style={styles.formContainer}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'name' && styles.inputFocused,
                ]}
                placeholder="Your full name"
                placeholderTextColor="#777777"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            {/* Read-Only Account Email */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithLockRow}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.readOnlyBadge}>
                  <Ionicons name="lock-closed" size={10.5} color="#777777" style={{ marginRight: 3 }} />
                  <Text style={styles.readOnlyText}>Account email</Text>
                </View>
              </View>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyInputValue} numberOfLines={1}>
                  {initialEmail || 'Not configured'}
                </Text>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  focusedInput === 'bio' && styles.inputFocused,
                ]}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#777777"
                value={bio}
                onChangeText={setBio}
                onFocus={() => setFocusedInput('bio')}
                onBlur={() => setFocusedInput(null)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text
                style={[
                  styles.charCount,
                  isNearLimit && styles.charCountWarning,
                  isAtLimit && styles.charCountLimit,
                ]}
              >
                {bioLength}/200
              </Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Android & Fallback Photo Options Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPhotoOptions(false)}
          />
          <View style={styles.photoSheet}>
            <View style={styles.dragBar} />
            <Text style={styles.photoSheetHeading}>Profile Photo</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handleTakePhoto}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-outline" size={20} color="#F5F5F5" />
              <Text style={styles.sheetOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handlePickFromLibrary}
              activeOpacity={0.75}
            >
              <Ionicons name="images-outline" size={20} color="#F5F5F5" />
              <Text style={styles.sheetOptionText}>Choose from Photos</Text>
            </TouchableOpacity>

            {avatarUri && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={handleRemovePhoto}
                activeOpacity={0.75}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={[styles.sheetOptionText, { color: '#EF4444' }]}>
                  Remove Photo
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelSheetBtn}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.cancelSheetText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: 10,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#28282A',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  headerSaveButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveButtonDisabled: {
    opacity: 0.4,
  },
  headerSaveText: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  headerSaveTextActive: {
    color: APP_COLORS.primary,
  },
  headerSaveTextInactive: {
    color: '#8A8A8E',
  },
  saveLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveLoadingText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  saveSuccessText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Avatar Section - Consolidated & Quiet
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2A2A2E',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: '#2A2A2E',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#26262A',
    borderWidth: 2,
    borderColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  changePhotoPrompt: {
    fontSize: 12.5,
    color: '#8A8A8E',
    fontWeight: '500',
  },

  // Form Fields
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D0D0D0',
  },
  input: {
    backgroundColor: '#202022',
    borderWidth: 1,
    borderColor: '#2E2E32',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: '#F5F5F5',
  },
  inputFocused: {
    borderColor: APP_COLORS.primary,
  },
  textArea: {
    height: 105,
    paddingTop: 10,
  },
  charCount: {
    fontSize: 11,
    color: '#777777',
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarning: {
    color: '#F59E0B',
  },
  charCountLimit: {
    color: '#EF4444',
    fontWeight: '700',
  },

  // Read-Only Email Field
  labelWithLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 11,
    color: '#777777',
  },
  readOnlyInput: {
    backgroundColor: '#19191B',
    borderWidth: 1,
    borderColor: '#26262A',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  readOnlyInputValue: {
    fontSize: 14,
    color: '#8A8A8E',
  },

  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'flex-end',
  },
  photoSheet: {
    backgroundColor: '#1F1F23',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444448',
    alignSelf: 'center',
    marginBottom: 14,
  },
  photoSheetHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 12,
    textAlign: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#28282C',
  },
  sheetOptionText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  cancelSheetBtn: {
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#26262A',
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelSheetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A9A9A',
  },
});
