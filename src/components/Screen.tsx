// components/Screen.tsx
import React from 'react';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '../state/ThemeProvider';

type Props = {
  children: React.ReactNode;
  /** aplica paddings verticais e horizontais padrão do app */
  padded?: boolean;
  /** usa ScrollView para permitir rolagem; default true */
  scroll?: boolean;
  /** nós extras no final do conteúdo (ex.: botões fixos no fim da página) */
  footer?: React.ReactNode;
  /** largura máxima do conteúdo centralizado (default 760) */
  maxContentWidth?: number;
  /** edges da SafeArea; default ['top','left','right'] para não colidir com tab bar */
  edges?: Edge[];
  /** offset do teclado no iOS (se tiver header custom) */
  keyboardVerticalOffset?: number;
};

export default function Screen({
  children,
  padded = true,
  scroll = true,
  footer,
  maxContentWidth = 760,
  edges = ['top', 'left', 'right'],
  keyboardVerticalOffset = 0,
}: Props) {
  const { colors, spacing } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // paddings responsivos (mantém padrão lateral do app)
  const horizontal = width >= 480 ? spacing.lg : spacing.md;
  const padH = padded ? horizontal : 0;
  
  // Padding top responsivo baseado no safe area e altura da tela
  const dynamicTopPadding = Math.max(spacing.lg, insets.top * 0.5);
  const padTop = padded ? dynamicTopPadding : 0;
  
  // Padding bottom responsivo 
  const dynamicBottomPadding = Math.max(spacing.xl, insets.bottom + spacing.lg);
  const padBottom = padded ? dynamicBottomPadding : 0;
  
  const contentWidth = Math.min(width, maxContentWidth);

  // IMPORTANTE:
  // - Quando scroll={false} usamos View puro para não aninhar VirtualizedList.
  const Container = scroll ? ScrollView : View;

  // props específicos quando há ScrollView
  const scrollProps = scroll
    ? {
        keyboardShouldPersistTaps: 'handled' as const,
        contentInsetAdjustmentBehavior: 'automatic' as const, // iOS
        showsVerticalScrollIndicator: false,
        overScrollMode: 'never' as const, // Android: sem glow/overscroll
        // centraliza o "miolo" e aplica padding lateral
        contentContainerStyle: [
          styles.scrollContent,
          { alignItems: 'center', paddingHorizontal: padH },
        ],
      }
    : {
        // View "seca", flex:1 — NÃO usa ScrollView (evita nested lists)
        style: [styles.viewContent, { alignItems: 'center', paddingHorizontal: padH }],
      };

  // Keyboard offset responsivo
  const responsiveKeyboardOffset = keyboardVerticalOffset || (Platform.OS === 'ios' ? insets.top : 0);

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        // iOS: padding; Android: height (pan/resize é configurável no app.json)
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={responsiveKeyboardOffset}
        style={styles.flex}
      >
        <Container {...(scrollProps as any)}>
          <View
            style={[
              styles.body,
              {
                width: contentWidth,
                paddingTop: padTop,
                paddingBottom: padBottom,
              },
            ]}
          >
            {children}
            {footer}
          </View>
        </Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  body: { flexGrow: 1 },
  viewContent: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
