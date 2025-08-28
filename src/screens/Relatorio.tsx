// screens/AdminProductionsReportScreen.tsx
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';

import Screen from '../components/Screen';
import SkeletonList from '../components/SkeletonList';
import BottomSheet from '../components/ui/BottomSheet';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';

import { useHaptics } from '../hooks/useHaptics';
import { usePerformanceOptimization } from '../hooks/usePerformanceOptimization';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useTheme } from '../state/ThemeProvider';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

/** ===================== Tipos ===================== */
type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'PC' | string;
type Product = { id: string; name: string; unit: Unit };
type Production = { id: string; prod_date: string; abate: number };
type Item = {
  id: string;
  production_id: string;
  product_id: string;
  produced: number;
  meta: number;
  diff: number;
  avg: number;
};
type DayTotals = { date: string; abate: number; produced: number; meta: number; diff: number };

/** ===================== Datas ===================== */
const ONE_DAY = 86400000;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const parseISODate = (s?: string) => {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (n: number | null | undefined, dec = 2) => String(Number(n ?? 0).toFixed(dec));

/** ===================== DateField ===================== */
const DateField = React.memo(function DateField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [show, setShow] = useState(false);

  const onChangePicker = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (date) onChange(toISODate(date));
  };

  const iosInline = Platform.OS === 'ios' && typeof Platform.Version === 'number' && Platform.Version >= 14;

  return (
    <View style={{ gap: spacing.xs }}>
      {!!label && <Text style={[typography.label, { fontWeight: '600', fontSize: 12, color: colors.text }]}>{label}</Text>}
      <Pressable
        onPress={() => setShow(true)}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderColor: colors.line,
          borderWidth: 1,
          height: 48,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
          flexDirection: 'row',
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow || '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
            },
            android: {
              elevation: 1,
            },
          }),
        }}
      >
        <MaterialCommunityIcons name="calendar-blank" size={18} color={colors.primary} />
        <Text style={{
          color: value ? colors.text : colors.muted,
          marginLeft: spacing.sm,
          fontWeight: '500',
          fontSize: 15
        }}>
          {value || placeholder}
        </Text>
      </Pressable>

      {show && (
        <DateTimePicker
          mode="date"
          value={parseISODate(value || todayStr())}
          display={Platform.OS === 'ios' ? (iosInline ? 'inline' : 'spinner') : 'default'}
          onChange={onChangePicker}
        />
      )}
    </View>
  );
});

