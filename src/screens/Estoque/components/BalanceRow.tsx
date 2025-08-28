// src/screens/Estoque/components/BalanceRow.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo, useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Card from '../../../components/ui/Card';
import { useTheme } from '../../../state/ThemeProvider';
import { formatQuantity, isUnitType, timeAgo } from '../utils';

interface BalanceRowProps {
  name: string;
  unit: string | null | undefined;
  value: number;
  max: number;
  updatedAt: string;
  todayDelta: number;
  onPress: () => void;
}

const BalanceRow = memo(function BalanceRow({ name, unit, value, max, updatedAt, todayDelta, onPress }: BalanceRowProps) {
    const { colors, radius, typography, spacing } = useTheme();
    const anim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, Math.abs(value) / max));
        Animated.parallel([
            Animated.spring(anim, { toValue: pct, useNativeDriver: false, stiffness: 160, damping: 18, mass: 0.8 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ]).start();
    }, [value, max, anim, fadeAnim]);

    const qtyStr = formatQuantity(unit, value);
    const neg = value < 0;
    const lowThreshold = isUnitType(unit) ? 10 : Math.max(2, max * 0.05);
    const low = value > 0 && value <= lowThreshold;
    const hasDelta = typeof todayDelta === 'number' && !Number.isNaN(todayDelta) && todayDelta !== 0;
    const up = (todayDelta ?? 0) > 0;
    const down = (todayDelta ?? 0) < 0;
    const deltaColor = up ? colors.success : down ? colors.danger : colors.muted;
    const deltaText = hasDelta ? `${up ? '↗' : '↘'} ${formatQuantity(unit, Math.abs(todayDelta!))}` : '';

    const statusColor = neg ? colors.danger : low ? '#FF8C00' : colors.success;
    const statusIcon = neg ? 'alert-circle' : low ? 'alert' : 'check-circle';

    return (
        <Pressable onPress={onPress} style={{ marginBottom: spacing.sm }}>
            <Animated.View style={{ opacity: fadeAnim }}>
                <Card
                    variant="filled"
                    elevationLevel={1}
                    padding="md"
                    contentStyle={{ gap: spacing.sm }}
                    style={{ borderLeftWidth: 4, borderLeftColor: statusColor, backgroundColor: colors.surface }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <MaterialCommunityIcons name={statusIcon as any} size={20} color={statusColor} />
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h2, { fontSize: 16, color: colors.text }]} numberOfLines={1}>{name}</Text>
                            {unit && <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>Unidade: {unit.toUpperCase()}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            {!!updatedAt && <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '500' }}>{timeAgo(updatedAt)}</Text>}
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <View>
                            <Text style={{ fontWeight: '900', fontSize: 28, color: statusColor, letterSpacing: -0.5 }}>{qtyStr}</Text>
                            {neg && <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: -2 }}>ESTOQUE NEGATIVO</Text>}
                            {low && !neg && <Text style={{ color: '#FF8C00', fontSize: 11, fontWeight: '700', marginTop: -2 }}>ESTOQUE BAIXO</Text>}
                        </View>
                        {hasDelta && (
                            <View style={{ backgroundColor: deltaColor + '20', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: deltaColor + '30' }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: deltaColor }}>{deltaText} hoje</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, overflow: 'hidden', marginTop: spacing.xs }}>
                        <Animated.View style={{ height: '100%', backgroundColor: statusColor + '80', width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), borderRadius: radius.sm }} />
                    </View>
                </Card>
            </Animated.View>
        </Pressable>
    );
});

export default BalanceRow;
