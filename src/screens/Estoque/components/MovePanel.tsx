// src/screens/Estoque/components/MovePanel.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Chip from '../../../components/ui/Chip';
import Input, { InputNumber } from '../../../components/ui/Input';
import { useTheme } from '../../../state/ThemeProvider';
import { Balance, Product, Transaction } from '../types';
import { formatQuantity, isUnitType } from '../utils';

interface MovePanelProps {
  products: Product[] | null;
  mvProd: string | null;
  setMvProd: (id: string) => void;
  mvType: Transaction['tx_type'];
  setMvType: (type: Transaction['tx_type']) => void;
  mvCustomer: string;
  setMvCustomer: (customer: string) => void;
  mvObservation: string;
  setMvObservation: (observation: string) => void;
  mvJustification: string;
  setMvJustification: (justification: string) => void;
  mvQty: string;
  setMvQty: (qty: string) => void;
  balances: Balance[] | null;
  addTx: () => void;
  saving: boolean;
  profile: any;
}

const MovePanel = memo(({ products, mvProd, setMvProd, mvType, setMvType, mvCustomer, setMvCustomer, mvObservation, setMvObservation, mvJustification, setMvJustification, mvQty, setMvQty, balances, addTx, saving, profile }: MovePanelProps) => {
    const { colors, spacing, typography, radius } = useTheme();
    const prodsById = useMemo(() => new Map((products || []).map(p => [p.id, p])), [products]);
    const mvProdUnit = mvProd ? prodsById.get(mvProd)?.unit : null;
    const isInteger = isUnitType(mvProdUnit);

    const saldoAtual = mvProd ? (balances || []).find(b => b.product_id === mvProd)?.saldo ?? 0 : 0;
    const valNum = parseFloat((mvQty || '0').replace(',', '.')) || 0;
    const delta = mvType === 'entrada' ? valNum : (mvType === 'saida' || mvType === 'venda') ? -valNum : mvType === 'ajuste' ? (valNum - saldoAtual) : 0;
    const previsto = saldoAtual + delta;

    const formValido = !!mvProd && valNum > 0 &&
        (mvType !== 'ajuste' || mvObservation.trim()) &&
        (mvType !== 'saida' || mvJustification.trim());

    const isAdmin = profile?.role === 'admin';
    const txTypeOptions = [
        { id: 'entrada', label: 'Entrada', icon: 'plus-circle', color: colors.success, description: 'Adicionar ao estoque' },
        { id: 'saida', label: 'Saída', icon: 'minus-circle', color: colors.danger, description: 'Retirar do estoque' },
        ...(isAdmin ? [{ id: 'ajuste', label: 'Ajuste', icon: 'tune-variant', color: colors.accent, description: 'Correção de saldo (Admin)' }] : []),
        { id: 'venda', label: 'Venda', icon: 'cash-register', color: '#FF8C00', description: 'Venda para cliente' }
    ];

    return (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={{ gap: spacing.lg, padding: spacing.md }}>
                {/* Product Selection */}
                <View>
                    <Text style={[typography.h2, { fontSize: 16, color: colors.text, marginBottom: spacing.sm }]}>Produto</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                        {(products || []).map(p => <Chip key={p.id} label={`${p.name} (${p.unit})`} active={mvProd === p.id} onPress={() => setMvProd(p.id)} />)}
                    </ScrollView>
                </View>

                {/* Transaction Type */}
                <View>
                    <Text style={[typography.h2, { fontSize: 16, color: colors.text, marginBottom: spacing.sm }]}>Tipo de Movimentação</Text>
                    <View style={{ gap: spacing.sm }}>
                        {txTypeOptions.map(option => (
                            <Pressable key={option.id} onPress={() => setMvType(option.id as any)} style={{ borderRadius: radius.md, borderWidth: 2, borderColor: mvType === option.id ? option.color : colors.line, backgroundColor: mvType === option.id ? option.color + '10' : colors.surface, padding: spacing.md }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                    <MaterialCommunityIcons name={option.icon as any} size={20} color={mvType === option.id ? option.color : colors.muted} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '600', color: mvType === option.id ? option.color : colors.text, fontSize: 14 }}>{option.label}</Text>
                                        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{option.description}</Text>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {mvType === 'venda' && <Input label="Cliente (opcional)" value={mvCustomer} onChangeText={setMvCustomer} placeholder="Ex: João Silva" />}
                {mvType === 'ajuste' && <Input label="Observação *" value={mvObservation} onChangeText={setMvObservation} placeholder="Ex: Correção de inventário" multiline />}
                {mvType === 'saida' && <Input label="Justificativa *" value={mvJustification} onChangeText={setMvJustification} placeholder="Ex: Produto defeituoso" multiline />}

                <View>
                    <Text style={[typography.h2, { fontSize: 16, color: colors.text, marginBottom: spacing.sm }]}>Quantidade</Text>
                    <InputNumber mode={isInteger ? 'integer' : 'decimal'} decimals={isInteger ? 0 : 3} value={mvQty} onChangeText={setMvQty} placeholder="0" suffix={mvProdUnit ?? undefined} />
                </View>

                {mvProd && (
                    <Card padding="md" variant="filled" style={{ backgroundColor: previsto < 0 ? colors.danger + '05' : colors.success + '05', borderWidth: 1, borderColor: previsto < 0 ? colors.danger + '30' : colors.success + '30' }}>
                        <Text style={[typography.label, { fontWeight: '600', fontSize: 14, color: colors.text, marginBottom: spacing.sm }]}>Previsão de Saldo</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
                            <View style={{ alignItems: 'center' }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>ATUAL</Text><Text style={{ fontWeight: '900', fontSize: 18, color: saldoAtual < 0 ? colors.danger : colors.text }}>{formatQuantity(mvProdUnit, saldoAtual)}</Text></View>
                            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.muted} />
                            <View style={{ alignItems: 'center' }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>PREVISTO</Text><Text style={{ fontWeight: '900', fontSize: 18, color: previsto < 0 ? colors.danger : colors.success }}>{formatQuantity(mvProdUnit, previsto)}</Text></View>
                        </View>
                    </Card>
                )}

                <View style={{ gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line }}>
                    <Button title="Registrar Movimentação" onPress={addTx} loading={saving} disabled={saving || !formValido} full />
                    <Button title="Limpar" variant="text" onPress={() => { setMvQty(''); setMvCustomer(''); setMvObservation(''); setMvJustification(''); }} disabled={saving} full />
                </View>
            </View>
        </ScrollView>
    );
});

export default MovePanel;
