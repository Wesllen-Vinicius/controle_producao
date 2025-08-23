// screens/ProducaoScreen.tsx
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import { InputNumber } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import SkeletonList from '../components/SkeletonList';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import FAB from '../components/ui/FAB';
import BottomSheet from '../components/ui/BottomSheet';
import DateField from '../components/DateField';

/* ===== Tipos e Helpers ===== */
type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'MT' | 'PC' | string;
type Product = { id: string; name: string; unit: Unit; meta_por_animal: number };
type Production = { id: string; prod_date: string; abate: number };
type SummaryItem = { production_id: string; product_id: string; product_name: string; unit: Unit; produced: number; meta: number; diff: number; media: number; };

const ONE_DAY = 86400000;
const todayStr = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + ONE_DAY);
const parseISODate = (s?: string) => {
    if (!s) return new Date();
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const labelForYMD = (ymd: string) => {
    const d = parseISODate(ymd);
    const now = new Date();
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diff = Math.round((a - b) / ONE_DAY);
    if (diff === 0) return 'Hoje';
    if (diff === -1) return 'Ontem';
    return d.toLocaleDateString();
};

/* ===== Componentes Internos ===== */
function useStyles() {
  const { colors, spacing, typography } = useTheme();
  return useMemo(() => StyleSheet.create({
    hint: { color: colors.muted, fontWeight: '700' },
    sectionHeader: { paddingVertical: 6, paddingHorizontal: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
    timeline: { borderLeftWidth: 2, borderLeftColor: colors.line, paddingLeft: spacing.md },
    bullet: { position: 'absolute', left: -6, top: 14, width: 10, height: 10, borderRadius: 10 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, opacity: 0.8 },
    accentBox: { borderWidth: 2, borderRadius: 14, padding: spacing.md },
  }), [colors, spacing, typography]);
}

function ProgressBar({ progress }: { progress: number }) {
  const { colors, radius } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(1, progress));
  useEffect(() => {
    Animated.spring(anim, { toValue: pct, stiffness: 140, damping: 18, mass: 0.7, useNativeDriver: true }).start();
  }, [pct, anim]);
  return (
    <View style={{ height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', width: '100%', backgroundColor: colors.primary, transform: [{ scaleX: anim }], alignSelf: 'flex-start' }} />
    </View>
  );
}

const Stat = memo(function Stat({ label, value, status, hint, icon }: any) {
  const { colors, spacing, radius, typography } = useTheme();
  const color = status === 'danger' ? colors.danger : status === 'success' ? colors.success : colors.text;
  const bgColor = status === 'danger' ? colors.danger + '15' : status === 'success' ? colors.success + '15' : colors.surfaceAlt;

  return (
    <View style={{
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: bgColor,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: status ? color + '30' : colors.line,
      minHeight: 72,
      justifyContent: 'center',
      gap: spacing.xs
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.label, { color: colors.muted, fontSize: 11, fontWeight: '600' }]}>{label}</Text>
        {icon && (
          <MaterialCommunityIcons name={icon} size={16} color={colors.muted} />
        )}
      </View>
      <Text style={{
        fontWeight: '900',
        color,
        fontSize: 20,
        lineHeight: 24,
        letterSpacing: -0.5
      }}>
        {value}
      </Text>
      {!!hint && (
        <Text style={{
          color: colors.muted,
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2
        }}>
          {hint}
        </Text>
      )}
    </View>
  );
});

const ProductionForm = memo(({ prodDate, setProdDate, abateStr, setAbateStr, products, selected, toggleProduct, selectAll, clearSelection }: any) => {
  const { colors, spacing, typography, radius } = useTheme();

  const isValidAbate = useMemo(() => {
    const num = parseInt(abateStr || '0', 10);
    return num > 0 && num <= 10000;
  }, [abateStr]);

  const handleDateToday = useCallback(() => {
    setProdDate(todayStr());
  }, [setProdDate]);

  const renderProductChip = useCallback((p: Product) => (
    <Chip
      key={p.id}
      label={`${p.name} (${p.unit})`}
      active={selected.includes(p.id)}
      onPress={() => toggleProduct(p.id)}
    />
  ), [selected, toggleProduct]);

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Header */}
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <MaterialCommunityIcons name="calendar-plus" size={24} color={colors.primary} />
          <Text style={[typography.h2, { fontSize: 20 }]}>Nova Produção</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '500' }}>
          Registre os dados de produção do dia
        </Text>
      </View>

      {/* Date Selection */}
      <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <MaterialCommunityIcons name="calendar" size={18} color={colors.text} />
          <Text style={[typography.label, { color: colors.text, fontSize: 13 }]}>Data de Produção</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <DateField label="" value={prodDate} onChange={setProdDate} maximumDate={tomorrow()} />
          </View>
          <Button
            title="Hoje"
            variant="tonal"
            onPress={handleDateToday}
            leftIcon={<MaterialCommunityIcons name="calendar-today" size={16} color={colors.primary} />}
          />
        </View>
      </Card>

      {/* Animal Count */}
      <Card
        padding="md"
        variant="filled"
        elevationLevel={0}
        style={{
          borderWidth: 2,
          borderColor: isValidAbate ? colors.success + '40' : colors.danger + '40',
          backgroundColor: isValidAbate ? colors.success + '10' : colors.danger + '10',
          gap: spacing.sm
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm,
            backgroundColor: isValidAbate ? colors.success + '20' : colors.danger + '20',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MaterialCommunityIcons
              name="cow"
              size={20}
              color={isValidAbate ? colors.success : colors.danger}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>
              Quantidade de Animais Abatidos
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Número total de animais processados no dia
            </Text>
          </View>
        </View>

        <InputNumber
          label=""
          mode="integer"
          value={abateStr}
          onChangeText={setAbateStr}
          placeholder="Ex.: 25"
          selectTextOnFocus
          returnKeyType="done"
          keyboardType="number-pad"
          maxLength={5}
          suffix="animais"
        />

        {!isValidAbate && abateStr && (
          <View style={{
            backgroundColor: colors.danger + '20',
            padding: spacing.sm,
            borderRadius: radius.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm
          }}>
            <MaterialCommunityIcons name="alert" size={16} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>
              Informe um número válido entre 1 e 10.000
            </Text>
          </View>
        )}

        {isValidAbate && abateStr && (
          <View style={{
            backgroundColor: colors.success + '20',
            padding: spacing.sm,
            borderRadius: radius.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm
          }}>
            <MaterialCommunityIcons name="check" size={16} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>
              Quantidade válida para processamento
            </Text>
          </View>
        )}
      </Card>

      {/* Product Selection */}
      <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MaterialCommunityIcons name="package-variant-closed" size={18} color={colors.text} />
            <Text style={[typography.h2, { fontSize: 16 }]}>Produtos a Registrar</Text>
          </View>
          {selected.length > 0 && (
            <View style={{
              backgroundColor: colors.primary + '20',
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radius.sm
            }}>
              <Text style={{
                color: colors.primary,
                fontSize: 11,
                fontWeight: '700'
              }}>
                {selected.length} SELECIONADOS
              </Text>
            </View>
          )}
        </View>

        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '500' }}>
          Selecione os produtos que foram produzidos na data escolhida
        </Text>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title="Selecionar Todos"
              variant="tonal"
              small
              onPress={selectAll}
              leftIcon={<MaterialCommunityIcons name="select-all" size={16} color={colors.primary} />}
            />
            <Button
              title="Limpar Seleção"
              variant="text"
              small
              onPress={clearSelection}
              leftIcon={<MaterialCommunityIcons name="close" size={16} color={colors.muted} />}
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(products || []).map(renderProductChip)}
          </View>
        </View>
      </Card>
    </View>
  );
});

