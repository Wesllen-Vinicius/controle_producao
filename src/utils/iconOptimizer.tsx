// Centralizando importações de ícones para otimizar bundle
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { StyleProp, TextStyle } from 'react-native';

// Definindo apenas os ícones que realmente usamos no app, com os nomes CORRETOS
export type AppIconName =
  // Navigation
  | 'factory'
  | 'warehouse'
  | 'account-circle'
  | 'cog-outline'
  | 'chart-box-outline'

  // Actions
  | 'plus'
  | 'filter'
  | 'refresh'
  | 'download'
  | 'upload'
  | 'delete'
  | 'pencil' // CORRIGIDO: 'edit' -> 'pencil'
  | 'content-save' // CORRIGIDO: 'save' -> 'content-save'
  | 'cancel'

  // Status/Feedback
  | 'check-circle'
  | 'alert-circle'
  | 'alert'
  | 'information'
  | 'check'
  | 'close'

  // Content
  | 'history'
  | 'calendar'
  | 'magnify' // CORRIGIDO: 'search' -> 'magnify'
  | 'sort-ascending'
  | 'sort-descending'
  | 'eye'
  | 'eye-off'

  // Support
  | 'bug-outline'
  | 'help-circle'
  | 'email'
  | 'phone'
  | 'web'

  // Misc
  | 'dots-vertical'
  | 'dots-horizontal'
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-down'
  | 'chevron-up';

interface IconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

// Componente otimizado que só renderiza ícones que existem
export function AppIcon({ name, size = 24, color, style }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}

// Helper para verificar se um ícone existe
export function isValidIconName(name: string): name is AppIconName {
  // Lista atualizada com os nomes corretos
  const validIcons: AppIconName[] = [
    'factory',
    'warehouse',
    'account-circle',
    'cog-outline',
    'chart-box-outline',
    'plus',
    'filter',
    'refresh',
    'download',
    'upload',
    'delete',
    'pencil', // CORRIGIDO
    'content-save', // CORRIGIDO
    'cancel',
    'check-circle',
    'alert-circle',
    'alert',
    'information',
    'check',
    'close',
    'history',
    'calendar',
    'magnify', // CORRIGIDO
    'sort-ascending',
    'sort-descending',
    'eye',
    'eye-off',
    'bug-outline',
    'help-circle',
    'email',
    'phone',
    'web',
    'dots-vertical',
    'dots-horizontal',
    'arrow-left',
    'arrow-right',
    'chevron-down',
    'chevron-up',
  ];

  return validIcons.includes(name as AppIconName);
}

export default AppIcon;
