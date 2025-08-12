import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import ProducaoScreen from '../screens/ProducaoScreen';
import EstoqueScreen from '../screens/EstoqueScreen';
import PerfilScreen from '../screens/PerfilScreen';
import ProductsAdminScreen from '../screens/ProductsAdminScreen';
import ProductionDetailsScreen from '../screens/ProductionDetailsScreen';
import TransactionDetailsScreen from '../screens/TransactionDetailsScreen';
import AuthScreen from '../screens/AuthScreen';
import { useAuth } from '../state/AuthProvider';
import { colors } from '../theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function AppTabs() {
  const { profile } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 58, paddingBottom: 6 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Produção' ? 'cow' :
            route.name === 'Estoque' ? 'warehouse' :
            route.name === 'Perfil'   ? 'account-circle' :
            'cog';
          return <MaterialCommunityIcons name={name as any} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Produção" component={ProducaoScreen} />
      <Tab.Screen name="Estoque" component={EstoqueScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
      {profile?.role === 'admin' && <Tab.Screen name="Admin" component={ProductsAdminScreen} />}
    </Tab.Navigator>
  );
}

export default function Navigator() {
  const { session, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ProductionDetails" component={ProductionDetailsScreen} options={{ title: 'Detalhes da Produção' }} />
            <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} options={{ title: 'Detalhe do Movimento' }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
