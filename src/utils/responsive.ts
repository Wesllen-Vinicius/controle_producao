import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Breakpoints baseados em Material Design
export const BREAKPOINTS = {
  xs: 0, // Phone portrait
  sm: 600, // Phone landscape / Small tablet portrait
  md: 960, // Tablet portrait
  lg: 1280, // Tablet landscape / Small desktop
  xl: 1920, // Desktop
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// Type for CSS dimension values (numbers or percentage/pixel strings)
export type DimensionValue = number | string;

// Detectar tipo de device
export const getDeviceType = () => {
  if (width < BREAKPOINTS.sm) return 'phone';
  if (width < BREAKPOINTS.md) return 'small-tablet';
  if (width < BREAKPOINTS.lg) return 'tablet';
  return 'desktop';
};

// Verificar se é tablet
export const isTablet = () => {
  const deviceType = getDeviceType();
  return deviceType === 'small-tablet' || deviceType === 'tablet';
};

// Verificar orientação
export const isLandscape = () => width > height;

// Responsive values
export function responsive<T>(values: { xs?: T; sm?: T; md?: T; lg?: T; xl?: T; default: T }): T {
  const currentWidth = width;

  if (currentWidth >= BREAKPOINTS.xl && values.xl !== undefined) return values.xl;
  if (currentWidth >= BREAKPOINTS.lg && values.lg !== undefined) return values.lg;
  if (currentWidth >= BREAKPOINTS.md && values.md !== undefined) return values.md;
  if (currentWidth >= BREAKPOINTS.sm && values.sm !== undefined) return values.sm;
  if (values.xs !== undefined) return values.xs;

  return values.default;
}

// Spacing responsivo
export const getResponsiveSpacing = (base: number) => {
  return responsive({
    xs: base,
    sm: base * 1.2,
    md: base * 1.5,
    lg: base * 1.8,
    default: base,
  });
};

// Font size responsivo
export const getResponsiveFontSize = (base: number) => {
  return responsive({
    xs: base,
    sm: base * 1.1,
    md: base * 1.2,
    lg: base * 1.3,
    default: base,
  });
};

// Layout configurations
export const getLayoutConfig = () => {
  const landscape = isLandscape();

  return {
    // Número de colunas para grids
    columns: responsive({
      xs: 1,
      sm: landscape ? 2 : 1,
      md: 2,
      lg: landscape ? 3 : 2,
      xl: 4,
      default: 1,
    }),

    // Padding das telas
    screenPadding: responsive({
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      default: 16,
    }),

    // Largura máxima do conteúdo
    maxContentWidth: responsive<DimensionValue>({
      xs: '100%',
      sm: '100%',
      md: '800px',
      lg: '1200px',
      xl: '1400px',
      default: '100%',
    }),

    // Tab bar height
    tabBarHeight: responsive({
      xs: Platform.OS === 'ios' ? 90 : 65,
      sm: 70,
      md: 80,
      lg: 90,
      default: Platform.OS === 'ios' ? 90 : 65,
    }),

    // Header height
    headerHeight: responsive({
      xs: 56,
      sm: 64,
      md: 72,
      lg: 80,
      default: 56,
    }),

    // Modal/Sheet sizing
    modalWidth: responsive<DimensionValue>({
      xs: '95%',
      sm: '90%',
      md: '70%',
      lg: '60%',
      xl: '50%',
      default: '95%',
    }),

    // Card min/max widths para prevenir cards muito largos
    cardMinWidth: responsive({
      xs: 280,
      sm: 320,
      md: 350,
      lg: 400,
      default: 280,
    }),

    cardMaxWidth: responsive<DimensionValue>({
      xs: '100%',
      sm: '500px',
      md: '600px',
      lg: '700px',
      default: '100%',
    }),
  };
};

// Hook para usar configurações responsivas
export const useResponsive = () => {
  const deviceType = getDeviceType();
  const isTabletDevice = isTablet();
  const landscapeMode = isLandscape();
  const layoutConfig = getLayoutConfig();

  return {
    deviceType,
    isTablet: isTabletDevice,
    isLandscape: landscapeMode,
    width,
    height,
    ...layoutConfig,

    // Helpers
    responsive,
    getResponsiveSpacing,
    getResponsiveFontSize,
  };
};

export default useResponsive;