const ProductInputCard = memo(({ product, value, onChangeText, meta, abate }: any) => {
    const { colors, spacing, radius, typography } = useTheme();
    const [localValue, setLocalValue] = useState(value);
    const debouncedChange = useDebouncedCallback(onChangeText, 250);

    useEffect(() => { setLocalValue(value); }, [value]);

    const handleChange = (text: string) => {
        setLocalValue(text);
        debouncedChange(text);
    };

    const isUN = String(product.unit).toUpperCase() === 'UN';
    const dec = isUN ? 0 : 3;
    const prod = parseFloat(localValue || '0') || 0;
    const m = meta(product);
    const d = m - prod;
    const med = abate > 0 ? prod / abate : 0;
    const progress = m > 0 ? Math.max(0, Math.min(1, prod / m)) : 0;
    const fmt = (n: number) => (isUN ? Math.round(n).toString() : n.toFixed(dec));

    const performanceStatus = progress >= 1 ? 'success' : progress >= 0.8 ? 'warning' : progress >= 0.5 ? 'neutral' : 'danger';
    const performanceColor = performanceStatus === 'success' ? colors.success :
                           performanceStatus === 'warning' ? '#FF8C00' :
                           performanceStatus === 'danger' ? colors.danger : colors.text;

    return (
        <Card
            padding="lg"
            variant="filled"
            elevationLevel={1}
            style={{
                gap: spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: performanceColor,
                backgroundColor: colors.surface
            }}
        >
            {/* Product Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.sm,
                    backgroundColor: performanceColor + '20',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <MaterialCommunityIcons
                        name="package-variant"
                        size={22}
                        color={performanceColor}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>
                        {product.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>
                        Unidade: {product.unit} • Meta/Animal: {product.meta_por_animal}
                    </Text>
                </View>
                <View style={{
                    backgroundColor: performanceColor + '20',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    borderRadius: radius.sm
                }}>
                    <Text style={{
                        color: performanceColor,
                        fontSize: 11,
                        fontWeight: '700'
                    }}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
            </View>

            {/* Input Section */}
            <View style={{ gap: spacing.sm }}>
                <Text style={[typography.label, { color: colors.text, fontSize: 13 }]}>
                    Quantidade Produzida
                </Text>
                <InputNumber
                    label=""
                    mode={isUN ? 'integer' : 'decimal'}
                    decimals={3}
                    suffix={String(product.unit).toUpperCase()}
                    value={localValue}
                    onChangeText={handleChange}
                    placeholder={isUN ? 'Ex.: 12' : 'Ex.: 34.500'}
                    leftIcon={
                        <MaterialCommunityIcons
                            name="scale"
                            size={18}
                            color={colors.muted}
                        />
                    }
                />
            </View>

            {/* Progress Bar */}
            <View style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>
                        Progresso da Meta
                    </Text>
                    <Text style={{ color: performanceColor, fontSize: 12, fontWeight: '700' }}>
                        {fmt(prod)} / {fmt(m)}
                    </Text>
                </View>
                <ProgressBar progress={progress} />
            </View>

            {/* Stats Grid */}
            <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Stat
                        label="Meta Total"
                        value={fmt(m)}
                        icon="target"
                        hint={`${abate} × ${product.meta_por_animal}`}
                    />
                    <Stat
                        label="Diferença"
                        value={fmt(Math.abs(d))}
                        status={d < 0 ? 'danger' : d > 0 ? 'success' : 'neutral'}
                        icon={d < 0 ? 'arrow-down' : d > 0 ? 'arrow-up' : 'equal'}
                    />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Stat
                        label="Média/Animal"
                        value={med.toFixed(2)}
                        icon="calculator"
                        hint={`${fmt(prod)} ÷ ${abate}`}
                    />
                    <Stat
                        label="Eficiência"
                        value={`${Math.round(progress * 100)}%`}
                        status={performanceStatus}
                        icon="chart-line"
                    />
                </View>
            </View>

            {/* Performance Indicator */}
            {progress > 0 && (
                <View style={{
                    backgroundColor: performanceColor + '15',
                    borderColor: performanceColor + '30',
                    borderWidth: 1,
                    borderRadius: radius.sm,
                    padding: spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm
                }}>
                    <MaterialCommunityIcons
                        name={
                            performanceStatus === 'success' ? 'check-circle' :
                            performanceStatus === 'warning' ? 'alert-circle' :
                            performanceStatus === 'danger' ? 'close-circle' : 'information'
                        }
                        size={16}
                        color={performanceColor}
                    />
                    <Text style={{
                        color: performanceColor,
                        fontSize: 12,
                        fontWeight: '600',
                        flex: 1
                    }}>
                        {performanceStatus === 'success' ? 'Meta atingida com sucesso!' :
                         performanceStatus === 'warning' ? 'Próximo da meta, bom trabalho!' :
                         performanceStatus === 'danger' ? 'Abaixo da meta, atenção necessária' :
                         'Em andamento...'}
                    </Text>
                </View>
            )}
        </Card>
    );
});