/** ===================== Mini gráfico com animações ===================== */
function Bar({ prodH, metaH, colorProd, colorMeta }: {
  prodH: number; metaH: number; colorProd: string; colorMeta: string;
}) {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const prodHeight = Math.max(0, Math.min(200, prodH || 0));
    const metaHeight = Math.max(0, Math.min(200, metaH || 0));

    Animated.stagger(60, [
      Animated.spring(a1, {
        toValue: prodHeight,
        useNativeDriver: false,
        stiffness: 180,
        damping: 12,
        mass: 0.6
      }),
      Animated.spring(a2, {
        toValue: metaHeight,
        useNativeDriver: false,
        stiffness: 180,
        damping: 12,
        mass: 0.6
      })
    ]).start();
  }, [prodH, metaH, a1, a2]);

  return (
    <View style={{ flex: 1, alignItems: 'stretch', justifyContent: 'flex-end', paddingHorizontal: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
        <Animated.View style={{
          flex: 1,
          height: a1,
          backgroundColor: colorProd || '#22c55e',
          borderRadius: 3,
          minHeight: 2
        }} />
        <Animated.View style={{
          flex: 1,
          height: a2,
          backgroundColor: colorMeta || '#6b7280',
          borderRadius: 3,
          opacity: 0.7,
          minHeight: 2
        }} />
      </View>
    </View>
  );
}

const BarsChart = React.memo(function BarsChart({
  data, unit, maxBars = 12,
}: {
  data: { label: string; produced: number; meta: number }[];
  unit: string;
  maxBars?: number;
}) {
  const { colors, spacing, radius } = useTheme();
  const sliced = data.slice(-maxBars);
  const maxVal = Math.max(1, ...sliced.flatMap((d) => [d.produced, d.meta]));

  if (!sliced.length) {
    return (
      <View style={{
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.sm,
        padding: spacing.lg,
      }}>
        <MaterialCommunityIcons name="chart-line" size={32} color={colors.muted} />
        <Text style={{
          color: colors.muted,
          fontSize: 14,
          fontWeight: '500',
          textAlign: 'center',
          marginTop: spacing.sm
        }}>
          Sem dados para exibir no gráfico
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Produzido</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.muted, opacity: 0.7 }} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Meta</Text>
        </View>
      </View>

      <View style={{
        height: 120,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 1,
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.sm,
        padding: spacing.sm,
      }}>
        {sliced.map((d, idx) => {
          const prodH = Math.max(2, ((d?.produced || 0) / maxVal) * 100);
          const metaH = Math.max(2, ((d?.meta || 0) / maxVal) * 100);
          return (
            <Bar
              key={`${d.label}-${idx}`}
              prodH={prodH}
              metaH={metaH}
              colorProd={colors.success}
              colorMeta={colors.muted}
            />
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {sliced.map((d, idx) => (
          <Text key={`label-${d.label}-${idx}`} style={{
            color: colors.muted,
            fontSize: 9,
            width: 20,
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {d?.label ? String(d.label).slice(-2) : ''}
          </Text>
        ))}
      </View>

      <Text style={{
        color: colors.muted,
        fontSize: 10,
        textAlign: 'right',
        fontWeight: '500'
      }}>
        Valores em {String(unit || 'UN').toUpperCase()}
      </Text>
    </View>
  );
});

/** ===================== Sheet wrapper ===================== */
const Sheet = React.memo(function Sheet({
  open, onClose, title, subtitle, children,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode;
}) {
  const { colors, spacing } = useTheme();

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {subtitle && (
        <Text style={{
          color: colors.muted,
          fontSize: 14,
          fontWeight: '500',
          marginBottom: spacing.md,
          paddingHorizontal: spacing.md
        }}>
          {subtitle}
        </Text>
      )}
      {children}
    </BottomSheet>
  );
});

/** ===================== Day row melhorado ===================== */
const DayRow = React.memo(function DayRow({
  item, hasProductFilter, colors, spacing, typography,
}: {
  item: DayTotals; hasProductFilter: boolean; colors: any; spacing: any; typography: any;
}) {
  const progress = item.meta > 0 ? Math.min(1, Math.max(0, item.produced / item.meta)) : 0;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      stiffness: 120,
      damping: 12,
    }).start();
  }, [progress]);

  const labelForDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dateStr === today.toISOString().slice(0, 10)) return 'Hoje';
    if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Ontem';
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: progress >= 0.8 ? colors.success : progress >= 0.6 ? '#FF8C00' : colors.danger,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow || '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
          {labelForDate(item.date)}
        </Text>
        <View style={{
          backgroundColor: colors.primary + '10',
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4
        }}>
          <MaterialCommunityIcons name="cow" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
            {String(item.abate || 0)}
          </Text>
        </View>
      </View>

      {hasProductFilter ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <View>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>PRODUZIDO</Text>
              <Text style={{ color: colors.success, fontSize: 14, fontWeight: '700' }}>
                {fmt(item.produced)}
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>META</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                {fmt(item.meta)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>
                {item.diff >= 0 ? 'EXCESSO' : 'DÉFICIT'}
              </Text>
              <Text style={{
                color: item.diff >= 0 ? colors.success : colors.danger,
                fontSize: 14,
                fontWeight: '700'
              }}>
                {fmt(Math.abs(item.diff))}
              </Text>
            </View>
          </View>

          <View style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: 6,
            overflow: 'hidden',
            height: 6,
            marginBottom: spacing.xs
          }}>
            <Animated.View style={{
              height: '100%',
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              backgroundColor: progress >= 0.8 ? colors.success : progress >= 0.6 ? '#FF8C00' : colors.danger,
            }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '500' }}>
              Eficiência da Produção
            </Text>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: progress >= 0.8 ? colors.success : progress >= 0.6 ? '#FF8C00' : colors.danger,
            }}>
              {Math.round((progress || 0) * 100)}%
            </Text>
          </View>
        </>
      ) : (
        <View style={{
          backgroundColor: colors.accent + '10',
          padding: spacing.sm,
          borderRadius: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm
        }}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.accent} />
          <Text style={{ color: colors.accent, fontWeight: '500', flex: 1, fontSize: 13 }}>
            Selecione produtos para ver métricas detalhadas
          </Text>
        </View>
      )}
    </View>
  );
});

/** ===================== Tile de Totais por Produto melhorado ===================== */
const ProductTotalTile = React.memo(function ProductTotalTile({
  name, unit, produced, meta, diff,
}: {
  name: string; unit: string; produced: number; meta: number; diff: number;
}) {
  const { colors, spacing } = useTheme();
  const progress = meta > 0 ? Math.min(1, Math.max(0, produced / meta)) : 0;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      stiffness: 120,
      damping: 15,
    }).start();
  }, [progress]);

  const isUN = String(unit).toUpperCase() === 'UN';
  const fmtValue = (n: number) => (isUN ? Math.round(n).toString() : n.toFixed(1));

  return (
    <View style={{
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: progress >= 0.8 ? colors.success : progress >= 0.5 ? '#FF8C00' : colors.danger,
      minHeight: 130,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow || '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    }}>
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 4,
          lineHeight: 18,
        }} numberOfLines={2}>
          {name}
        </Text>
        <View style={{
          backgroundColor: colors.primary + '10',
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
          borderRadius: 6,
          alignSelf: 'flex-start'
        }}>
          <Text style={{
            color: colors.primary,
            fontWeight: '600',
            fontSize: 10,
          }}>
            {String(unit || 'UN').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{
        backgroundColor: colors.surfaceAlt,
        borderRadius: 6,
        overflow: 'hidden',
        height: 6,
        marginBottom: spacing.sm
      }}>
        <Animated.View style={{
          height: '100%',
          width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp',
          }),
          backgroundColor: progress >= 0.8 ? colors.success : progress >= 0.5 ? '#FF8C00' : colors.danger,
        }} />
      </View>

      <View style={{ gap: spacing.xs }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text style={{
            fontSize: 11,
            color: colors.muted,
            fontWeight: '600'
          }}>
            Produzido: {fmtValue(produced)} / {fmtValue(meta)} {unit}
          </Text>
          <Text style={{
            fontSize: 11,
            fontWeight: '600',
            color: progress >= 0.8 ? colors.success : progress >= 0.5 ? '#FF8C00' : colors.danger
          }}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text style={{
            fontSize: 11,
            color: colors.muted,
            fontWeight: '500'
          }}>
            {diff >= 0 ? 'Excesso' : 'Déficit'}
          </Text>
          <Text style={{
            fontSize: 11,
            color: diff >= 0 ? colors.success : colors.danger,
            fontWeight: '600'
          }}>
            {fmtValue(Math.abs(diff))} {unit}
          </Text>
        </View>
      </View>
    </View>
  );
});

