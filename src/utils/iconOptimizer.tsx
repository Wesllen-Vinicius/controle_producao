// Centralizando importações de ícones para otimizar bundle
import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Definindo apenas os ícones que realmente usamos no app
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
  | 'edit'
  | 'save'
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
  | 'search'
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
  style?: any;
}

// Componente otimizado que só renderiza ícones que existem
export function AppIcon({ name, size = 24, color, style }: IconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={style}
    />
  );
}

// Helper para verificar se um ícone existe
export function isValidIconName(name: string): name is AppIconName {
  const validIcons: AppIconName[] = [
    'factory', 'warehouse', 'account-circle', 'cog-outline', 'chart-box-outline',
    'plus', 'filter', 'refresh', 'download', 'upload', 'delete', 'edit', 'save', 'cancel',
    'check-circle', 'alert-circle', 'alert', 'information', 'check', 'close',
    'history', 'calendar', 'search', 'sort-ascending', 'sort-descending', 'eye', 'eye-off',
    'bug-outline', 'help-circle', 'email', 'phone', 'web',
    'dots-vertical', 'dots-horizontal', 'arrow-left', 'arrow-right', 'chevron-down', 'chevron-up'
  ];
  
  return validIcons.includes(name as AppIconName);
}

export default AppIcon;