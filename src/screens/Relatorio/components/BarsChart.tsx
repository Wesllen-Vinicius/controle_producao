import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../../components/ui/EmptyState';
import { useTheme } from '../../../state/ThemeProvider';
import { ChartSeriesData } from '../types';
import { formatNumber } from '../utils';

const Bar = React.memo(({ prodH, metaH, colorProd, colorMeta }: { prodH: number; metaH: number; colorProd: string; colorMeta: string; }) => {
    const prodAnim = useRef(new Animated.Value(0)).current;
    const metaAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(prodAnim, { toValue: Math.max(0, prodH), useNativeDriver: false, stiffness: 150, damping: 15, mass: 0.8 }),
            Animated.spring(metaAnim, { toValue: Math.max(0, metaH), useNativeDriver: false, stiffness: 150, damping: 15, mass: 0.8 }),
        ]).start();
    }, [prodH, metaH, prodAnim, metaAnim]);

    return (
      <View style={styles.barGroup}>
        <Animated.View style={[styles.bar, { height: prodAnim, backgroundColor: colorProd }]} />
        <Animated.View style={[styles.bar, { height: metaAnim, backgroundColor: colorMeta, opacity: 0.6 }]} />
      </View>
    );
});

export function BarsChart({ data, unit, maxBars = 12 }: { data: ChartSeriesData[]; unit: string; maxBars?: number; }) {
  const { colors, spacing, radius } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const slicedData = useMemo(() => data.slice(0, maxBars).reverse(), [data, maxBars]);
  const maxValue = useMemo(() => Math.max(1, ...slicedData.flatMap(d => [d.produced, d.meta])), [slicedData]);

  const chartHeight = 120;

  if (slicedData.length === 0) {
    return <EmptyState title="Sem dados para o gráfico" compact />;
  }

  const activeData = activeIndex !== null ? slicedData[activeIndex] : null;

  return (
    <View style={{ gap: spacing.sm }}>
        <View style={styles.legendContainer}>
            <View style={styles.legendItem}><View style={[styles.legendIndicator, {backgroundColor: colors.success}]} /><Text style={[styles.legendText, {color: colors.text}]}>Produzido</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendIndicator, {backgroundColor: colors.muted, opacity: 0.6}]} /><Text style={[styles.legendText, {color: colors.text}]}>Meta</Text></View>
        </View>

        <View>
            <Pressable onPress={() => setActiveIndex(null)} style={[styles.chartContainer, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, height: chartHeight }]}>
                {slicedData.map((d, idx) => {
                    const prodHeight = (d.produced / maxValue) * chartHeight;
                    const metaHeight = (d.meta / maxValue) * chartHeight;
                    return (
                        <Pressable key={d.label} onPress={() => setActiveIndex(idx === activeIndex ? null : idx)} style={styles.pressableBar}
                            accessibilityLabel={`Dia ${d.label.slice(-2)}, Produzido: ${d.produced}, Meta: ${d.meta}`}>
                            <Bar prodH={prodHeight} metaH={metaHeight} colorProd={colors.success} colorMeta={colors.muted} />
                        </Pressable>
                    )
                })}
            </Pressable>
            {activeData && (
                <View style={[styles.tooltip, { backgroundColor: colors.surface, shadowColor: colors.shadow, left: `${(100 / slicedData.length) * (activeIndex ?? 0)}%`, marginLeft: `${(100/slicedData.length)/2}%` }]} pointerEvents="none">
                    <Text style={[styles.tooltipDate, {color: colors.primary}]}>Dia {activeData.label.slice(-2)}</Text>
                    <Text style={[styles.tooltipText, {color: colors.success}]}>Prod: <Text style={{fontWeight: 'bold'}}>{formatNumber(activeData.produced, 0)}</Text></Text>
                    <Text style={[styles.tooltipText, {color: colors.muted}]}>Meta: <Text style={{fontWeight: 'bold'}}>{formatNumber(activeData.meta, 0)}</Text></Text>
                </View>
            )}
        </View>

        <View style={styles.labelsContainer}>
            {slicedData.map(d => <Text key={d.label} style={[styles.axisLabel, {color: colors.muted}]}>{d.label.slice(-2)}</Text>)}
        </View>

        <Text style={[styles.unitText, {color: colors.muted}]}>Valores em {unit.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
    barGroup: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingHorizontal: 2 },
    bar: { flex: 1, borderRadius: 3, minHeight: 2 },
    legendContainer: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendIndicator: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, fontWeight: '600' },
    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', width: '100%' },
    pressableBar: { flex: 1, height: '100%', justifyContent: 'flex-end' },
    tooltip: { position: 'absolute', top: -50, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#eee', elevation: 3, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, transform: [{translateX: -40}]},
    tooltipDate: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
    tooltipText: { fontSize: 11 },
    labelsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
    axisLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center'},
    unitText: { fontSize: 10, textAlign: 'right', fontWeight: '500', opacity: 0.8 },
});