/** ===================== Tela Principal ===================== */
export default function AdminProductionsReportScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { colors, spacing, typography, radius, theme } = useTheme();
  const { width } = useWindowDimensions();
  const h = useHaptics();
  const { runAfterInteractions, isAppActive } = usePerformanceOptimization();

  // Estados de animação
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Layout mais compacto similar ao Twitter/X
  const CONTENT_PADDING = spacing.md;
  const GAP = spacing.xs;
  const tileW = Math.max(140, Math.floor((width - CONTENT_PADDING * 2 - GAP) / 2));

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [products, setProducts] = useState<Product[] | null>(null);

  // multiseleção + filtros extras
  const [prodFilters, setProdFilters] = useState<string[]>([]);
  const [unitFilter, setUnitFilter] = useState<Unit | 'ALL'>('ALL');
  const [barCount, setBarCount] = useState<7 | 12 | 30>(12);
  const [sortTotals, setSortTotals] = useState<'produced' | 'compliance' | 'name'>('produced');

  const [sortOpen, setSortOpen] = useState(false);
  const [productions, setProductions] = useState<Production[] | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // export
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFmt, setExportFmt] = useState<'csv' | 'json' | 'pdf'>('csv');

  // Animação de entrada
  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 150,
        damping: 15,
      })
    ]).start();
  }, []);

  // datas padrão
  useEffect(() => {
    if (!from && !to) {
      const now = Date.now();
      setFrom(toISODate(new Date(now - 30 * ONE_DAY)));
      setTo(todayStr());
    }
  }, [from, to]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    section: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    headerSection: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      marginBottom: spacing.md,
    },
    compactCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.line,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow || '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
  }), [spacing, colors]);

  const loadProducts = useCallback(async () => {
    if (!isAppActive()) return;

    const { data, error } = await supabase.from('products').select('id,name,unit').order('name');
    if (error) {
      h.error();
      Alert.alert('Erro', error.message);
      return;
    }
    setProducts((data as Product[]) || []);
  }, [h, isAppActive]);

  const loadData = useCallback(async () => {
    if (!isAppActive()) return;

    setProductions(null);
    setItems(null);

    try {
      let q = supabase
        .from('productions')
        .select('id,prod_date,abate')
        .order('prod_date', { ascending: false })
        .limit(1000);

      if (from) q = q.gte('prod_date', from);
      if (to) q = q.lte('prod_date', to);

      const { data: prods, error: e1 } = await q;
      if (e1) {
        h.error();
        const errorMsg = e1.message.includes('permission')
          ? 'Acesso negado. Verifique suas permissões.'
          : e1.message.includes('network')
          ? 'Erro de conexão. Verifique sua internet.'
          : `Erro ao carregar dados: ${e1.message}`;
        Alert.alert('Erro', errorMsg);
        return;
      }

      const list = (prods as Production[]) || [];
      setProductions(list);

      if (list.length === 0) {
        setItems([]);
        return;
      }

      if (list.length > 500) {
        Alert.alert(
          'Muitos dados',
          'Foram encontrados mais de 500 registros. Para melhor performance, considere filtrar por um período menor.'
        );
      }

      const ids = list.map((p) => p.id);
      const batchSize = 100;
      const allItems: Item[] = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { data: its, error: e2 } = await supabase
          .from('production_items')
          .select('id,production_id,product_id,produced,meta,diff,avg')
          .in('production_id', batch);

        if (e2) {
          h.error();
          Alert.alert('Erro', `Falha ao carregar items: ${e2.message}`);
          return;
        }

        allItems.push(...((its as Item[]) || []));
      }

      setItems(allItems);
      h.success();
    } catch (error: any) {
      h.error();
      Alert.alert('Erro inesperado', error?.message || 'Falha ao carregar dados');
    }
  }, [from, to, h, isAppActive]);

  useEffect(() => {
    if (isAdmin) {
      loadProducts();
      loadData();
    }
  }, [isAdmin, loadData, loadProducts]);

  const onRefresh = useCallback(async () => {
    if (!isAppActive()) return;

    setRefreshing(true);
    h.light();
    await Promise.all([loadProducts(), loadData()]);
    setRefreshing(false);
  }, [loadProducts, loadData, h, isAppActive]);

  const productsById = useMemo(() => {
    const map: Record<string, Product> = {};
    (products || []).forEach((p) => (map[p.id] = p));
    return map;
  }, [products]);

  const hasProductFilter = prodFilters.length > 0;

  // unidades disponíveis dentre os selecionados
  const unitsAvailable: Unit[] = useMemo(() => {
    if (!products) return [];
    const set = new Set<Unit>();
    for (const id of prodFilters) {
      const u = productsById[id]?.unit as Unit | undefined;
      if (u) set.add(u);
    }
    return Array.from(set);
  }, [prodFilters, products, productsById]);

  // seleção efetiva respeitando unitFilter
  const effectiveProductIds = useMemo(() => {
    if (!hasProductFilter) return [];
    if (unitFilter === 'ALL') return prodFilters;
    return prodFilters.filter((id) => String(productsById[id]?.unit) === String(unitFilter));
  }, [hasProductFilter, prodFilters, unitFilter, productsById]);

  // unidade do gráfico
  const chartUnit = useMemo(() => {
    if (!hasProductFilter) return 'UN';
    const set = new Set(effectiveProductIds.map((id) => productsById[id]?.unit));
    return set.size === 1 ? (Array.from(set)[0] as string) : 'Misto';
  }, [hasProductFilter, effectiveProductIds, productsById]);

  // Série do gráfico
  const chartSeries = useMemo(() => {
    if (!hasProductFilter || !items || !productions) return [];
    const picked = new Set(effectiveProductIds);
    const perDay: Record<string, { produced: number; meta: number }> = {};
    for (const p of productions) perDay[p.prod_date] = perDay[p.prod_date] || { produced: 0, meta: 0 };
    for (const it of items) {
      if (!picked.has(it.product_id)) continue;
      const prod = productions.find((p) => p.id === it.production_id);
      if (!prod) continue;
      perDay[prod.prod_date].produced += it.produced;
      perDay[prod.prod_date].meta += it.meta;
    }
    return Object.entries(perDay)
      .map(([date, v]) => ({ label: date, produced: v.produced, meta: v.meta }))
      .sort((a, b) => (a.label < b.label ? 1 : -1));
  }, [items, productions, hasProductFilter, effectiveProductIds]);

  // Agregação por dia
  const days: DayTotals[] = useMemo(() => {
    if (!productions || !items) return [];
    const byDay = new Map<string, DayTotals>();

    for (const p of productions) {
      if (!byDay.has(p.prod_date)) byDay.set(p.prod_date, { date: p.prod_date, abate: 0, produced: 0, meta: 0, diff: 0 });
      byDay.get(p.prod_date)!.abate += p.abate;
    }

    if (hasProductFilter) {
      const picked = new Set(effectiveProductIds);
      for (const it of items) {
        if (!picked.has(it.product_id)) continue;
        const prod = productions.find((p) => p.id === it.production_id);
        if (!prod) continue;
        const row = byDay.get(prod.prod_date)!;
        row.produced += it.produced;
        row.meta += it.meta;
        row.diff += it.diff;
      }
    }

    return Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [productions, items, hasProductFilter, effectiveProductIds]);

  // Totais (filtro ativo)
  const totals = useMemo(() => {
    if (!hasProductFilter) return null;
    return days.reduce(
      (acc, d) => {
        acc.abate += d.abate;
        acc.produced += d.produced;
        acc.meta += d.meta;
        acc.diff += d.diff;
        return acc;
      },
      { abate: 0, produced: 0, meta: 0, diff: 0 }
    );
  }, [days, hasProductFilter]);

  // Totais por produto (sem filtro) + ordenação
  const totalsPerProduct = useMemo(() => {
    if (!items || !products) return [];
    const map = new Map<
      string,
      { product_id: string; name: string; unit: string; produced: number; meta: number; diff: number }
    >();
    for (const it of items) {
      const p = productsById[it.product_id];
      if (!p) continue;
      if (!map.has(it.product_id)) {
        map.set(it.product_id, {
          product_id: it.product_id,
          name: p.name,
          unit: p.unit,
          produced: 0,
          meta: 0,
          diff: 0,
        });
      }
      const row = map.get(it.product_id)!;
      row.produced += it.produced;
      row.meta += it.meta;
      row.diff += it.diff;
    }
    const out = Array.from(map.values());
    if (sortTotals === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortTotals === 'produced') out.sort((a, b) => b.produced - a.produced);
    else if (sortTotals === 'compliance') {
      const comp = (r: any) => (r.meta > 0 ? r.produced / r.meta : 0);
      out.sort((a, b) => comp(b) - comp(a));
    }
    return out;
  }, [items, products, productsById, sortTotals]);

  function quickRange(k: '7d' | '30d' | 'month') {
    const now = new Date();
    let f = new Date();
    if (k === '7d') f.setDate(now.getDate() - 7);
    if (k === '30d') f.setDate(now.getDate() - 30);
    if (k === 'month') f = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(toISODate(f));
    setTo(toISODate(now));
  }

  /** ===================== Export helpers ===================== */
  const buildCsv = useCallback(() => {
    // Função para formatar números para CSV brasileiro (vírgula decimal)
    const fmtCsv = (n: number | null | undefined, dec = 2) => {
      return String(Number(n ?? 0).toFixed(dec)).replace('.', ',');
    };

    const hasFilter = prodFilters.length > 0;
    if (hasFilter) {
      const rows = [
        'Data;Abate;Produzido;Meta;Diferenca;Cumprimento_%',
        ...(days || []).map((d) => {
          const cumprimento = d.meta > 0 ? (d.produced / d.meta) * 100 : 0;
          const dateFormatted = new Date(d.date).toLocaleDateString('pt-BR');
          return `${dateFormatted};${d.abate};${fmtCsv(d.produced)};${fmtCsv(d.meta)};${fmtCsv(d.diff)};${fmtCsv(cumprimento, 1)}`;
        }),
      ];
      return rows.join('\n');
    }
    const rows = [
      'Produto;Unidade;Produzido;Meta;Diferenca;Cumprimento_%',
      ...(totalsPerProduct || []).map((r) => {
        const cumprimento = r.meta > 0 ? (r.produced / r.meta) * 100 : 0;
        // Escapar nomes de produto que contenham ponto e vírgula
        const escapedName = r.name.replace(/;/g, ',');
        return `${escapedName};${r.unit};${fmtCsv(r.produced)};${fmtCsv(r.meta)};${fmtCsv(r.diff)};${fmtCsv(cumprimento, 1)}`;
      }),
    ];
    return rows.join('\n');
  }, [days, totalsPerProduct, prodFilters.length]);

  const buildJson = useCallback(() => {
    const hasFilter = prodFilters.length > 0;
    if (hasFilter) {
      return JSON.stringify(
        {
          filter_products: effectiveProductIds,
          unit_filter: unitFilter,
          days: (days || []).map((d) => ({
            date: d.date,
            abate: d.abate,
            produced: d.produced,
            meta: d.meta,
            diff: d.diff,
          })),
        },
        null,
        2
      );
    }
    return JSON.stringify(
      {
        totals_per_product: (totalsPerProduct || []).map((r) => ({
          product_id: r.product_id,
          name: r.name,
          unit: r.unit,
          produced: r.produced,
          meta: r.meta,
          diff: r.diff,
        })),
      },
      null,
      2
    );
  }, [days, totalsPerProduct, prodFilters.length, effectiveProductIds, unitFilter]);

  const buildPdfHtml = useCallback(() => {
    const title = 'Relatório de Produções';
    const subtitle =
      prodFilters.length > 0
        ? `Produtos: ${effectiveProductIds.map((id) => productsById[id]?.name || id).join(', ')}`
        : 'Totais por produto';
    const today = new Date().toLocaleString();

    const table =
      prodFilters.length > 0
        ? `
        <table>
          <thead><tr><th>Data</th><th>Abate</th><th>Produzido</th><th>Meta</th><th>Dif.</th><th>Cumpr.%</th></tr></thead>
          <tbody>
            ${(days || [])
              .map((d) => {
                const perc = d.meta > 0 ? Math.round((d.produced / d.meta) * 100) : 0;
                return `<tr>
                  <td>${d.date}</td>
                  <td>${d.abate}</td>
                  <td>${fmt(d.produced)}</td>
                  <td>${fmt(d.meta)}</td>
                  <td>${fmt(d.diff)}</td>
                  <td>${perc}%</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>`
        : `
        <table>
          <thead><tr><th>Produto</th><th>Unid.</th><th>Produzido</th><th>Meta</th><th>Dif.</th><th>Cumpr.%</th></tr></thead>
          <tbody>
            ${(totalsPerProduct || [])
              .map((r) => {
                const perc = r.meta > 0 ? Math.round((r.produced / r.meta) * 100) : 0;
                return `<tr>
                  <td>${r.name}</td>
                  <td>${r.unit}</td>
                  <td>${fmt(r.produced)}</td>
                  <td>${fmt(r.meta)}</td>
                  <td>${fmt(r.diff)}</td>
                  <td>${perc}%</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>`;

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 4px; }
            .muted { color: #666; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f6f6f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="muted">${subtitle} • Gerado em ${today}</div>
          ${table}
        </body>
      </html>`;
  }, [prodFilters.length, effectiveProductIds, productsById, days, totalsPerProduct]);

  const doExport = useCallback(async () => {
    try {
      const timestamp = toISODate(new Date());
      const hasFilters = prodFilters.length > 0;
      const base = `relatorio_producao${hasFilters ? `_filtrado_${effectiveProductIds.length}` : ''}_${timestamp}`;

      if (exportFmt === 'pdf') {
        const html = buildPdfHtml();
        let Print: any = null;
        let Sharing: any = null;

        try {
          Print = require('expo-print');
          Sharing = require('expo-sharing');
        } catch (error) {
          Alert.alert(
            'Módulos necessários',
            'Para exportar PDF, instale os pacotes "expo-print" e "expo-sharing".\n\nExportando como HTML temporariamente...'
          );
          await Share.share({ title: `${base}.html`, message: html });
          setExportOpen(false);
          return;
        }

        if (Print?.printToFileAsync) {
          const { uri } = await Print.printToFileAsync({
            html,
            format: Print.Orientation.portrait,
            margins: { left: 50, right: 50, top: 50, bottom: 50 }
          });

          if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: `${base}.pdf`
            });
          } else {
            await Share.share({
              url: uri,
              title: `${base}.pdf`,
              message: 'Relatório de produção exportado'
            });
          }
        } else {
          throw new Error('Falha ao gerar PDF');
        }

        setExportOpen(false);
        h.success();
        return;
      }

      const payload = exportFmt === 'csv' ? buildCsv() : buildJson();
      const fileSize = Math.round(payload.length / 1024);

      await Share.share({
        title: `${base}.${exportFmt}`,
        message: `${payload}\n\n--- Arquivo ${fileSize}KB gerado em ${new Date().toLocaleString()} ---`
      });

      setExportOpen(false);
      h.success();
    } catch (e: any) {
      h.error();
      const errorMessage = e?.message?.includes('PDF')
        ? 'Falha ao gerar PDF. Tente outro formato.'
        : e?.message ?? 'Falha ao exportar dados. Verifique sua conexão.';
      Alert.alert('Erro ao exportar', errorMessage);
    }
  }, [exportFmt, prodFilters.length, effectiveProductIds.length, buildCsv, buildJson, buildPdfHtml, h]);

  /** ===================== Header melhorado ===================== */
  const ListHeader = useMemo(() => {
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
      >
        {/* Header compacto similar ao Twitter */}
        <View style={styles.headerSection}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm
          }}>
            <View>
              <Text style={[typography.h1, { fontSize: 22, fontWeight: '800', marginBottom: 2 }]}>
                Relatórios
              </Text>
              <Text style={{
                color: colors.muted,
                fontSize: 13,
                fontWeight: '500'
              }}>
                Performance e análises
              </Text>
            </View>

            <Pressable
              style={{
                backgroundColor: colors.primary,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onPress={() => setExportOpen(true)}
            >
              <MaterialCommunityIcons name="download" size={18} color={colors.primaryOn || '#FFFFFF'} />
            </Pressable>
          </View>
        </View>

        {/* Period Selection - estilo mais compacto */}
        <View style={styles.section}>
          <View style={styles.compactCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
              <MaterialCommunityIcons name="calendar-range" size={16} color={colors.primary} />
              <Text style={[typography.h2, { fontSize: 15, fontWeight: '700' }]}>Período</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <DateField label="Início" value={from} onChange={setFrom} />
              </View>
              <View style={{ flex: 1 }}>
                <DateField label="Fim" value={to} onChange={setTo} />
              </View>
            </View>

            <View style={{ marginTop: spacing.sm }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: spacing.md }}
                style={{ flexGrow: 0 }}
              >
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <Chip label="7d" onPress={() => quickRange('7d')} />
                  <Chip label="30d" onPress={() => quickRange('30d')} />
                  <Chip label="Este mês" onPress={() => quickRange('month')} />
                </View>
              </ScrollView>
            </View>

            <View style={{ marginTop: spacing.sm }}>
              <Button
                title="Aplicar"
                onPress={loadData}
                variant="primary"
                small
              />
            </View>
          </View>
        </View>

        {/* Product Filters - layout mais compacto */}
        <View style={styles.section}>
          <View style={styles.compactCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <MaterialCommunityIcons name="filter" size={16} color={colors.primary} />
                <Text style={[typography.h2, { fontSize: 15, fontWeight: '700' }]}>Produtos</Text>
              </View>
              {prodFilters.length > 0 && (
                <View style={{
                  backgroundColor: colors.primary + '15',
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 1,
                  borderRadius: 8
                }}>
                  <Text style={{
                    color: colors.primary,
                    fontSize: 10,
                    fontWeight: '600'
                  }}>
                    {prodFilters.length}
                  </Text>
                </View>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: spacing.md }}
              style={{ flexGrow: 0 }}
            >
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Chip
                  label="Todos"
                  active={prodFilters.length === 0}
                  onPress={() => {
                    setProdFilters([]);
                    setUnitFilter('ALL');
                  }}
                />
                {(products || []).map((p) => {
                  const active = prodFilters.includes(p.id);
                  return (
                    <Chip
                      key={p.id}
                      label={p.name}
                      active={active}
                      onPress={() =>
                        setProdFilters((curr) => (curr.includes(p.id) ? curr.filter((id) => id !== p.id) : [...curr, p.id]))
                      }
                    />
                  );
                })}
              </View>
            </ScrollView>

            {/* Unit Filter - mais compacto */}
            {prodFilters.length > 0 && unitsAvailable.length > 1 && (
              <View style={{ marginTop: spacing.sm }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: spacing.md }}
                  style={{ flexGrow: 0 }}
                >
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <Chip
                      label="Todas"
                      active={unitFilter === 'ALL'}
                      onPress={() => setUnitFilter('ALL')}
                    />
                    {(unitsAvailable || []).map((u) => (
                      <Chip
                        key={u}
                        label={String(u).toUpperCase()}
                        active={unitFilter === u}
                        onPress={() => setUnitFilter(u)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* KPI Dashboard */}
        {totals ? (
          <View style={styles.section}>
            {/* KPI Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: spacing.md
            }}>
              <MaterialCommunityIcons name="chart-box" size={20} color={colors.primary} />
              <Text style={[typography.h2, { fontSize: 16, fontWeight: '700' }]}>
                Indicadores de Performance
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              <View style={{ width: tileW }}>
                <Card
                  style={{
                    backgroundColor: colors.surface,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.primary,
                    minHeight: 80,
                    ...Platform.select({
                      ios: {
                        shadowColor: colors.shadow || '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                      },
                      android: {
                        elevation: 2,
                      },
                    }),
                  }}
                  padding="md"
                  variant="filled"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 }}>ANIMAIS</Text>
                    <MaterialCommunityIcons name="cow" size={16} color={colors.muted} />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary, letterSpacing: -0.5 }}>
                    {String(totals?.abate ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  </Text>
                </Card>
              </View>

              <View style={{ width: tileW }}>
                <Card
                  style={{
                    backgroundColor: colors.surface,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.success,
                    minHeight: 80,
                    ...Platform.select({
                      ios: {
                        shadowColor: colors.shadow || '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                      },
                      android: {
                        elevation: 2,
                      },
                    }),
                  }}
                  padding="md"
                  variant="filled"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 }}>PRODUÇÃO</Text>
                    <MaterialCommunityIcons name="factory" size={16} color={colors.muted} />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.success, letterSpacing: -0.5 }}>
                    {fmt(totals.produced)}
                  </Text>
                </Card>
              </View>

              <View style={{ width: tileW }}>
                <Card
                  style={{
                    backgroundColor: colors.surface,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.accent,
                    minHeight: 80,
                    ...Platform.select({
                      ios: {
                        shadowColor: colors.shadow || '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                      },
                      android: {
                        elevation: 2,
                      },
                    }),
                  }}
                  padding="md"
                  variant="filled"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 }}>META</Text>
                    <MaterialCommunityIcons name="target" size={16} color={colors.muted} />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.accent, letterSpacing: -0.5 }}>
                    {fmt(totals.meta)}
                  </Text>
                </Card>
              </View>

              <View style={{ width: tileW }}>
                <Card
                  style={{
                    backgroundColor: colors.surface,
                    borderLeftWidth: 3,
                    borderLeftColor: totals.diff >= 0 ? colors.success : colors.danger,
                    minHeight: 80,
                    ...Platform.select({
                      ios: {
                        shadowColor: colors.shadow || '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                      },
                      android: {
                        elevation: 2,
                      },
                    }),
                  }}
                  padding="md"
                  variant="filled"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 }}>
                      {totals.diff >= 0 ? 'EXCEDENTE' : 'DÉFICIT'}
                    </Text>
                    <MaterialCommunityIcons
                      name={totals.diff >= 0 ? "trending-up" : "trending-down"}
                      size={16}
                      color={colors.muted}
                    />
                  </View>
                  <Text style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: totals.diff >= 0 ? colors.success : colors.danger,
                    letterSpacing: -0.5
                  }}>
                    {fmt(Math.abs(totals.diff))}
                  </Text>
                </Card>
              </View>

              <View style={{ width: '100%' }}>
                <Card
                  style={{
                    backgroundColor: colors.surface,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.primary,
                    ...Platform.select({
                      ios: {
                        shadowColor: colors.shadow || '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                      },
                      android: {
                        elevation: 2,
                      },
                    }),
                  }}
                  padding="lg"
                  variant="filled"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                      <MaterialCommunityIcons name="chart-line" size={18} color={colors.primary} />
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 0.2, flex: 1 }} numberOfLines={1}>EFICIÊNCIA GERAL</Text>
                    </View>
                    <Text style={{
                      fontSize: 24,
                      fontWeight: '800',
                      color: colors.primary,
                      letterSpacing: -1,
                      minWidth: 70,
                      textAlign: 'right'
                    }}>
                      {String(Math.round((totals?.produced ?? 0) / Math.max(1, totals?.meta ?? 1) * 100))}%
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={{
                    height: 10,
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: 5,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: colors.line,
                    marginBottom: spacing.sm
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((totals?.produced ?? 0) / Math.max(1, totals?.meta ?? 1) * 100))}%`,
                      backgroundColor: colors.primary,
                      borderRadius: 4
                    }} />
                  </View>

                  <Text style={{
                    color: colors.muted,
                    fontSize: 12,
                    textAlign: 'center',
                    fontWeight: '500',
                    letterSpacing: 0.1
                  }}>
                    {(totals?.produced ?? 0) >= (totals?.meta ?? 0) ? '🎉 Meta superada!' :
                     (totals?.produced ?? 0) >= (totals?.meta ?? 0) * 0.9 ? '🔥 Muito próximo da meta' :
                     '⚠️ Abaixo da meta'}
                  </Text>
                </Card>
              </View>
            </View>

            {/* Chart Section - mais compacto */}
            <View style={{ marginTop: spacing.md }}>
              <View style={styles.compactCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <MaterialCommunityIcons name="chart-bar" size={16} color={colors.primary} />
                    <Text style={[typography.h2, { fontSize: 15, fontWeight: '700' }]}>Evolução</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[7, 12, 30].map((n) => (
                      <Chip
                        key={n}
                        label={`${n}d`}
                        active={barCount === n}
                        onPress={() => setBarCount(n as 7 | 12 | 30)}
                      />
                    ))}
                  </View>
                </View>
                {!items ? (
                  <SkeletonList rows={3} />
                ) : chartSeries.length === 0 ? (
                  <EmptyState title="Sem dados no período" compact />
                ) : (
                  <BarsChart
                    data={chartSeries.map((d) => ({ label: d.label, produced: d.produced, meta: d.meta }))}
                    unit={chartUnit}
                    maxBars={barCount}
                  />
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            {/* Toolbar: título + ação Ordenar */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <MaterialCommunityIcons name="view-grid" size={20} color={colors.primary} />
                <Text style={[typography.h2, { fontSize: 16, fontWeight: '700' }]}>Totais por Produto</Text>
              </View>
              <Button
                title="Ordenar"
                variant="tonal"
                onPress={() => setSortOpen(true)}
                leftIcon={<MaterialCommunityIcons name="sort" size={14} color={colors.primary} />}
              />
            </View>

            {!items ? (
              <Card><SkeletonList rows={2} /></Card>
            ) : (totalsPerProduct?.length ?? 0) === 0 ? (
              <EmptyState title="Sem dados no período selecionado" />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                {(totalsPerProduct || []).map((r) => (
                  <View key={r.product_id} style={{ width: tileW }}>
                    <ProductTotalTile
                      name={r.name}
                      unit={r.unit}
                      produced={r.produced}
                      meta={r.meta}
                      diff={r.diff}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Daily Breakdown Section Header */}
        <View style={styles.section}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.md
          }}>
            <MaterialCommunityIcons name="calendar-multiselect" size={20} color={colors.primary} />
            <Text style={[typography.h2, { fontSize: 16, fontWeight: '700' }]}>
              Detalhamento por Dia
            </Text>
          </View>
        </View>
      </Animated.View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    spacing, typography, colors, radius, fadeAnim, slideAnim, styles,
    from, to, loadData, products, prodFilters, unitsAvailable.length, unitFilter,
    totals, items, chartSeries, chartUnit, barCount, totalsPerProduct, tileW, GAP,
  ]);

  /** ===================== Render list ===================== */
  const renderItem: ListRenderItem<DayTotals> = useCallback(
    ({ item }) => (
      <View style={{ paddingHorizontal: CONTENT_PADDING, marginBottom: spacing.sm }}>
        <DayRow
          item={item}
          hasProductFilter={prodFilters.length > 0}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
      </View>
    ),
    [prodFilters.length, colors, spacing, typography, CONTENT_PADDING],
  );

  const keyExtractor = useCallback((d: DayTotals) => d.date, []);
  const ItemSeparator = useCallback(() => <View style={{ height: spacing.xs }} />, [spacing.xs]);

  const perfProps: any = { estimatedItemSize: 160 };

  if (!isAdmin) {
    return (
      <Screen padded edges={['top', 'left', 'right', 'bottom']}>
        <LinearGradient
          colors={[colors.background, colors.surface + '80', colors.background]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.text, textAlign: 'center', fontSize: 16, fontWeight: '600' }}>
              Acesso restrito a administradores.
            </Text>
          </View>
        </LinearGradient>
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.background, colors.surface + '80', colors.background]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

        <FlashList
          {...perfProps}
          data={days}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          ListHeaderComponent={ListHeader}
          bounces
          overScrollMode="always"
          decelerationRate="fast"
          removeClippedSubviews={Platform.OS === 'android'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
              progressViewOffset={Platform.OS === 'android' ? 56 : 0}
            />
          }
          ListEmptyComponent={
            !productions || !items ? (
              <View style={{ paddingHorizontal: CONTENT_PADDING, paddingTop: spacing.lg }}>
                <SkeletonList rows={4} />
              </View>
            ) : (
              <EmptyState title="Sem dados no período selecionado" />
            )
          }
        />

        {/* Export */}
        <Sheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          title="Exportar Relatório"
          subtitle="Escolha o formato do arquivo"
        >
          <View style={{ gap: spacing.md }}>
            <View>
              <Text style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: '600',
                marginBottom: spacing.sm,
                letterSpacing: 0.2
              }}>
                FORMATO DO ARQUIVO
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Chip label="📊 CSV"  active={exportFmt === 'csv'}  onPress={() => setExportFmt('csv')}  />
                <Chip label="📋 JSON" active={exportFmt === 'json'} onPress={() => setExportFmt('json')} />
                <Chip label="📄 PDF"  active={exportFmt === 'pdf'}  onPress={() => setExportFmt('pdf')}  />
              </View>
            </View>

            <View style={{
              backgroundColor: colors.surfaceAlt,
              padding: spacing.md,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.line
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
                <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Conteúdo do Relatório</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 16 }}>
                {prodFilters.length > 0
                  ? 'Exporta a série diária agregada dos produtos selecionados.'
                  : 'Exporta totais por produto no período selecionado.'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Cancelar"
                variant="text"
                onPress={() => setExportOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Exportar"
                onPress={doExport}
                leftIcon={<MaterialCommunityIcons name="download" size={16} color="#FFFFFF" />}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </Sheet>

        {/* Ordenação */}
        <Sheet
          open={sortOpen}
          onClose={() => setSortOpen(false)}
          title="Ordenar Produtos"
          subtitle="Escolha o critério de ordenação"
        >
          <View style={{ gap: spacing.md }}>
            <View>
              <Text style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: '600',
                marginBottom: spacing.sm,
                letterSpacing: 0.2
              }}>
                CRITÉRIO DE ORDENAÇÃO
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Chip
                  label="📈 Maior Produção"
                  active={sortTotals === 'produced'}
                  onPress={() => setSortTotals('produced')}
                />
                <Chip
                  label="🎯 Maior Eficiência"
                  active={sortTotals === 'compliance'}
                  onPress={() => setSortTotals('compliance')}
                />
                <Chip
                  label="📝 Nome (A-Z)"
                  active={sortTotals === 'name'}
                  onPress={() => setSortTotals('name')}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Cancelar"
                variant="text"
                onPress={() => setSortOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Aplicar"
                onPress={() => setSortOpen(false)}
                leftIcon={<MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </Sheet>
      </LinearGradient>
    </Screen>
  );
}
