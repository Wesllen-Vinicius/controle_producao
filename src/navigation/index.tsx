import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer, RouteProp, Theme } from '@react-navigation/native';
import { createStackNavigator, StackNavigationOptions, TransitionPresets } from '@react-navigation/stack';
import React, { useCallback, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native'; // <<< 1. IMPORTADO useColorScheme

// Telas de Autenticação
import LoginScreen from '../screens/Login';
import PasswordResetScreen from '../screens/PasswordResetScreen';
import SignupScreen from '../screens/SignupScreen';

// Telas Principais do App
import EstoqueScreen from '../screens/Estoque';

import ProducaoScreen from '../screens/Producao';
import RelatorioScreen from '../screens/Relatorio';

// Provedores e Hooks
import PerfilScreen from '@/screens/Perfil';
import ProdutosScreen from '@/screens/Produtos';
import { useAuth } from '../state/AuthProvider';
import { ThemeColors, useTheme } from '../state/ThemeProvider';


// --- Definição de Tipos para Navegação Segura ---
type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  PasswordReset: undefined;
};

type AppTabParamList = {
  Produção: undefined;
  Estoque: undefined;
  Perfil: undefined;
  Admin: undefined;
  Relatórios: undefined;
};

type AppStackParamList = {
  AppTabs: { screen?: keyof AppTabParamList };
  // ProductionDetails: { id: string }; // Exemplo
};

// --- Criação dos Navegadores com Tipagem ---
const AuthStack = createStackNavigator<AuthStackParamList>();
const AppStack = createStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

// --- Constantes e Configurações Reutilizáveis ---
const TAB_ICONS: Record<keyof AppTabParamList, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  Produção: 'factory',
  Estoque: 'warehouse',
  Perfil: 'account-circle',
  Admin: 'cog-outline',
  Relatórios: 'chart-box-outline',
};

const createBaseStackOptions = (colors: ThemeColors): StackNavigationOptions => ({
  headerStyle: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTintColor: colors.text,
  headerTitleStyle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  headerBackTitleVisible: false,
  ...TransitionPresets.SlideFromRightIOS,
});

// --- Componente de Navegação por Abas (Tabs) ---
function AppTabs() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const isAdmin = profile?.role === 'admin';

  const renderTabBarIcon = useCallback(
    (route: RouteProp<AppTabParamList, keyof AppTabParamList>) =>
      ({ color, size }: { color: string; size: number }) => {
        const iconName = TAB_ICONS[route.name] || 'dots-horizontal';
        return <MaterialCommunityIcons name={iconName} color={color} size={size} />;
      },
    []
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 65,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 30 : 8,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: renderTabBarIcon(route),
      })}
      sceneContainerStyle={{ backgroundColor: colors.background }}
    >
      <Tab.Screen name="Produção" component={ProducaoScreen} />
      <Tab.Screen name="Estoque" component={EstoqueScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
      {isAdmin && (
        <>
          <Tab.Screen name="Admin" component={ProdutosScreen} />
          <Tab.Screen name="Relatórios" component={RelatorioScreen} />
        </>
      )}
    </Tab.Navigator>
  );
}

// --- Componente de Navegação de Autenticação ---
function AuthNavigator() {
  const { colors } = useTheme();
  const baseScreenOptions = useMemo(() => createBaseStackOptions(colors), [colors]);

  return (
    <AuthStack.Navigator screenOptions={baseScreenOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          title: 'Criar Conta',
          presentation: 'modal',
          ...Platform.select({
            ios: TransitionPresets.ModalSlideFromBottomIOS,
            android: TransitionPresets.FadeFromBottomAndroid,
          }),
        }}
      />
      <AuthStack.Screen
        name="PasswordReset"
        component={PasswordResetScreen}
        options={{
          title: 'Recuperar Senha',
          presentation: 'modal',
          ...Platform.select({
            ios: TransitionPresets.ModalSlideFromBottomIOS,
            android: TransitionPresets.FadeFromBottomAndroid,
          }),
        }}
      />
    </AuthStack.Navigator>
  );
}

// --- Componente de Navegação Principal do App (Pós-Login) ---
function AppNavigator() {
  const { colors } = useTheme();
  const baseScreenOptions = useMemo(() => createBaseStackOptions(colors), [colors]);

  return (
    <AppStack.Navigator screenOptions={baseScreenOptions}>
      <AppStack.Screen name="AppTabs" component={AppTabs} options={{ headerShown: false }} />
      {/*
        <AppStack.Screen
          name="ProductionDetails"
          component={ProductionDetailsScreen}
          options={{ title: 'Detalhes da Produção' }}
        />
      */}
    </AppStack.Navigator>
  );
}

// --- Componente Raiz da Navegação ---
export default function Navigator() {
  const { session, loading } = useAuth();
  const { colors } = useTheme(); // <<< 2. REMOVIDA a propriedade 'theme'
  const colorScheme = useColorScheme(); // <<< 3. USADO o hook do React Native

  const navigationTheme: Theme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: colorScheme === 'dark', // <<< 4. CONDIÇÃO agora usa o 'colorScheme'
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.line,
        notification: colors.primary,
      },
    }),
    [colors, colorScheme] // <<< 5. ATUALIZADA a dependência do useMemo
  );

  if (loading) {
    return null; // Idealmente, uma tela de Splash
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
