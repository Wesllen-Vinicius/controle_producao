import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar o comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // CORREÇÃO: A propriedade 'shouldShowAlert' está obsoleta.
    // Foi substituída pelas propriedades 'shouldShowBanner' e 'shouldShowList'
    // para corrigir o erro de tipo e seguir a API mais recente da biblioteca.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  categoryId?: string;
}

class NotificationService {
  private permissionGranted = false;
  private isSupported = true;

  async initialize() {
    const isExpoGo = Constants.appOwnership === 'expo';

    if (isExpoGo) {
      // eslint-disable-next-line no-console
      console.warn(
        '⚠️ Notificações push não são suportadas no Expo Go. Use um development build para funcionalidade completa.'
      );
      this.isSupported = false;
      return false;
    }

    try {
      await this.requestPermissions();
      await this.setupNotificationCategories();
      return this.permissionGranted;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Erro ao inicializar notificações:', error);
      this.isSupported = false;
      return false;
    }
  }

  private async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('production', {
        name: 'Produção',
        description: 'Notificações de registros de produção',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('inventory', {
        name: 'Estoque',
        description: 'Notificações de movimentações de estoque',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    this.permissionGranted = finalStatus === 'granted';

    if (!this.permissionGranted) {
      // eslint-disable-next-line no-console
      console.warn('Permissão de notificação não concedida');
    }

    return this.permissionGranted;
  }

  private async setupNotificationCategories() {
    await Notifications.setNotificationCategoryAsync('production', [
      {
        identifier: 'view_production',
        buttonTitle: 'Ver Detalhes',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'new_production',
        buttonTitle: 'Nova Produção',
        options: { opensAppToForeground: true },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('inventory', [
      {
        identifier: 'view_inventory',
        buttonTitle: 'Ver Estoque',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'new_movement',
        buttonTitle: 'Nova Movimentação',
        options: { opensAppToForeground: true },
      },
    ]);
  }

  async scheduleNotification(
    notification: NotificationData & {
      trigger?: Notifications.NotificationTriggerInput;
    }
  ) {
    if (!this.isSupported) {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Notificação: ${notification.title} - ${notification.body}`);
      return null;
    }

    if (!this.permissionGranted) {
      // eslint-disable-next-line no-console
      console.warn('Permissão de notificação não concedida');
      return null;
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data ?? {},
          categoryIdentifier: notification.categoryId,
          sound: 'default',
        },
        trigger: notification.trigger ?? null,
      });

      return id;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao agendar notificação:', error);
      return null;
    }
  }

  async notifyProductionRegistered(data: { abate: number; itemsCount: number; date: string }) {
    return this.scheduleNotification({
      title: '✅ Produção Registrada',
      body: `${data.abate} animais processados, ${data.itemsCount} produtos produzidos`,
      data: {
        type: 'production',
        action: 'registered',
        ...data,
      },
      categoryId: 'production',
    });
  }

  async notifyInventoryMovement(data: {
    type: 'entrada' | 'saida' | 'ajuste' | 'venda';
    product: string;
    quantity: number;
    unit: string;
  }) {
    const { type: movementType, ...restData } = data;

    const typeLabels = {
      entrada: '📈 Entrada',
      saida: '📉 Saída',
      ajuste: '🔧 Ajuste',
      venda: '💰 Venda',
    };

    const title = `${typeLabels[movementType]} de Estoque`;
    const body = `${data.product}: ${data.quantity} ${data.unit}`;

    return this.scheduleNotification({
      title,
      body,
      data: {
        type: 'inventory',
        action: 'movement',
        movementType: movementType,
        ...restData,
      },
      categoryId: 'inventory',
    });
  }

  async notifyLowStock(data: {
    product: string;
    currentStock: number;
    unit: string;
    threshold: number;
  }) {
    return this.scheduleNotification({
      title: '⚠️ Estoque Baixo',
      body: `${data.product}: ${data.currentStock} ${data.unit} (limite: ${data.threshold})`,
      data: {
        type: 'inventory',
        action: 'low_stock',
        ...data,
      },
      categoryId: 'inventory',
    });
  }

  async notifyNegativeStock(data: { product: string; currentStock: number; unit: string }) {
    return this.scheduleNotification({
      title: '🚨 Estoque Negativo',
      body: `${data.product}: ${data.currentStock} ${data.unit}`,
      data: {
        type: 'inventory',
        action: 'negative_stock',
        ...data,
      },
      categoryId: 'inventory',
    });
  }

  async cancelNotification(id: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao cancelar notificação:', error);
      return false;
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao cancelar todas as notificações:', error);
      return false;
    }
  }

  async getActiveNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao obter notificações ativas:', error);
      return [];
    }
  }
}

export const notificationService = new NotificationService();
