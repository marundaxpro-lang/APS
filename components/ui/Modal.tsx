
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  ModalProps as RNModalProps,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface ModalProps extends Partial<RNModalProps> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  children?: React.ReactNode;
}

export default function Modal({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  children,
  ...modalProps
}: ModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return {
          ios: 'checkmark.circle.fill',
          android: 'check-circle',
          color: colors.success || '#10b981',
        };
      case 'error':
        return {
          ios: 'xmark.circle.fill',
          android: 'error',
          color: '#ef4444',
        };
      case 'warning':
        return {
          ios: 'exclamationmark.triangle.fill',
          android: 'warning',
          color: '#f59e0b',
        };
      case 'confirm':
        return {
          ios: 'questionmark.circle.fill',
          android: 'help',
          color: colors.primary,
        };
      default:
        return {
          ios: 'info.circle.fill',
          android: 'info',
          color: colors.primary,
        };
    }
  };

  const icon = getIcon();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      {...modalProps}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {icon && (
            <View style={styles.iconContainer}>
              <IconSymbol
                ios_icon_name={icon.ios}
                android_material_icon_name={icon.android}
                size={48}
                color={icon.color}
              />
            </View>
          )}

          {title && <Text style={styles.title}>{title}</Text>}
          
          {message && <Text style={styles.message}>{message}</Text>}
          
          {children}

          <View style={styles.buttonContainer}>
            {type === 'confirm' && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={() => {
                if (onConfirm) {
                  onConfirm();
                }
                onClose();
              }}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
