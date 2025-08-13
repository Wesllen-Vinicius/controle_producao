// navigation/Navigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import ProducaoScreen from '../screens/ProducaoScreen';
import EstoqueScreen from '../screens/EstoqueScreen';
import PerfilScreen from '../screens/PerfilScreen';
import ProductsAdminScreen from '../screens/ProductsAdminScreen';
import AdminProductionsReportScreen from '../screens/Relatorio';
import ProductionDetailsScreen from '../screens/ProductionDetailsScreen';
import TransactionDetailsScreen from '../screens/TransactionDetailsScreen';

// ⟵ novas telas de auth separadas
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import PasswordResetScreen from '../screens/PasswordResetScreen';

import { useAuth } from '../state/AuthProvider';
import { useTheme } from '../state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function AppTabs() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 60,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Produção'   ? 'cow' :
            route.name === 'Estoque'    ? 'warehouse' :
            route.name === 'Perfil'     ? 'account-circle' :
            route.name === 'Admin'      ? 'cog' :
            route.name === 'Relatórios' ? 'chart-box' :
            'dots-horizontal';
          return <MaterialCommunityIcons name={name as any} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Produção" component={ProducaoScreen} />
      <Tab.Screen name="Estoque" component={EstoqueScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
      {profile?.role === 'admin' && (
        <>
          <Tab.Screen name="Admin" component={ProductsAdminScreen} />
          <Tab.Screen name="Relatórios" component={AdminProductionsReportScreen} />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function Navigator() {
  const { session } = useAuth();
  const { colors, typography } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, ...(typography?.h2 as any) },
        }}
      >
        {session ? (
          <>
            {/* App autenticado */}
            <Stack.Screen
              name="App"
              component={AppTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProductionDetails"
              component={ProductionDetailsScreen}
              options={{ title: 'Detalhes da Produção' }}
            />
            <Stack.Screen
              name="TransactionDetails"
              component={TransactionDetailsScreen}
              options={{ title: 'Movimentação' }}
            />
          </>
        ) : (
          <>
            {/* Fluxo de autenticação */}
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ title: 'Criar conta', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen
              name="PasswordReset"
              component={PasswordResetScreen}
              options={{ title: 'Recuperar senha', headerBackTitle: 'Voltar' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
