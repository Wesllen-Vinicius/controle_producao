// screens/EstoqueScreen.tsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import Input, { InputNumber } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import SkeletonList from '../components/SkeletonList';
import FAB from '../components/ui/FAB';
import BottomSheet from '../components/ui/BottomSheet';
import DateField from '../components/DateField';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/* ===== Tipos ===== */
type Unit = 'UN' | 'KG' | string;
type Product = { id: string; name: string; unit: Unit };
type Balance = { product_id: string; saldo: number; updated_at: string; name?: string | null; unit?: string | null; };
type Tx = { id: string; product_id: string; quantity: number; unit: Unit; tx_type: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'venda'; created_at: string; source_production_id: string | null; metadata?: any | null; };
type Renderable = | { type: 'hdr'; id: string; title: string; subtitle: string } | { type: 'tx'; id: string; tx: Tx };

/* ===== Helpers ===== */
const ONE_DAY = 86400000;
const todayStr = () => new Date().toISOString().slice(0, 10);
const parseISODate = (s?: string) => {
    if (!s) return new Date();
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const endOfDayString = (ymd: string) => `${ymd} 23:59:59`;
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
const isUN = (u?: string | null) => String(u ?? '').toUpperCase() === 'UN';
const formatQty = (unit: Unit | string | null | undefined, n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: isUN(unit) ? 0 : 3, maximumFractionDigits: isUN(unit) ? 0 : 3 });
const timeAgo = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso).getTime();
    const now = Date.now();
    const s = Math.max(1, Math.floor((now - d) / 1000));
    if (s < 60) return `${s}s atrás`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}min atrás`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h atrás`;
    const dd = Math.floor(h / 24);
    return `${dd}d atrás`;
};

const useStyles = () => {
  const { colors, spacing } = useTheme();
  return useMemo(() => StyleSheet.create({
    sectionPill: { paddingVertical: 6, paddingHorizontal: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
    headerBlock: { gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  }), [colors, spacing]);
};

/* ===== Componentes Internos ===== */
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
            Animated.spring(anim, { toValue: pct, useNativeDriver: true, stiffness: 160, damping: 18, mass: 0.8 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ]).start();
    }, [value, max, anim, fadeAnim]);
    
    const qtyStr = formatQty(unit, value);
    const neg = value < 0;
    const low = value > 0 && value <= max * 0.2; // Low stock warning
    const hasDelta = typeof todayDelta === 'number' && !Number.isNaN(todayDelta);
    const up = (todayDelta ?? 0) > 0;
    const down = (todayDelta ?? 0) < 0;
    const deltaColor = up ? colors.success : down ? colors.danger : colors.muted;
    const deltaText = hasDelta ? `${up ? '↗' : down ? '↘' : '•'} ${formatQty(unit, Math.abs(todayDelta!))}` : '';

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
                    style={{
                        borderLeftWidth: 4,
                        borderLeftColor: statusColor,
                        backgroundColor: colors.surface,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <MaterialCommunityIcons 
                            name={statusIcon as any} 
                            size={20} 
                            color={statusColor} 
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.h2, { fontSize: 16 }]} numberOfLines={1}>
                                {name}
                            </Text>
                            {unit && (
                                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>
                                    Unidade: {unit.toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            {!!updatedAt && (
                                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '500' }}>
                                    {timeAgo(updatedAt)}
                                </Text>
                            )}
                        </View>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <View>
                            <Text style={{ 
                                fontWeight: '900', 
                                fontSize: 28, 
                                color: statusColor,
                                letterSpacing: -0.5 
                            }}>
                                {qtyStr}
                            </Text>
                            {neg && (
                                <Text style={{ 
                                    color: colors.danger, 
                                    fontSize: 11, 
                                    fontWeight: '700',
                                    marginTop: -2
                                }}>
                                    ESTOQUE NEGATIVO
                                </Text>
                            )}
                            {low && !neg && (
                                <Text style={{ 
                                    color: '#FF8C00', 
                                    fontSize: 11, 
                                    fontWeight: '700',
                                    marginTop: -2
                                }}>
                                    ESTOQUE BAIXO
                                </Text>
                            )}
                        </View>
                        
                        {hasDelta && (
                            <View style={{
                                backgroundColor: deltaColor + '20',
                                paddingHorizontal: spacing.sm,
                                paddingVertical: 4,
                                borderRadius: radius.sm,
                                borderWidth: 1,
                                borderColor: deltaColor + '30'
                            }}>
                                <Text style={{ 
                                    fontSize: 12, 
                                    fontWeight: '700', 
                                    color: deltaColor 
                                }}>
                                    {deltaText} hoje
                                </Text>
                            </View>
                        )}
                    </View>
                    
                    {/* Progress bar */}
                    <View style={{ 
                        height: 8, 
                        backgroundColor: colors.surfaceAlt, 
                        borderRadius: radius.sm, 
                        overflow: 'hidden',
                        marginTop: spacing.xs
                    }}>
                        <Animated.View style={{ 
                            height: '100%', 
                            backgroundColor: statusColor + '80',
                            transform: [{ scaleX: anim }],
                            transformOrigin: 'left',
                            borderRadius: radius.sm
                        } as any} />
                    </View>
                </Card>
            </Animated.View>
        </Pressable>
    );
});

