import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../state/ThemeProvider';
import { useOfflineService } from '../services/offlineService';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Animated } from 'react-native';

interface NetworkStatusProps {
  showWhenOnline?: boolean; // Mostrar status quando online também
  autoHide?: boolean; // Auto esconder após alguns segundos
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showWhenOnline = false,
  autoHide = true,
}) => {
  const theme = useTheme();
  const offlineService = useOfflineService();

  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-50)).current;

  // Memoize the checkStatus function to prevent unnecessary re-creations
  const checkStatus = useCallback(async () => {
    const online = offlineService.getNetworkStatus();
    const pending = offlineService.getPendingActionsCount();
    const lastSync = await offlineService.getLastSyncTime();

    setIsOnline(online);
    setPendingActions(pending);
    setLastSyncTime(lastSync);

    // Mostrar status se:
    // - Está offline, ou
    // - Tem ações pendentes, ou
    // - showWhenOnline está ativo
    const shouldShow = !online || pending > 0 || showWhenOnline;
    setShowStatus(shouldShow);
  }, [offlineService, showWhenOnline]);

  useEffect(() => {
    // Verificar status inicial
    checkStatus();

    // Verificar status periodicamente
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    if (showStatus) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto hide se online e configurado
      if (autoHide && isOnline && pendingActions === 0) {
        const timeout = setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();

          Animated.timing(translateY, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 3000);

        return () => clearTimeout(timeout);
      }
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.timing(translateY, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return undefined;
  }, [showStatus, isOnline, pendingActions, autoHide, opacity, translateY]);

  const handleSync = async () => {
    if (isOnline && pendingActions > 0) {
      // Animação de pulse durante sync
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      await offlineService.syncPendingActions();
    }
  };

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        backgroundColor: theme.colors.danger,
        icon: 'wifi-off' as const,
        text: 'Offline',
        description:
          pendingActions > 0
            ? `${pendingActions} ações aguardando sincronização`
            : 'Sem conexão com internet',
      };
    }

    if (pendingActions > 0) {
      return {
        backgroundColor: theme.colors.warning,
        icon: 'sync' as const,
        text: 'Sincronizando',
        description: `${pendingActions} ações pendentes`,
      };
    }

    return {
      backgroundColor: theme.colors.success,
      icon: 'wifi' as const,
      text: 'Online',
      description: lastSyncTime
        ? `Última sync: ${new Date(lastSyncTime).toLocaleTimeString()}`
        : 'Conectado',
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.statusBar, { backgroundColor: statusConfig.backgroundColor }]}
        onPress={handleSync}
        disabled={!isOnline || pendingActions === 0}
        activeOpacity={0.8}
      >
        <View style={styles.statusContent}>
          <MaterialCommunityIcons
            name={statusConfig.icon}
            size={16}
            color="white"
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={styles.statusText}>{statusConfig.text}</Text>
            <Text style={styles.descriptionText}>{statusConfig.description}</Text>
          </View>
          {pendingActions > 0 && isOnline && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color="white"
              style={styles.chevron}
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 44, // Safe area top
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default React.memo(NetworkStatus);
