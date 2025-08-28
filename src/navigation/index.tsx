import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useMemo } from 'react';
import { Platform } from 'react-native';

// Main App Screens
import EstoqueScreen from '../screens/Estoque'; // <-- CORREÇÃO AQUI
import PerfilScreen from '../screens/PerfilScreen';
import ProducaoScreen from '../screens/Producao'; // <-- CORREÇÃO AQUI
import ProductionDetailsScreen from '../screens/ProductionDetailsScreen';
import ProductsAdminScreen from '../screens/ProductsAdminScreen';
import AdminProductionsReportScreen from '../screens/Relatorio';
import TransactionDetailsScreen from '../screens/TransactionDetailsScreen';

// Authentication Screens
import LoginScreen from '../screens/Login';
import PasswordResetScreen from '../screens/PasswordResetScreen';
import SignupScreen from '../screens/SignupScreen';

// Providers
import { useAuth } from '../state/AuthProvider';
import { useTheme } from '../state/ThemeProvider';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// Icon mapping for better performance
const TAB_ICONS = {
  'Produção': 'factory',
  'Estoque': 'warehouse',
  'Perfil': 'account-circle',
  'Admin': 'cog-outline',
  'Relatórios': 'chart-box-outline',
} as const;

// Enhanced tab bar component with optimized rendering
function AppTabs() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const tabBarOptions = useMemo(() => ({
    headerShown: false,
    lazy: true,
    tabBarHideOnKeyboard: Platform.OS === 'android',
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.line,
      borderTopWidth: 1,
      height: Platform.OS === 'ios' ? 88 : 60,
      paddingBottom: Platform.OS === 'ios' ? 28 : 6,
      paddingTop: 6,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginTop: 2,
    },
    tabBarIconStyle: {
      marginBottom: -2,
    },
  }), [colors]);

  const getTabBarIcon = useMemo(() =>
    ({ route }: { route: any }) =>
      ({ color, size }: { color: string; size: number }) => {
        const iconName = TAB_ICONS[route.name as keyof typeof TAB_ICONS] || 'dots-horizontal';
        return (
          <MaterialCommunityIcons
            name={iconName as any}
            color={color}
            size={size}
          />
        );
      },
    []
  );

  const isAdmin = profile?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarOptions,
        tabBarIcon: getTabBarIcon({ route }),
      })}
      sceneContainerStyle={{ backgroundColor: colors.background }}
    >
      <Tab.Screen
        name="Produção"
        component={ProducaoScreen}
        options={{
          tabBarTestID: 'tab-producao',
          tabBarAccessibilityLabel: 'Produção',
        }}
      />
      <Tab.Screen
        name="Estoque"
        component={EstoqueScreen}
        options={{
          tabBarTestID: 'tab-estoque',
          tabBarAccessibilityLabel: 'Estoque',
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          tabBarTestID: 'tab-perfil',
          tabBarAccessibilityLabel: 'Perfil',
        }}
      />
      {isAdmin && (
        <>
          <Tab.Screen
            name="Admin"
            component={ProductsAdminScreen}
            options={{
              tabBarTestID: 'tab-admin',
              tabBarAccessibilityLabel: 'Administração',
            }}
          />
          <Tab.Screen
            name="Relatórios"
            component={AdminProductionsReportScreen}
            options={{
              tabBarTestID: 'tab-relatorios',
              tabBarAccessibilityLabel: 'Relatórios',
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

// Authentication Stack with custom transitions
function AuthNavigator() {
  const { colors } = useTheme();

  const screenOptions = useMemo(() => ({
    headerStyle: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    headerTintColor: colors.text,
    headerTitleStyle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600' as const,
    },
    headerBackTitleVisible: false,
    headerLeftContainerStyle: { paddingLeft: 16 },
    headerRightContainerStyle: { paddingRight: 16 },
    // Enhanced transitions for auth flow
    ...Platform.select({
      ios: TransitionPresets.SlideFromRightIOS,
      android: TransitionPresets.SlideFromRightIOS,
    }),
  }), [colors]);

  return (
    <AuthStack.Navigator screenOptions={screenOptions}>
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
          animationTypeForReplace: 'pop',
        }}
      />
      <AuthStack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          headerShown: false,
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
          headerShown: false,
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

// Main App Stack with optimized transitions
function AppNavigator() {
  const { colors } = useTheme();

  const screenOptions = useMemo(() => ({
    headerStyle: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    headerTintColor: colors.text,
    headerTitleStyle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600' as const,
    },
    headerBackTitleVisible: false,
    headerLeftContainerStyle: { paddingLeft: 16 },
    headerRightContainerStyle: { paddingRight: 16 },
    // Smooth transitions for app screens
    ...Platform.select({
      ios: TransitionPresets.SlideFromRightIOS,
      android: TransitionPresets.SlideFromRightIOS,
    }),
  }), [colors]);

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AppTabs"
        component={AppTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductionDetails"
        component={ProductionDetailsScreen}
        options={{
          title: 'Detalhes da Produção',
          headerBackTitle: 'Voltar',
        }}
      />
      <Stack.Screen
        name="TransactionDetails"
        component={TransactionDetailsScreen}
        options={{
          title: 'Detalhes da Movimentação',
          headerBackTitle: 'Voltar',
        }}
      />
    </Stack.Navigator>
  );
}

// Main Navigation Container
export default function Navigator() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();

  const navigationTheme = useMemo(() => ({
    dark: false, // O tema da navegação é sempre light, o nosso ThemeProvider cuida das cores
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.line,
      notification: colors.primary,
    },
  }), [colors]);

  // Mostra um estado de carregamento se a sessão ainda estiver sendo verificada
  if (loading) {
    return null; // Ou um componente de splash screen
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
