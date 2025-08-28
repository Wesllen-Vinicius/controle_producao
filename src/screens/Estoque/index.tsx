// src/screens/Estoque/index.tsx
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import DateField from '../../components/DateField';
import Screen from '../../components/Screen';
import SkeletonList from '../../components/SkeletonList';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import EmptyState from '../../components/ui/EmptyState';
import FAB from '../../components/ui/FAB';
import { useTheme } from '../../state/ThemeProvider';

import { useInventoryData } from './hooks/useInventoryData';
import { Renderable } from './types';
import { parseISODate, todayStr } from './utils';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BalanceRow from './components/BalanceRow';
import DayHeader from './components/DayHeader';
import InventoryHeader from './components/InventoryHeader';
import MovePanel from './components/MovePanel';
import TxRow from './components/TxRow';

export default function EstoqueScreen() {
    const { colors, spacing, typography } = useTheme();
    const {
        profile, loading, refreshing, onRefresh, balances, transactions, products,
        inventoryStats, renderables, loadingPage, hasMore, fetchTxPage,
        filtersOpen, setFiltersOpen, filters, setFilters,
        formOpen, setFormOpen, mvProd, setMvProd, mvType, setMvType, mvQty, setMvQty,
        mvCustomer, setMvCustomer, mvObservation, setMvObservation, mvJustification, setMvJustification,
        saving, addTx
    } = useInventoryData();

    const maxSaldo = useMemo(() => Math.max(1, ...(balances || []).map(b => Math.abs(b.saldo))), [balances]);
    const todayYmd = todayStr();
    const deltaHojeByProd = useMemo(() => {
        const m = new Map<string, number>();
        (transactions || []).forEach(t => {
            if (t.created_at.slice(0, 10) !== todayYmd) return;
            let delta = 0;
            if (t.tx_type === 'entrada') delta = t.quantity;
            else if (t.tx_type === 'saida' || t.tx_type === 'venda') delta = -t.quantity;
            else if (t.tx_type === 'ajuste') delta = t.quantity;
            m.set(t.product_id, (m.get(t.product_id) || 0) + delta);
        });
        return m;
    }, [transactions, todayYmd]);

    const renderItem: ListRenderItem<Renderable> = useCallback(({ item }) => {
        if (item.type === 'hdr') {
            return <DayHeader title={item.title} />;
        }
        return (
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
                <TxRow tx={item.tx} products={products} />
            </View>
        );
    }, [spacing.md, spacing.sm, products]);

    const ListHeader = useCallback(() => (
        <>
            <InventoryHeader stats={inventoryStats} onFilterPress={() => setFiltersOpen(true)} />
            {balances === null ? (
                <View style={{ paddingHorizontal: spacing.md }}>
                    <SkeletonList rows={2} height={120} />
                </View>
            ) : balances.length === 0 ? (
                <EmptyState title="Sem saldos para exibir" subtitle="Registre movimentações para ver os saldos aqui" onAction={() => setFormOpen(true)} actionLabel="Adicionar Movimentação" />
            ) : (
                <View style={{ gap: 2, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
                    {balances.map(b => (
                        <BalanceRow key={b.product_id} name={b.name ?? 'Produto'} unit={b.unit} value={b.saldo} max={maxSaldo} updatedAt={b.updated_at} todayDelta={deltaHojeByProd.get(b.product_id) ?? 0} onPress={() => { setFilters(f => ({...f, productId: b.product_id })); setFiltersOpen(true); }} />
                    ))}
                </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
              <MaterialCommunityIcons name="history" size={20} color={colors.text} />
              <Text style={[typography.h2, { fontSize: 18, color: colors.text }]}>Histórico de Movimentos</Text>
            </View>
        </>
    ), [inventoryStats, setFiltersOpen, balances, maxSaldo, deltaHojeByProd, spacing, colors, typography, setFormOpen]);

    if (loading) {
        return <Screen padded><SkeletonList rows={10} /></Screen>;
    }

    return (
        <Screen padded={false} scroll={false}>
            <FlashList
                data={renderables}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                getItemType={item => item.type}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={loadingPage ? <ActivityIndicator style={{ marginVertical: spacing.md }} /> : null}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
                contentContainerStyle={{ paddingBottom: 80 }}
                estimatedItemSize={160}
                onEndReached={() => fetchTxPage(false)}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={<EmptyState title="Nenhum movimento no período" subtitle="Ajuste os filtros para ver mais." onAction={() => setFiltersOpen(true)} actionLabel="Ajustar Filtros"/>}
            />
            <FAB onPress={() => setFormOpen(true)} />

            <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Registrar Movimentação">
                <MovePanel products={products} mvProd={mvProd} setMvProd={setMvProd} mvType={mvType} setMvType={setMvType} mvCustomer={mvCustomer} setMvCustomer={setMvCustomer} mvObservation={mvObservation} setMvObservation={setMvObservation} mvJustification={mvJustification} setMvJustification={setMvJustification} mvQty={mvQty} setMvQty={setMvQty} balances={balances} addTx={addTx} saving={saving} profile={profile} />
            </BottomSheet>

            <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrar Histórico">
                <View style={{ gap: spacing.md, padding: spacing.md }}>
                    <View><Text style={[typography.label, { color: colors.text }]}>Produto</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}>
                        <Chip label="Todos" active={!filters.productId} onPress={() => setFilters(f => ({ ...f, productId: null }))} />
                        {(products || []).map(p => <Chip key={p.id} label={p.name} active={filters.productId === p.id} onPress={() => setFilters(f => ({ ...f, productId: p.id }))} />)}
                    </ScrollView></View>
                    <View><Text style={[typography.label, { color: colors.text }]}>Tipo</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}>
                        <Chip label="Todos" active={!filters.transactionType} onPress={() => setFilters(f => ({ ...f, transactionType: undefined }))} />
                        {(['entrada', 'saida', 'ajuste', 'venda'] as const).map(t => <Chip key={t} label={t} active={filters.transactionType === t} onPress={() => setFilters(f => ({ ...f, transactionType: t }))} />)}
                    </ScrollView></View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}><DateField label="De" value={filters.fromDate} onChange={v => setFilters(f => ({ ...f, fromDate: v }))} /></View>
                        <View style={{ flex: 1 }}><DateField label="Até" value={filters.toDate} onChange={v => setFilters(f => ({ ...f, toDate: v }))} minimumDate={filters.fromDate ? parseISODate(filters.fromDate) : undefined} /></View>
                    </View>
                    <Button title="Aplicar Filtros" onPress={() => setFiltersOpen(false)} full />
                </View>
            </BottomSheet>
        </Screen>
    );
}
