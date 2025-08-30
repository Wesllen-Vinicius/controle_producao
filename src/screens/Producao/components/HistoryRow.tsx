// src/screens/Producao/components/HistoryRow.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import SkeletonList from '../../../components/SkeletonList';
import { useTheme } from '../../../state/ThemeProvider';
import { Production, SummaryItem } from '../types';
import { getProgressColor, labelForYMD } from '../utils';

type Props = {
  item: Production;
  cache: Record<string, SummaryItem[] | undefined>;
  loadItems: (id: string) => void;
};

const HistoryRow = memo(({ item, cache, loadItems }: Props) => {
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const rot = useRef(new Animated.Value(0)).current;
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  useEffect(() => {
    Animated.spring(rot, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  }, [open, rot]);

  useEffect(() => {
    if (open && cache[item.id] === undefined) {
      loadItems(item.id);
    }
  }, [open, cache, item.id, loadItems]);

  const onToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  }, []);

  const list = cache[item.id];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        android_ripple={{ color: colors.line }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 }}>
            {labelForYMD(item.prod_date)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{item.abate} animais</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.muted} />
        </Animated.View>
      </Pressable>

      {open && (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.lg,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.line,
            backgroundColor: colors.background,
          }}
        >
          {list === undefined ? (
            <SkeletonList rows={2} height={30} />
          ) : list.length === 0 ? (
            <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg }}>
              Sem produtos registrados
            </Text>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {list.map((pi: SummaryItem) => {
                const progress = pi.meta > 0 ? Math.max(0, Math.min(1, pi.produced / pi.meta)) : 0;
                const isUN = String(pi.unit).toUpperCase() === 'UN';
                const fmt = (n: number) => (isUN ? Math.round(n).toString() : n.toFixed(1));
                const progressColor = getProgressColor(progress, colors);

                return (
                  <View
                    key={`${item.id}-${pi.product_id}`}
                    style={{
                      backgroundColor: colors.surface,
                      padding: spacing.md,
                      borderRadius: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: progressColor,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: spacing.sm,
                      }}
                    >
                      <Text style={{ fontWeight: '600', color: colors.text, fontSize: 15 }}>
                        {pi.product_name}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: progressColor }}>
                        {Math.round(progress * 100)}%
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>
                          PRODUZIDO
                        </Text>
                        <Text style={{ color: colors.success, fontSize: 14, fontWeight: '700' }}>
                          {fmt(pi.produced)} {pi.unit}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>
                          META
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                          {fmt(pi.meta)} {pi.unit}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>
                          MÉDIA/ANIMAL
                        </Text>
                        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
                          {fmt(pi.media)} {pi.unit}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

export default HistoryRow;

HistoryRow.displayName = 'HistoryRow';
