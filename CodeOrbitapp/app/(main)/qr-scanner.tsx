import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { api } from '../../services/api';
import { safeGoBack } from '../../utils/navigation';
import { APP_COLORS } from '../../constants';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.72;

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { joinExistingSession } = useSessionSocket();
  
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isScanning, setIsScanning] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Only request camera permission when user is actively on this screen and taps grant
  const handleRequestPermission = async () => {
    try {
      await requestPermission();
    } catch (e) {
      console.warn('Camera permission request error:', e);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setIsScreenFocused(true);
      } else {
        setIsScreenFocused(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const extractSessionCode = (data: string): string | null => {
    if (!data) return null;
    const cleanData = data.trim();

    // 1. Raw 6-character code (e.g. "6KFP6W")
    if (/^[A-Z0-9]{6}$/i.test(cleanData)) {
      return cleanData.toUpperCase();
    }

    // 2. Custom Scheme: codeorbit://join?code=6KFP6W
    const schemeMatch = cleanData.match(/code=([A-Z0-9]{6})/i);
    if (schemeMatch && schemeMatch[1]) {
      return schemeMatch[1].toUpperCase();
    }

    // 3. Web Universal Link: https://codeorbit.app/join/6KFP6W or ?code=6KFP6W
    const urlMatch = cleanData.match(/join\/([A-Z0-9]{6})/i) || cleanData.match(/code=([A-Z0-9]{6})/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].toUpperCase();
    }

    return null;
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    // 1. Lock scanner immediately to prevent duplicate rapid events
    if (!isScanning || isValidating) return;

    setIsScanning(false);
    const extractedCode = extractSessionCode(data);

    if (!extractedCode) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code does not contain a valid CodeOrbit session code.',
        [
          {
            text: 'Try Again',
            onPress: () => setIsScanning(true),
          },
        ]
      );
      return;
    }

    setScannedCode(extractedCode);
    setIsValidating(true);

    try {
      // 2. Backend Validation: Verify session exists, is active, and non-expired
      const res = await api.sessions.getByCode(extractedCode);
      setIsValidating(false);

      if (res?.session?.status === 'ended') {
        Alert.alert(
          'Session Expired',
          `Session "${extractedCode}" has already been ended or expired by the host.`,
          [{ text: 'Scan Another Code', onPress: () => setIsScanning(true) }]
        );
        return;
      }

      // 3. Active Session Confirmed -> Prompt to join
      Alert.alert(
        'Session Code Detected',
        `Join ${res?.session?.languagePreset || 'CodeOrbit'} session "${extractedCode}"?`,
        [
          {
            text: 'Scan Again',
            style: 'cancel',
            onPress: () => {
              setIsScanning(true);
              setScannedCode(null);
            },
          },
          {
            text: 'Join Session',
            onPress: () => {
              joinExistingSession(extractedCode);
              router.replace('/(main)/waiting-room');
            },
          },
        ]
      );
    } catch (err: any) {
      setIsValidating(false);
      const errMsg = err?.message || 'Failed to validate session code.';
      Alert.alert(
        'Session Validation Error',
        errMsg.includes('not found') || errMsg.includes('404')
          ? `Session code "${extractedCode}" was not found or has expired.`
          : errMsg,
        [{ text: 'Scan Again', onPress: () => setIsScanning(true) }]
      );
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      Alert.alert('Error', 'Unable to open settings automatically.');
    }
  };

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={APP_COLORS.primary} />
        <Text style={styles.loadingText}>Initializing camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="camera-outline" size={64} color={APP_COLORS.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionSubtitle}>
          CodeOrbit requires camera access to scan session QR codes and join collaborative rooms instantly.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
          <Ionicons name="settings-outline" size={18} color={APP_COLORS.text} style={{ marginRight: 6 }} />
          <Text style={styles.settingsButtonText}>Open Device Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => safeGoBack(router, '/(main)/home')}>
          <Text style={styles.cancelButtonText}>Return Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Native Camera Viewfinder */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={isScanning && isScreenFocused && !isValidating ? handleBarcodeScanned : undefined}
      />

      {/* Top Header Overlay */}
      <View style={styles.topOverlay}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => safeGoBack(router, '/(main)/home')}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Session QR Code</Text>

        <View style={styles.controlsRight}>
          <TouchableOpacity
            style={[styles.iconCircle, torch && styles.activeIconCircle]}
            onPress={() => setTorch(!torch)}
          >
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scanning Target Frame with Corner Accents */}
      <View style={styles.scannerCenterContainer}>
        <View style={styles.scannerFrame}>
          {/* Top-Left Corner */}
          <View style={[styles.corner, styles.topLeft]} />
          {/* Top-Right Corner */}
          <View style={[styles.corner, styles.topRight]} />
          {/* Bottom-Left Corner */}
          <View style={[styles.corner, styles.bottomLeft]} />
          {/* Bottom-Right Corner */}
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Center Scan Reticle Line / Loading Spinner */}
          {isValidating ? (
            <View style={styles.validatingBox}>
              <ActivityIndicator size="large" color={APP_COLORS.primary} />
              <Text style={styles.validatingText}>Validating session...</Text>
            </View>
          ) : isScanning ? (
            <View style={styles.scanLine} />
          ) : null}
        </View>
        <Text style={styles.hintText}>
          {isValidating
            ? 'Checking session status...'
            : isScanning
            ? 'Align QR code inside the frame to scan'
            : `Code: ${scannedCode || 'Processing...'}`}
        </Text>
      </View>

      {/* Bottom Manual Code Fallback */}
      <View style={styles.bottomOverlay}>
        <TouchableOpacity
          style={styles.manualEntryButton}
          onPress={() => router.replace('/(main)/join-session')}
        >
          <Ionicons name="keypad-outline" size={20} color={APP_COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.manualEntryText}>Enter Code Manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: APP_COLORS.textSecondary,
    fontSize: 15,
    marginTop: 12,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingsButtonText: {
    color: APP_COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: APP_COLORS.textSecondary,
    fontSize: 15,
  },
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  controlsRight: {
    flexDirection: 'row',
    gap: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconCircle: {
    backgroundColor: APP_COLORS.primary,
  },
  scannerCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: APP_COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    width: SCANNER_SIZE - 20,
    height: 3,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 2,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  validatingBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 16,
  },
  validatingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 10,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  manualEntryText: {
    color: APP_COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