interface TxRowProps {
    tx: Tx;
    products: Product[] | null;
}

const TxRow = memo(function TxRow({ tx, products }: TxRowProps) {
    const { colors, spacing, typography, radius } = useTheme();
    
    const productName = useMemo(() => {
        return (products || []).find((p) => p.id === tx.product_id)?.name ?? 'Produto';
    }, [products, tx.product_id]);
    
    const timeStr = useMemo(() => {
        return new Date(tx.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }, [tx.created_at]);
    
    const txTypeInfo = useMemo(() => {
        switch (tx.tx_type) {
            case 'entrada': 
                return { 
                    color: colors.success, 
                    bgColor: colors.success + '15',
                    icon: 'arrow-down-box' as const, 
                    sign: '+',
                    label: 'ENTRADA',
                    description: 'Produto adicionado ao estoque'
                };
            case 'saida': 
                return { 
                    color: colors.danger, 
                    bgColor: colors.danger + '15',
                    icon: 'arrow-up-box' as const, 
                    sign: '−',
                    label: 'SAÍDA',
                    description: 'Produto retirado do estoque'
                };
            case 'venda': 
                return { 
                    color: '#FF8C00', 
                    bgColor: '#FF8C00' + '15',
                    icon: 'cash-register' as const, 
                    sign: '−',
                    label: 'VENDA',
                    description: 'Produto vendido'
                };
            case 'ajuste': 
                return { 
                    color: colors.accent, 
                    bgColor: colors.accent + '15',
                    icon: 'tune-variant' as const, 
                    sign: '±',
                    label: 'AJUSTE',
                    description: 'Correção de estoque'
                };
            case 'transferencia': 
                return { 
                    color: colors.primary, 
                    bgColor: colors.primary + '15',
                    icon: 'swap-horizontal-variant' as const, 
                    sign: '↔',
                    label: 'TRANSFERÊNCIA',
                    description: 'Movimentação entre locais'
                };
            default: 
                return { 
                    color: colors.muted, 
                    bgColor: colors.muted + '15',
                    icon: 'dots-horizontal' as const, 
                    sign: '',
                    label: tx.tx_type.toUpperCase(),
                    description: 'Movimentação'
                };
        }
    }, [tx.tx_type, colors]);

    const quantityDisplay = useMemo(() => {
        return `${txTypeInfo.sign}${formatQty(tx.unit, tx.quantity)}`;
    }, [txTypeInfo.sign, tx.unit, tx.quantity]);

    return (
        <Card 
            variant="filled" 
            elevationLevel={1} 
            padding="md"
            style={{
                borderLeftWidth: 3,
                borderLeftColor: txTypeInfo.color,
                backgroundColor: colors.surface
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.sm,
                    backgroundColor: txTypeInfo.bgColor,
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <MaterialCommunityIcons 
                        name={txTypeInfo.icon} 
                        size={20} 
                        color={txTypeInfo.color} 
                    />
                </View>
                
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[typography.h2, { fontSize: 14, fontWeight: '700' }]}>
                            {txTypeInfo.label}
                        </Text>
                        <View style={{
                            backgroundColor: txTypeInfo.color + '20',
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                            borderRadius: radius.sm,
                            borderWidth: 1,
                            borderColor: txTypeInfo.color + '30'
                        }}>
                            <Text style={{ 
                                fontWeight: '900', 
                                fontSize: 14,
                                color: txTypeInfo.color,
                                letterSpacing: -0.5
                            }}>
                                {quantityDisplay}
                            </Text>
                        </View>
                    </View>
                    
                    <Text style={{ 
                        color: colors.muted, 
                        fontSize: 12, 
                        fontWeight: '500',
                        marginTop: 2 
                    }}>
                        {txTypeInfo.description}
                    </Text>
                </View>
            </View>
            
            <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginTop: spacing.sm,
                paddingTop: spacing.sm,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.line
            }}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons 
                            name="package-variant" 
                            size={14} 
                            color={colors.muted} 
                        />
                        <Text style={{ 
                            color: colors.text, 
                            fontSize: 13, 
                            fontWeight: '600',
                            flex: 1
                        }} numberOfLines={1}>
                            {productName}
                        </Text>
                    </View>
                    
                    {tx.metadata?.customer && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <MaterialCommunityIcons 
                                name="account" 
                                size={14} 
                                color={colors.muted} 
                            />
                            <Text style={{ 
                                color: colors.muted, 
                                fontSize: 12, 
                                fontWeight: '500' 
                            }}>
                                {tx.metadata.customer}
                            </Text>
                        </View>
                    )}
                </View>
                
                <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons 
                            name="clock-outline" 
                            size={12} 
                            color={colors.muted} 
                        />
                        <Text style={{ 
                            color: colors.muted, 
                            fontSize: 11, 
                            fontWeight: '500' 
                        }}>
                            {timeStr}
                        </Text>
                    </View>
                    
                    {!!tx.source_production_id && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <MaterialCommunityIcons 
                                name="factory" 
                                size={12} 
                                color={colors.primary} 
                            />
                            <Text style={{ 
                                color: colors.primary, 
                                fontSize: 10, 
                                fontWeight: '600' 
                            }}>
                                PRODUÇÃO
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Card>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.tx.id === nextProps.tx.id &&
        prevProps.tx.quantity === nextProps.tx.quantity &&
        prevProps.tx.tx_type === nextProps.tx.tx_type &&
        prevProps.products?.length === nextProps.products?.length
    );
});

