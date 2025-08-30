# 🔔 Configuração de Notificações Push - Development Build

## ⚠️ Limitação do Expo Go

A partir do Expo SDK 53, as notificações push **não funcionam no Expo Go**. Para ter funcionalidade completa de notificações, você precisa usar um **Development Build**.

## 🚀 Configurando Development Build

### 1. Instalar EAS CLI
```bash
npm install -g @expo/eas-cli
```

### 2. Login no Expo
```bash
eas login
```

### 3. Configurar o projeto
```bash
eas build:configure
```

### 4. Gerar Development Build

#### Para Android:
```bash
eas build --profile development --platform android
```

#### Para iOS:
```bash
eas build --profile development --platform ios
```

### 5. Instalar o Development Build
- **Android**: Instale o APK gerado
- **iOS**: Instale via TestFlight ou dispositivo físico

## 📱 Como Usar

1. Instale o development build no seu dispositivo
2. Execute: `npx expo start --dev-client`
3. Escaneie o QR code com o development build (não o Expo Go)

## ✅ Funcionalidades Disponíveis no Development Build

### Notificações Push Completas:
- ✅ Notificações de produção registrada
- ✅ Notificações de movimentação de estoque
- ✅ Alertas de estoque baixo
- ✅ Alertas de estoque negativo
- ✅ Actions rápidas nas notificações
- ✅ Canais de notificação customizados
- ✅ Sons e vibrações personalizadas

### No Expo Go (Limitado):
- ❌ Notificações push remotas
- ✅ Notificações locais básicas
- ✅ Todas as outras funcionalidades do app

## 🔧 Configuração Adicional (Opcional)

### Android - Configurar FCM:
1. Configure Firebase Cloud Messaging
2. Adicione `google-services.json` ao projeto
3. Configure push tokens para notificações remotas

### iOS - Configurar APNs:
1. Configure Apple Push Notification service
2. Gere certificados de push
3. Configure push tokens

## 📖 Documentação Oficial

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## 💡 Desenvolvimento Local

Durante o desenvolvimento no Expo Go, as notificações são **simuladas no console**:
```
[DEV] Notificação: ✅ Produção Registrada - 50 animais processados, 3 produtos produzidos
```

Isso permite que você continue desenvolvendo normalmente, mesmo sem as notificações push funcionais.