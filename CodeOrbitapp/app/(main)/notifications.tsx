import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../constants';
import { safeGoBack } from '../../utils/navigation';
import { useNotificationStore, NotificationItem } from '../../store/notificationStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const {
    notifications,
    loadNotifications,
    markAsRead,
    deleteNotification,
  } = useNotificationStore();

  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const handleBack = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false);
      setSelectedIds([]);
      return;
    }
    if (from === 'profile') {
      router.replace('/(main)/profile');
    } else {
      router.replace('/(main)/home');
    }
  }, [from, isSelecting, router]);

  const handleSelectNotification = useCallback(
    (item: NotificationItem) => {
      if (isSelecting) {
        setSelectedIds((ids) =>
          ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]
        );
        return;
      }

      if (!item.isRead) {
        markAsRead(item.id);
      }
      setSelectedNotification(item);
    },
    [isSelecting, markAsRead]
  );

  const handleSelectAllToggle = useCallback(() => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n.id));
    }
  }, [notifications, selectedIds.length]);

  const deleteSelectedNotifications = useCallback(() => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      'Delete notifications?',
      `This will permanently remove ${selectedIds.length} selected notification${
        selectedIds.length > 1 ? 's' : ''
      }.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach(deleteNotification);
            setSelectedIds([]);
            setIsSelecting(false);
          },
        },
      ]
    );
  }, [deleteNotification, selectedIds]);

  const handleDeleteSingle = useCallback(
    (id: string) => {
      deleteNotification(id);
      setSelectedNotification(null);
    },
    [deleteNotification]
  );

  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;
  const todayNotifications = notifications.filter(
    (item) => item.section === 'Today' || !item.section
  );
  const earlierNotifications = notifications.filter((item) => item.section === 'This Week');

  return (
    <View style={styles.container}>
      {/* 1. Top Navigation Bar */}
      <View style={styles.topNav}>
        {isSelecting ? (
          <View style={styles.selectionNavRow}>
            <Text style={styles.selectionNavTitle}>Select Notifications</Text>
            <TouchableOpacity
              onPress={() => {
                setIsSelecting(false);
                setSelectedIds([]);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.standardNavRow}>
            <TouchableOpacity
              style={styles.navIconButton}
              onPress={handleBack}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={20} color={APP_COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navIconButton}
              onPress={() => setShowManageModal(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Manage notifications"
            >
              <Ionicons name="settings-outline" size={19} color={APP_COLORS.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isSelecting && { paddingBottom: 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Main Title & Dynamic Status Message */}
        <View style={styles.headerTitleSection}>
          <Text style={styles.mainTitle}>Notifications</Text>
          <Text style={styles.subtitleText}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
              : notifications.length > 0
              ? "You're all caught up."
              : 'No new notifications.'}
          </Text>
        </View>

        {/* 3. Selection Control Strip (When in selection mode) */}
        {isSelecting && notifications.length > 0 && (
          <View style={styles.selectionControlStrip}>
            <TouchableOpacity
              style={styles.selectAllBtn}
              onPress={handleSelectAllToggle}
              activeOpacity={0.75}
            >
              <Ionicons
                name={allSelected ? 'checkbox' : 'square-outline'}
                size={20}
                color={allSelected ? APP_COLORS.primary : APP_COLORS.textSecondary}
              />
              <Text style={styles.selectAllLabel}>Select all</Text>
            </TouchableOpacity>

            <Text style={styles.selectedCountText}>
              {selectedIds.length} of {notifications.length} selected
            </Text>
          </View>
        )}

        {/* 4. Section: Today */}
        {todayNotifications.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeaderTitle}>Today</Text>

            <View style={styles.itemsList}>
              {todayNotifications.map((item) => (
                <NotificationRowItem
                  key={item.id}
                  item={item}
                  isSelecting={isSelecting}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={handleSelectNotification}
                />
              ))}
            </View>
          </View>
        )}

        {/* 5. Section: Earlier */}
        {earlierNotifications.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeaderTitle}>Earlier</Text>

            <View style={styles.itemsList}>
              {earlierNotifications.map((item) => (
                <NotificationRowItem
                  key={item.id}
                  item={item}
                  isSelecting={isSelecting}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={handleSelectNotification}
                />
              ))}
            </View>
          </View>
        )}

        {/* 6. Clean Empty State */}
        {notifications.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="notifications-off-outline"
                size={36}
                color={APP_COLORS.textSecondary}
              />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              You're all caught up! Activity updates and session invites will appear here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 7. Sticky Bottom Floating Delete Bar (In Selection Mode) */}
      {isSelecting && (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={[
              styles.deleteSelectedBtn,
              selectedIds.length === 0 && styles.deleteSelectedBtnDisabled,
            ]}
            onPress={deleteSelectedNotifications}
            disabled={selectedIds.length === 0}
            activeOpacity={0.85}
          >
            <Ionicons
              name="trash-outline"
              size={17}
              color={selectedIds.length > 0 ? '#FFFFFF' : '#777777'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.deleteSelectedBtnText,
                selectedIds.length === 0 && styles.deleteSelectedBtnTextDisabled,
              ]}
            >
              {selectedIds.length > 0
                ? `Delete ${selectedIds.length} selected`
                : 'Delete selected'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 8. Notification Detail View Modal */}
      <Modal
        visible={!!selectedNotification}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.detailModalOverlay}>
          {selectedNotification && (
            <View style={styles.detailModalCard}>
              <View
                style={[
                  styles.modalIconBox,
                  { backgroundColor: (selectedNotification.color || APP_COLORS.primary) + '18' },
                ]}
              >
                <Ionicons
                  name={(selectedNotification.icon || 'notifications') as any}
                  size={26}
                  color={selectedNotification.color || APP_COLORS.primary}
                />
              </View>

              <Text style={styles.modalSender}>{selectedNotification.sender}</Text>
              <Text style={styles.modalAction}>{selectedNotification.action}</Text>

              <Text style={styles.modalSubtext}>
                {selectedNotification.subtitle} · {selectedNotification.time}
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => handleDeleteSingle(selectedNotification.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.modalDeleteText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedNotification(null)}
                >
                  <Text style={styles.modalCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* 9. Manage Notifications Compact Modal */}
      <Modal
        visible={showManageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManageModal(false)}
      >
        <TouchableOpacity
          style={styles.manageModalOverlay}
          activeOpacity={1}
          onPress={() => setShowManageModal(false)}
        >
          <View style={styles.manageCard} onStartShouldSetResponder={() => true}>
            <View style={styles.manageIconBox}>
              <Ionicons name="settings-outline" size={22} color={APP_COLORS.text} />
            </View>

            <Text style={styles.manageTitle}>Manage Notifications</Text>
            <Text style={styles.manageSubtitle}>Select notifications to delete.</Text>

            <TouchableOpacity
              style={styles.manageActionRow}
              onPress={() => {
                setShowManageModal(false);
                setIsSelecting(true);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.manageActionLeft}>
                <Ionicons name="checkbox-outline" size={18} color={APP_COLORS.primary} />
                <Text style={styles.manageActionLabel}>Select notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manageDoneButton}
              onPress={() => setShowManageModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.manageDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface NotificationRowItemProps {
  item: NotificationItem;
  isSelecting: boolean;
  isSelected: boolean;
  onSelect: (item: NotificationItem) => void;
}

const NotificationRowItem = React.memo(function NotificationRowItem({
  item,
  isSelecting,
  isSelected,
  onSelect,
}: NotificationRowItemProps) {
  const iconColor = item.color || APP_COLORS.primary;

  return (
    <TouchableOpacity
      style={[
        styles.notificationRow,
        !item.isRead && styles.notificationRowUnread,
        isSelected && styles.notificationRowSelected,
      ]}
      onPress={() => onSelect(item)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${item.sender}, ${item.action}`}
    >
      {/* Checkbox (in selection mode) */}
      {isSelecting && (
        <View style={styles.rowCheckboxBox}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={20}
            color={isSelected ? APP_COLORS.primary : APP_COLORS.textSecondary}
          />
        </View>
      )}

      {/* Semantic Icon Circle */}
      <View style={[styles.itemIconBox, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={(item.icon || 'notifications') as any} size={18} color={iconColor} />
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <View style={styles.senderLine}>
          {!item.isRead && <View style={styles.unreadDot} />}
          <Text style={[styles.senderText, !item.isRead && styles.senderTextUnread]}>
            {item.sender}
          </Text>
        </View>

        <Text style={styles.actionText} numberOfLines={1}>
          {item.action}
        </Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>

      {/* Trailing Chevron */}
      {!isSelecting && (
        <Ionicons name="chevron-forward" size={15} color="#555555" style={{ marginLeft: 6 }} />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  topNav: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 10,
  },
  standardNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  navIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Scroll Area
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerTitleSection: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 14,
    color: '#9A9A9A',
  },

  // Selection Strip
  selectionControlStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#242424',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#303030',
    marginBottom: 16,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  selectedCountText: {
    fontSize: 12,
    color: '#9A9A9A',
    fontWeight: '500',
  },

  // Sections
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A9A9A',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  itemsList: {
    backgroundColor: '#242424',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#303030',
    overflow: 'hidden',
  },

  // Notification Row
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  notificationRowUnread: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  notificationRowSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  rowCheckboxBox: {
    marginRight: 10,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  senderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  senderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  senderTextUnread: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionText: {
    fontSize: 12.5,
    color: '#9A9A9A',
    lineHeight: 16,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#6E6E73',
  },

  // Sticky Bottom Action Bar
  bottomActionBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  deleteSelectedBtn: {
    height: 50,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  deleteSelectedBtnDisabled: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#383838',
  },
  deleteSelectedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteSelectedBtnTextDisabled: {
    color: '#666666',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9A9A9A',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Detail Modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#242424',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#303030',
  },
  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalSender: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalAction: {
    fontSize: 13.5,
    color: '#C0C0C0',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  modalSubtext: {
    fontSize: 12,
    color: '#8A8A8E',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalDeleteBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    color: '#EF4444',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalCloseBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalCloseText: {
    color: '#F5F5F5',
    fontSize: 13.5,
    fontWeight: '600',
  },

  // Manage Modal
  manageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  manageCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#242424',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#303030',
  },
  manageIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  manageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  manageSubtitle: {
    fontSize: 13,
    color: '#9A9A9A',
    marginBottom: 16,
    textAlign: 'center',
  },
  manageActionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#303030',
    marginBottom: 16,
  },
  manageActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manageActionLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  manageDoneButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A9A9A',
  },
});