interface MovePanelProps {
  products: Product[] | null;
  mvProd: string | null;
  setMvProd: (id: string) => void;
  mvType: Tx['tx_type'];
  setMvType: (type: Tx['tx_type']) => void;
  mvCustomer: string;
  setMvCustomer: (customer: string) => void;
  mvQty: string;
  setMvQty: (qty: string) => void;
  balances: Balance[] | null;
  addTx: () => void;
  saving: boolean;
}

const MovePanel = memo(({ products, mvProd, setMvProd, mvType, setMvType, mvCustomer, setMvCustomer, mvQty, setMvQty, balances, addTx, saving }: MovePanelProps) => {
    const { colors, spacing, typography } = useTheme();
    const prodsById = useMemo(() => new Map((products || []).map((p: Product) => [p.id, p])), [products]);
    const mvProdUnit: Unit | null = mvProd ? prodsById.get(mvProd)?.unit ?? null : null;
    const mvIsInteger = isUN(mvProdUnit);

    const saldoAtual: number = mvProd ? (balances || []).find(b => b.product_id === mvProd)?.saldo ?? 0 : 0;

    const valNum = parseFloat(mvQty || '0') || 0;
    const delta = mvType === 'entrada' ? valNum : ((mvType === 'saida' || mvType === 'venda') ? -valNum : 0);
    const previsto = saldoAtual + delta;
    const step = mvIsInteger ? 1 : 0.1;
    const decs = mvIsInteger ? 0 : 3;
    const presets = mvIsInteger ? [1, 5, 10, 20, 50] : [0.1, 0.5, 1, 5, 10];
    const formValido = !!mvProd && valNum > 0 && (mvType !== 'saida' && mvType !== 'venda' || previsto >= 0);

    return (
        <View style={{ gap: spacing.md, padding: spacing.md }}>
            <View><Text style={typography.label}>Produto</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}>{(products || []).map((p: Product) => (<Chip key={p.id} label={`${p.name} (${p.unit})`} active={mvProd === p.id} onPress={() => setMvProd(p.id)} />))}</ScrollView></View>
            <View><Text style={typography.label}>Tipo de Movimentação</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}>{(['entrada', 'saida', 'ajuste', 'venda'] as const).map((t) => (<Chip key={t} label={t} active={mvType === t} onPress={() => setMvType(t)} />))}</ScrollView></View>
            {mvType === 'venda' && <Input label="Cliente (opcional)" value={mvCustomer} onChangeText={setMvCustomer} placeholder="Ex.: Cliente Final" />}
            <View style={{ gap: 8 }}><Text style={typography.label}>Quantidade</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Button title="−" small variant="tonal" onPress={() => setMvQty(Math.max(0, valNum - step).toFixed(decs))} /><View style={{ flex: 1 }}><InputNumber mode={mvIsInteger ? 'integer' : 'decimal'} decimals={decs} value={mvQty} onChangeText={setMvQty} placeholder="0" suffix={mvProdUnit ? String(mvProdUnit).toUpperCase() : undefined} /></View><Button title="+" small variant="tonal" onPress={() => setMvQty((valNum + step).toFixed(decs))} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{presets.map((p) => (<Chip key={p} label={`+${p}`} onPress={() => setMvQty((valNum + p).toFixed(decs))} />))}</ScrollView></View>
            <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: 6 }}><Text style={[typography.label, { opacity: 0.8 }]}>Previsão de Saldo</Text><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontWeight: '800' }}>{formatQty(mvProdUnit, saldoAtual)}</Text><MaterialCommunityIcons name="arrow-right" size={18} color={colors.muted} style={{ marginHorizontal: 8 }} /><Text style={{ fontWeight: '800', color: previsto < 0 ? colors.danger : colors.text }}>{formatQty(mvProdUnit, previsto)}</Text><View style={{ flex: 1 }} />{!!mvProdUnit && (<Text style={{ color: colors.muted, fontSize: 12 }}>{String(mvProdUnit).toUpperCase()}</Text>)}</View>{(mvType === 'saida' || mvType === 'venda') && previsto < 0 && (<Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>Saldo ficará negativo.</Text>)}</Card>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}><View style={{ flex: 1 }}><Button title="Limpar" variant="text" onPress={() => { setMvQty(''); setMvCustomer(''); }} disabled={saving} /></View><View style={{ flex: 1 }}><Button title="Registrar" onPress={addTx} loading={saving} disabled={saving || !formValido} /></View></View>
        </View>
    );
});