const HistoryRow = memo(function HistoryRow({ item, colors, spacing, typography, loadItems, cache }: any) {
    const { colors: themeColors } = useTheme();
    const styles = useStyles();
    const [open, setOpen] = useState(false);
    const rot = useRef(new Animated.Value(0)).current;
    const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    useEffect(() => {
        Animated.spring(rot, { toValue: open ? 1 : 0, useNativeDriver: true, stiffness: 240, damping: 18, mass: 0.9 }).start();
    }, [open, rot]);

    useEffect(() => {
        if (open && cache[item.id] === undefined) {
            loadItems(item.id);
        }
    }, [open, cache, item.id, loadItems]);

    const onToggle = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((v) => !v);
    }, []);

    const list = cache[item.id];
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, stiffness: 220, damping: 16, mass: 0.8 }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, stiffness: 220, damping: 16, mass: 0.8 }).start();

    return (
        <View style={[styles.timeline, { paddingRight: spacing.md }]}>
            <View style={[styles.bullet, { backgroundColor: themeColors.primary }]} />
            <Card variant="filled" elevationLevel={0} style={{ padding: 0 }}>
                <Animated.View style={{ transform: [{ scale }] }}>
                    <Pressable onPress={onToggle} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={8} android_ripple={{ color: colors.line }} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h2, { fontSize: 16 }]}>{item.prod_date}</Text>
                            <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12, fontWeight: '600' }}>Abate: {item.abate}</Text>
                        </View>
                        <Animated.View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate }] }}>
                            <MaterialCommunityIcons name="chevron-down" size={22} color={colors.text} />
                        </Animated.View>
                    </Pressable>
                </Animated.View>
                {open && (
                    <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm }}>
                        {list === undefined ? <SkeletonList rows={1} height={40} /> : list.length === 0 ? <Text style={{ color: colors.muted }}>Sem itens para esta data.</Text> : (
                            list.map((pi: SummaryItem) => {
                                const progress = pi.meta > 0 ? Math.max(0, Math.min(1, pi.produced / pi.meta)) : 0;
                                const isUN = String(pi.unit).toUpperCase() === 'UN';
                                return (
                                    <View key={`${item.id}-${pi.product_id}`} style={{ padding: spacing.sm, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.surfaceAlt, gap: 8 }}>
                                        <Text style={{ fontWeight: '800', color: colors.text }}>{pi.product_name} <Text style={{ color: colors.muted }}>({pi.unit})</Text></Text>
                                        <ProgressBar progress={progress} />
                                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                            <Stat label="Prod." value={isUN ? pi.produced : pi.produced.toFixed(3)} />
                                            <Stat label="Meta" value={isUN ? pi.meta : pi.meta.toFixed(3)} />
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                            <Stat label="Dif." value={isUN ? pi.diff : pi.diff.toFixed(3)} status={pi.diff < 0 ? 'danger' : 'success'} />
                                            <Stat label="Média" value={Number(pi.media).toFixed(2)} />
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}
            </Card>
        </View>
    );
});

/* ===== Componente Principal da Tela ===== */
type Renderable =
  | { type: 'h-header'; id: string; title: string; subtitle: string; }
  | { type: 'h-row'; id: string; item: Production };

export default function ProducaoScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();
  const styles = useStyles();

  const [formOpen, setFormOpen] = useState(false);
  const [prodDate, setProdDate] = useState<string>(todayStr());
  const [abateStr, setAbateStr] = useState<string>('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [produced, setProduced] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Production[] | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, SummaryItem[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const abate = useMemo(() => parseInt(abateStr || '0', 10) || 0, [abateStr]);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('id,name,unit,meta_por_animal').order('name');
    setProducts((data as Product[]) || []);
  }, []);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase.from('productions').select('id,prod_date,abate').order('prod_date', { ascending: false }).limit(180);
    setHistory((data as Production[]) || []);
  }, []);

  useEffect(() => { fetchProducts(); fetchHistory(); }, [fetchProducts, fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchHistory()]);
    setRefreshing(false);
  }, [fetchProducts, fetchHistory]);

  const meta = useCallback((p: Product) => abate * (p.meta_por_animal || 0), [abate]);
  const prodNum = useCallback((id: string) => parseFloat(produced[id] || '0') || 0, [produced]);

  const toggleProduct = useCallback((id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelected((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])); }, []);
  const selectAll = useCallback(() => setSelected((products || []).map((p) => p.id)), [products]);
  const clearSelection = useCallback(() => setSelected([]), []);

  const save = useCallback(async () => {
    if (!session) {
      Alert.alert('Acesso negado', 'É necessário estar logado para registrar produção.');
      return;
    }

    if (!prodDate) {
      Alert.alert('Atenção', 'Selecione uma data para a produção.');
      return;
    }

    if (!abate || abate <= 0 || abate > 10000) {
      Alert.alert('Atenção', 'Informe um número válido de abates (1-10.000).');
      return;
    }

    if (!selected.length) {
      Alert.alert('Atenção', 'Selecione pelo menos um produto para registrar.');
      return;
    }

    const hasValidProduction = selected.some(id => prodNum(id) > 0);
    if (!hasValidProduction) {
      Alert.alert('Atenção', 'Informe a quantidade produzida para pelo menos um produto.');
      return;
    }

    setSaving(true);
    try {
      const sanitizedData = {
        author_id: session.user.id,
        prod_date: prodDate,
        abate: Math.max(1, Math.min(10000, abate))
      };

      const { data: prod, error } = await supabase
        .from('productions')
        .insert(sanitizedData)
        .select('id')
        .single();

      if (error) throw error;

      const production_id = (prod as any).id;
      const items = selected
        .filter(id => prodNum(id) > 0)
        .map(id => ({
          production_id,
          product_id: id,
          produced: Math.max(0, prodNum(id))
        }));

      if (items.length > 0) {
        const { error: e2 } = await supabase.from('production_items').insert(items);
        if (e2) throw e2;
      }

      setProdDate(todayStr());
      setAbateStr('');
      setProduced({});
      clearSelection();
      await fetchHistory();
      h.success();
      showToast({ type: 'success', message: 'Produção registrada com sucesso!' });
      setFormOpen(false);
    } catch (e: any) {
      h.error();
      const errorMessage = e?.message?.includes('duplicate')
        ? 'Já existe um registro para esta data e produtos.'
        : e?.message ?? 'Falha ao salvar a produção.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  }, [session, prodDate, abate, selected, prodNum, h, clearSelection, fetchHistory, showToast]);

  const loadItems = useCallback(async (prodId: string) => {
    const { data } = await supabase.from('v_production_item_summary').select('*').eq('production_id', prodId);
    setItemsCache(s => ({ ...s, [prodId]: (data as SummaryItem[]) || [] }));
  }, []);

  const historyItems: Renderable[] = useMemo(() => {
    if (!history) return [];
    const byDay = new Map<string, Production[]>();
    history.forEach(p => {
        const ymd = p.prod_date.slice(0, 10);
        if (!byDay.has(ymd)) byDay.set(ymd, []);
        byDay.get(ymd)!.push(p);
    });
    const out: Renderable[] = [];
    Array.from(byDay.entries()).sort(([a], [b]) => (a < b ? 1 : -1)).forEach(([ymd, list]) => {
        out.push({ type: 'h-header', id: `hdr-${ymd}`, title: labelForYMD(ymd), subtitle: new Date(ymd).toLocaleDateString() });
        list.forEach(row => out.push({ type: 'h-row', id: row.id, item: row }));
    });
    return out;
  }, [history]);

  // Production stats for header
  const productionStats = useMemo(() => {
    if (!history) return { total: 0, thisMonth: 0, avgAnimals: 0 };

    const now = new Date();
    const thisMonth = history.filter(p => {
      const prodDate = new Date(p.prod_date);
      return prodDate.getMonth() === now.getMonth() && prodDate.getFullYear() === now.getFullYear();
    });

    const totalAnimals = history.reduce((sum, p) => sum + p.abate, 0);
    const avgAnimals = history.length > 0 ? Math.round(totalAnimals / history.length) : 0;

    return {
      total: history.length,
      thisMonth: thisMonth.length,
      avgAnimals
    };
  }, [history]);

  const ListHeader = useMemo(() => (
    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg
      }}>
        <View>
          <Text style={[typography.h1, { fontSize: 24 }]}>Produção</Text>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>
            Controle de Processos
          </Text>
        </View>
        <View style={{
          backgroundColor: colors.primary + '20',
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.primary + '30'
        }}>
          <Text style={{
            color: colors.primary,
            fontSize: 11,
            fontWeight: '700'
          }}>
            ATIVO
          </Text>
        </View>
      </View>

      {/* Stats Dashboard */}
      <View style={{
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg
      }}>
        <Card
          variant="tonal"
          elevationLevel={0}
          padding="md"
          style={{
            flex: 1,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
            gap: spacing.xs
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: colors.muted
            }}>
              TOTAL
            </Text>
            <MaterialCommunityIcons name="factory" size={14} color={colors.muted} />
          </View>
          <Text style={{
            fontSize: 22,
            fontWeight: '900',
            color: colors.text,
            letterSpacing: -0.5
          }}>
            {productionStats.total}
          </Text>
          <Text style={{
            fontSize: 10,
            fontWeight: '500',
            color: colors.muted
          }}>
            PRODUÇÕES
          </Text>
        </Card>

        <Card
          variant="tonal"
          elevationLevel={0}
          padding="md"
          style={{
            flex: 1,
            borderLeftWidth: 3,
            borderLeftColor: colors.success,
            gap: spacing.xs
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: colors.muted
            }}>
              ESTE MÊS
            </Text>
            <MaterialCommunityIcons name="calendar-month" size={14} color={colors.muted} />
          </View>
          <Text style={{
            fontSize: 22,
            fontWeight: '900',
            color: colors.success,
            letterSpacing: -0.5
          }}>
            {productionStats.thisMonth}
          </Text>
          <Text style={{
            fontSize: 10,
            fontWeight: '500',
            color: colors.muted
          }}>
            REGISTROS
          </Text>
        </Card>

        <Card
          variant="tonal"
          elevationLevel={0}
          padding="md"
          style={{
            flex: 1,
            borderLeftWidth: 3,
            borderLeftColor: '#FF8C00',
            gap: spacing.xs
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: colors.muted
            }}>
              MÉDIA
            </Text>
            <MaterialCommunityIcons name="cow" size={14} color={colors.muted} />
          </View>
          <Text style={{
            fontSize: 22,
            fontWeight: '900',
            color: '#FF8C00',
            letterSpacing: -0.5
          }}>
            {productionStats.avgAnimals}
          </Text>
          <Text style={{
            fontSize: 10,
            fontWeight: '500',
            color: colors.muted
          }}>
            ANIMAIS/DIA
          </Text>
        </Card>
      </View>

      {/* Section Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm
      }}>
        <MaterialCommunityIcons
          name="history"
          size={20}
          color={colors.text}
        />
        <Text style={[typography.h2, { fontSize: 18 }]}>
          Histórico de Produção
        </Text>
      </View>
    </View>
  ), [spacing, typography, colors, productionStats]);

  const renderItem: ListRenderItem<Renderable> = useCallback(({ item }) => {
    if (item.type === 'h-header') {
      return (
        <View style={{
          paddingHorizontal: spacing.md,
          marginTop: spacing.lg,
          marginBottom: spacing.sm
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.sm
          }}>
            <View style={{
              backgroundColor: colors.primary + '20',
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
              borderRadius: 12,
              borderLeftWidth: 3,
              borderLeftColor: colors.primary
            }}>
              <Text style={{
                fontWeight: '800',
                color: colors.primary,
                fontSize: 13,
                letterSpacing: 0.5
              }}>
                {item.title}
              </Text>
            </View>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line, opacity: 0.5 }} />
            <Text style={{
              color: colors.muted,
              fontWeight: '600',
              fontSize: 12
            }}>
              {item.subtitle}
            </Text>
          </View>
        </View>
      );
    }
    if (item.type === 'h-row') {
      return (
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <HistoryRow item={item.item} colors={colors} spacing={spacing} typography={typography} loadItems={loadItems} cache={itemsCache} />
        </View>
      );
    }
    return null;
  }, [spacing, colors, typography, styles, loadItems, itemsCache]);

  const selectedProducts = useMemo(() => (products || []).filter((p) => selected.includes(p.id)), [products, selected]);

  return (
    <Screen padded={false} scroll={false}>
      <FlashList
        data={historyItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemType={(item) => item.type}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        estimatedItemSize={120}
        ListEmptyComponent={!history ? <View style={{ paddingHorizontal: spacing.md }}><SkeletonList rows={5} /></View> : <EmptyState title="Nenhum lançamento registrado" />}
        extraData={itemsCache}
      />
      <FAB onPress={() => setFormOpen(true)} />
      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Registrar Produção">
        <ScrollView>
          <ProductionForm
            prodDate={prodDate} setProdDate={setProdDate}
            abateStr={abateStr} setAbateStr={setAbateStr}
            products={products} selected={selected}
            toggleProduct={toggleProduct} selectAll={selectAll}
            clearSelection={clearSelection}
          />
          {selectedProducts.length > 0 && (
            <View style={{
              height: 1,
              backgroundColor: colors.line,
              opacity: 0.5,
              marginVertical: spacing.lg
            }} />
          )}
          {selectedProducts.map((p) => (
            <View key={p.id} style={{ marginBottom: spacing.md }}>
              <ProductInputCard
                product={p}
                abate={abate}
                value={produced[p.id] ?? ''}
                onChangeText={(text: string) => setProduced(s => ({...s, [p.id]: text}))}
                meta={meta}
              />
            </View>
          ))}
          {selectedProducts.length > 0 && (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                title="Salvar Produção"
                onPress={save}
                loading={saving}
                disabled={saving || abate <= 0 || !selected.some(id => prodNum(id) > 0)}
                full
              />
              {saving && (
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
                  Salvando dados...
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}