const DayHeader = memo(function DayHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors, spacing, radius } = useTheme();
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
          borderRadius: radius.sm,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary
        }}>
          <Text style={{ 
            fontWeight: '800', 
            color: colors.primary,
            fontSize: 13,
            letterSpacing: 0.5
          }}>
            {title}
          </Text>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line, opacity: 0.5 }} />
        <Text style={{ 
          color: colors.muted, 
          fontWeight: '600',
          fontSize: 12
        }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
});

const PAGE_SIZE = 40;

export default function EstoqueScreen() {
    const { session } = useAuth();
    const { showToast } = useToast();
    const h = useHaptics();
    const { colors, spacing, typography } = useTheme();
    const styles = useStyles();

    const [formOpen, setFormOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [products, setProducts] = useState<Product[] | null>(null);
    const [balances, setBalances] = useState<Balance[] | null>(null);
    const [txs, setTxs] = useState<Tx[] | null>(null);
    const [selProd, setSelProd] = useState<string | null>(null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [filterType, setFilterType] = useState<Tx['tx_type'] | undefined>();
    const [mvProd, setMvProd] = useState<string | null>(null);
    const [mvType, setMvType] = useState<Tx['tx_type']>('saida');
    const [mvQty, setMvQty] = useState('');
    const [mvCustomer, setMvCustomer] = useState('');
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingPage, setLoadingPage] = useState(false);
    const [cursor, setCursor] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const prodsById = useMemo(() => new Map((products || []).map(p => [p.id, p])), [products]);
    const balanceById = useMemo(() => new Map<string, number>((balances || []).map((b: Balance) => [b.product_id, b.saldo])), [balances]);

    useEffect(() => {
        const now = new Date();
        setFrom(toISODate(new Date(now.getTime() - 30 * ONE_DAY)));
        setTo(toISODate(now));
    }, []);

    const clampDates = useCallback((nextFrom?: string, nextTo?: string) => {
        let f = nextFrom ?? from;
        let t = nextTo ?? to;
        const today = todayStr();
        if (f && t && parseISODate(f) > parseISODate(t)) {
          if (nextFrom) t = f; else f = t;
        }
        if (t && parseISODate(t) > new Date()) t = today;
        if (f && parseISODate(f) > new Date()) f = today;
        setFrom(f);
        setTo(t);
    }, [from, to]);

    const loadProducts = useCallback(async () => {
        const { data } = await supabase.from('products').select('id,name,unit').order('name');
        const list = (data as Product[]) || [];
        setProducts(list);
        if (list.length > 0) {
            setSelProd((prev) => (prev && list.some(p => p.id === prev) ? prev : null));
            setMvProd((prev) => (prev && list.some(p => p.id === prev) ? prev : list[0].id));
        }
    }, []);

    const loadBalances = useCallback(async () => {
        if (!products) return;
        const { data } = await supabase.from('inventory_balances').select('product_id,saldo,updated_at');
        const list = (data as any[]) || [];
        const byId = new Map(products.map(p => [p.id, p]));
        const enriched: Balance[] = list.map(b => ({ ...b, name: byId.get(b.product_id)?.name, unit: byId.get(b.product_id)?.unit }));
        setBalances(enriched);
    }, [products]);

    const fetchTxPage = useCallback(async (reset = false) => {
        if (loadingPage) return;
        if (!reset && !hasMore) return;
        
        setLoadingPage(true);
        
        try {
            const fromIdx = reset ? 0 : cursor;
            const toIdx = fromIdx + PAGE_SIZE - 1;
            
            let q = supabase
                .from('inventory_transactions')
                .select('id,product_id,quantity,unit,tx_type,created_at,source_production_id,metadata')
                .order('created_at', { ascending: false })
                .range(fromIdx, toIdx);
            
            // Aplicar filtros de forma otimizada
            if (selProd) {
                q = q.eq('product_id', selProd);
            }
            
            if (filterType) {
                if (filterType === 'venda') {
                    q = q.in('tx_type', ['venda', 'saida']);
                } else {
                    q = q.eq('tx_type', filterType);
                }
            }
            
            if (from) {
                q = q.gte('created_at', `${from} 00:00:00`);
            }
            
            if (to) {
                q = q.lte('created_at', endOfDayString(to));
            }
            
            const { data, error } = await q;
            
            if (error) {
                const errorMsg = error.message.includes('network')
                    ? 'Erro de conexão. Verifique sua internet.'
                    : error.message.includes('permission')
                    ? 'Acesso negado. Faça login novamente.'
                    : `Erro ao carregar transações: ${error.message}`;
                Alert.alert('Erro', errorMsg);
                return;
            }
            
            const page = (data as Tx[]) || [];
            
            if (reset) {
                setTxs(page);
                setCursor(page.length);
            } else {
                setTxs(prev => {
                    const existing = prev || [];
                    const newItems = page.filter(newTx => 
                        !existing.some(existingTx => existingTx.id === newTx.id)
                    );
                    return [...existing, ...newItems];
                });
                setCursor(prev => prev + page.length);
            }
            
            setHasMore(page.length === PAGE_SIZE);
        } catch (e: any) {
            Alert.alert('Erro inesperado', e?.message || 'Falha ao carregar dados');
        } finally {
            setLoadingPage(false);
        }
    }, [cursor, filterType, from, to, selProd, loadingPage, hasMore]);

    useEffect(() => { loadProducts(); }, [loadProducts]);
    useEffect(() => { if (products) loadBalances(); }, [products, loadBalances]);
    useEffect(() => { if (from && to) fetchTxPage(true); }, [selProd, filterType, from, to]);

    const applyFilters = useCallback(() => { setCursor(0); setHasMore(true); fetchTxPage(true); setFiltersOpen(false); }, [fetchTxPage]);
    const onRefresh = useCallback(async () => { setRefreshing(true); await Promise.all([loadProducts(), loadBalances(), fetchTxPage(true)]); setRefreshing(false); }, [loadProducts, loadBalances, fetchTxPage]);

    const todayYmd = todayStr();
    const deltaHojeByProd = useMemo(() => {
        const m = new Map<string, number>();
        (txs || []).forEach(t => {
            if (t.created_at.slice(0, 10) !== todayYmd) return;
            const sign = t.tx_type === 'entrada' ? 1 : ((t.tx_type === 'saida' || t.tx_type === 'venda') ? -1 : 0);
            m.set(t.product_id, (m.get(t.product_id) || 0) + t.quantity * sign);
        });
        return m;
    }, [txs, todayYmd]);

    const maxSaldo = useMemo(() => Math.max(1, ...(balances || []).map(b => Math.abs(b.saldo))), [balances]);

    const addTx = useCallback(async () => {
        if (!session?.user?.id) {
            Alert.alert('Acesso negado', 'É necessário estar logado para registrar movimentações.');
            return;
        }

        if (!mvProd) {
            h.warning();
            Alert.alert('Atenção', 'Selecione um produto.');
            return;
        }

        const mvQtyNum = parseFloat(mvQty || '0') || 0;
        if (!mvQtyNum || mvQtyNum <= 0) {
            h.warning();
            Alert.alert('Atenção', 'Informe uma quantidade válida maior que zero.');
            return;
        }

        // Validação de quantidade máxima
        if (mvQtyNum > 999999) {
            h.warning();
            Alert.alert('Atenção', 'Quantidade muito alta. Máximo permitido: 999.999.');
            return;
        }

        const product = prodsById.get(mvProd);
        if (!product) {
            h.warning();
            Alert.alert('Erro', 'Produto não encontrado.');
            return;
        }

        // Verificar saldo para operações de saída
        if (mvType === 'saida' || mvType === 'venda') {
            const saldoAtual = balanceById.get(mvProd) ?? 0;
            if (saldoAtual < mvQtyNum) {
                Alert.alert(
                    'Saldo insuficiente',
                    `Saldo atual: ${formatQty(product.unit, saldoAtual)}\nQuantidade solicitada: ${formatQty(product.unit, mvQtyNum)}`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Continuar mesmo assim', onPress: () => proceedWithTx() }
                    ]
                );
                return;
            }
        }

        await proceedWithTx();

        async function proceedWithTx() {
            setSaving(true);
            
            try {
                const sanitizedPayload = {
                    product_id: mvProd,
                    quantity: Math.round(mvQtyNum * 1000) / 1000, // Arredondar para 3 casas decimais
                    unit: product.unit,
                    tx_type: mvType,
                    created_by: session.user.id,
                    metadata: (mvType === 'venda' && mvCustomer.trim()) 
                        ? { customer: mvCustomer.trim().substring(0, 100) } 
                        : null
                };

                const { error } = await supabase
                    .from('inventory_transactions')
                    .insert(sanitizedPayload);

                if (error) {
                    if (error.message.includes('duplicate')) {
                        throw new Error('Transação duplicada detectada.');
                    } else if (error.message.includes('permission')) {
                        throw new Error('Sem permissão para registrar movimentações.');
                    } else {
                        throw error;
                    }
                }

                // Recarregar dados de forma otimizada
                await Promise.all([
                    loadBalances(), 
                    fetchTxPage(true)
                ]);

                h.success();
                showToast({ 
                    type: 'success', 
                    message: `${mvType.charAt(0).toUpperCase() + mvType.slice(1)} registrada com sucesso!` 
                });
                
                // Resetar formulário
                setMvQty('');
                setMvCustomer('');
                setFormOpen(false);

            } catch (e: any) {
                h.error();
                const errorMessage = e?.message?.includes('network')
                    ? 'Erro de conexão. Verifique sua internet e tente novamente.'
                    : e?.message ?? 'Falha ao registrar movimentação.';
                Alert.alert('Erro', errorMessage);
            } finally {
                setSaving(false);
            }
        }
    }, [session, mvProd, mvQty, mvType, mvCustomer, prodsById, balanceById, h, showToast, loadBalances, fetchTxPage]);

    // Stats summary for header
    const statsData = useMemo(() => {
        const totalProducts = balances?.length || 0;
        const negativeStock = balances?.filter(b => b.saldo < 0).length || 0;
        const lowStock = balances?.filter(b => b.saldo > 0 && b.saldo <= maxSaldo * 0.2).length || 0;
        const totalMovements = txs?.length || 0;
        
        return { totalProducts, negativeStock, lowStock, totalMovements };
    }, [balances, maxSaldo, txs]);

    const ListHeader = useMemo(() => (
        <View style={styles.headerBlock}>
            {/* Header with title and action */}
            <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: spacing.md
            }}>
                <View>
                    <Text style={[typography.h1, { fontSize: 24 }]}>Estoque</Text>
                    <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>
                        Controle de Inventário
                    </Text>
                </View>
                <Button 
                    title="Filtros" 
                    variant="tonal" 
                    small 
                    onPress={() => setFiltersOpen(true)}
                    leftIcon={
                        <MaterialCommunityIcons 
                            name="tune-variant" 
                            size={16} 
                            color={colors.primary} 
                        />
                    } 
                />
            </View>

            {/* Stats cards */}
            <View style={{ 
                flexDirection: 'row', 
                gap: spacing.sm, 
                marginBottom: spacing.lg 
            }}>
                <Card 
                    variant="tonal" 
                    elevationLevel={0} 
                    padding="sm"
                    style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: colors.primary }}
                >
                    <Text style={{ 
                        fontSize: 20, 
                        fontWeight: '900', 
                        color: colors.text 
                    }}>
                        {statsData.totalProducts}
                    </Text>
                    <Text style={{ 
                        fontSize: 11, 
                        fontWeight: '600', 
                        color: colors.muted,
                        marginTop: 2
                    }}>
                        PRODUTOS
                    </Text>
                </Card>
                
                <Card 
                    variant="tonal" 
                    elevationLevel={0} 
                    padding="sm"
                    style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: colors.danger }}
                >
                    <Text style={{ 
                        fontSize: 20, 
                        fontWeight: '900', 
                        color: colors.danger 
                    }}>
                        {statsData.negativeStock}
                    </Text>
                    <Text style={{ 
                        fontSize: 11, 
                        fontWeight: '600', 
                        color: colors.muted,
                        marginTop: 2
                    }}>
                        NEGATIVOS
                    </Text>
                </Card>
                
                <Card 
                    variant="tonal" 
                    elevationLevel={0} 
                    padding="sm"
                    style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: '#FF8C00' }}
                >
                    <Text style={{ 
                        fontSize: 20, 
                        fontWeight: '900', 
                        color: '#FF8C00' 
                    }}>
                        {statsData.lowStock}
                    </Text>
                    <Text style={{ 
                        fontSize: 11, 
                        fontWeight: '600', 
                        color: colors.muted,
                        marginTop: 2
                    }}>
                        BAIXOS
                    </Text>
                </Card>
            </View>

            {/* Balance section */}
            <View style={{ marginBottom: spacing.lg }}>
                <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: spacing.sm,
                    marginBottom: spacing.md 
                }}>
                    <MaterialCommunityIcons 
                        name="package-variant" 
                        size={20} 
                        color={colors.text} 
                    />
                    <Text style={[typography.h2, { fontSize: 18 }]}>
                        Saldos Atuais
                    </Text>
                </View>
                
                {balances === null ? (
                    <SkeletonList rows={2} height={120} />
                ) : balances.length === 0 ? (
                    <EmptyState 
                        title="Sem saldos para exibir"
                        subtitle="Registre movimentações para ver os saldos aqui"
                        onAction={() => setFormOpen(true)}
                        actionLabel="Adicionar Movimentação"
                    />
                ) : (
                    <View style={{ gap: 2 }}>
                        {balances.map(b => (
                            <BalanceRow 
                                key={b.product_id} 
                                name={b.name ?? 'Produto'} 
                                unit={b.unit} 
                                value={b.saldo} 
                                max={maxSaldo} 
                                updatedAt={b.updated_at} 
                                todayDelta={deltaHojeByProd.get(b.product_id) ?? 0} 
                                onPress={() => { 
                                    setSelProd(b.product_id); 
                                    setFiltersOpen(true); 
                                }} 
                            />
                        ))}
                    </View>
                )}
            </View>

            {/* History section header */}
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
                    Histórico de Movimentos
                </Text>
            </View>
        </View>
    ), [balances, spacing, typography, maxSaldo, deltaHojeByProd, colors, statsData]);

    const renderables: Renderable[] = useMemo(() => {
        if (!txs) return [];
        
        const groups = new Map<string, Tx[]>();
        txs.forEach(t => {
            const ymd = t.created_at.slice(0, 10);
            if (!groups.has(ymd)) groups.set(ymd, []);
            groups.get(ymd)!.push(t);
        });
        
        const out: Renderable[] = [];
        let globalIndex = 0;
        
        Array.from(groups.entries())
            .sort(([a], [b]) => (a < b ? 1 : -1))
            .forEach(([ymd, items]) => {
                // Header único por dia
                out.push({ 
                    type: 'hdr', 
                    id: `hdr-${ymd}-${globalIndex++}`, 
                    title: labelForYMD(ymd), 
                    subtitle: new Date(ymd).toLocaleDateString() 
                });
                
                // Transações com índice único
                items
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .forEach((tx, txIndex) => {
                        out.push({ 
                            type: 'tx', 
                            id: `tx-${tx.id}-${ymd}-${txIndex}-${globalIndex++}`, 
                            tx 
                        });
                    });
            });
            
        return out;
    }, [txs]);

    return (
        <Screen padded={false} scroll={false}>
            <FlashList
                data={renderables}
                keyExtractor={(item) => item.id}
                renderItem={useCallback(({item}: {item: Renderable}) => {
                    if (item.type === 'hdr') {
                        return <DayHeader title={item.title} subtitle={item.subtitle} />;
                    }
                    return (
                        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
                            <TxRow tx={item.tx} products={products} />
                        </View>
                    );
                }, [spacing.md, spacing.sm, products])}
                getItemType={(item) => item.type}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={loadingPage ? <ActivityIndicator style={{ marginVertical: spacing.md }} /> : null}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
                contentContainerStyle={{ paddingBottom: 80 }}
                estimatedItemSize={120}
                onEndReached={() => hasMore && !loadingPage && fetchTxPage(false)}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={!txs ? <View style={{ paddingHorizontal: spacing.md }}><SkeletonList rows={5} /></View> : <EmptyState title="Nenhum movimento no período" subtitle="Ajuste os filtros para ver mais." onAction={() => setFiltersOpen(true)} actionLabel="Ajustar Filtros"/>}
            />
            <FAB onPress={() => setFormOpen(true)} />

            <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Registrar Movimentação">
                <ScrollView><MovePanel products={products} mvProd={mvProd} setMvProd={setMvProd} mvType={mvType} setMvType={setMvType} mvCustomer={mvCustomer} setMvCustomer={setMvCustomer} mvQty={mvQty} setMvQty={setMvQty} balances={balances} addTx={addTx} saving={saving} /></ScrollView>
            </BottomSheet>

            <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrar Histórico">
                <View style={{ gap: spacing.md, padding: spacing.md }}>
                    <View><Text style={typography.label}>Produto</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}>
                        <Chip label="Todos" active={!selProd} onPress={() => setSelProd(null)} />
                        {(products || []).map(p => <Chip key={p.id} label={p.name} active={selProd === p.id} onPress={() => setSelProd(p.id)} />)}
                    </ScrollView></View>
                    <View><Text style={typography.label}>Tipo</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}>
                        <Chip label="Todos" active={!filterType} onPress={() => setFilterType(undefined)} />
                        {(['entrada', 'saida', 'ajuste', 'venda'] as const).map(t => <Chip key={t} label={t} active={filterType === t} onPress={() => setFilterType(t)} />)}
                    </ScrollView></View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}><DateField label="De" value={from} onChange={v => clampDates(v, undefined)} /></View>
                        <View style={{ flex: 1 }}><DateField label="Até" value={to} onChange={v => clampDates(undefined, v)} minimumDate={from ? parseISODate(from) : undefined} /></View>
                    </View>
                    <Button title="Aplicar Filtros" onPress={applyFilters} full />
                </View>
            </BottomSheet>
        </Screen>
    );
}
