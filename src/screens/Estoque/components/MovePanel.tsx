// src/screens/Estoque/components/MovePanel.tsx

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/ui/Button';
import Card from '../../../components/ui/Card';
import Chip from '../../../components/ui/Chip';
import Input, { InputNumber } from '../../../components/ui/Input';
import { useTheme } from '../../../state/ThemeProvider';
import { Balance, Product, Transaction, TransactionType } from '../types';
import { formatQuantity, isUnitType } from '../utils';

// --- Estado Unificado do Formulário ---
interface FormState {
  qty: string;
  customer: string;
  observation: string;
  justification: string;
}

const INITIAL_FORM_STATE: FormState = {
  qty: '', customer: '', observation: '', justification: '',
};

// --- Tipos para as Props dos Subcomponentes ---
type ProductSelectorProps = {
  products: Product[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type TxTypeOption = {
  id: TransactionType;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; // Tipo mais forte para o nome do ícone
  color: string;
  description: string;
};

type TransactionTypeSelectorProps = {
  options: TxTypeOption[];
  selectedType: TransactionType;
  onSelect: (type: TransactionType) => void;
};

type BalancePreviewProps = {
  product: Product | null;
  current: number;
  projected: number;
};

// --- Componente de Seção Reutilizável ---
const Section = memo(({ title, children }: { title: string; children: React.ReactNode }) => {
  const { typography, colors } = useTheme();
  return (
    <View>
      <Text style={[typography.h2, styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
});

// --- Subcomponentes Memoizados e Tipados ---
const ProductSelector = memo(({ products, selectedId, onSelect }: ProductSelectorProps) => (
  <FlatList
    horizontal
    data={products}
    keyExtractor={item => item.id}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chipContainer}
    renderItem={({ item }) => (
      <Chip label={`${item.name} (${item.unit})`} active={selectedId === item.id} onPress={() => onSelect(item.id)} />
    )}
  />
));

const TransactionTypeSelector = memo(({ options, selectedType, onSelect }: TransactionTypeSelectorProps) => {
  const { colors, typography, radius } = useTheme();
  return (
    <View style={styles.txTypeContainer}>
      {options.map((option: TxTypeOption) => {
        const isActive = selectedType === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={[styles.txTypeButton, {
              borderColor: isActive ? option.color : colors.line,
              backgroundColor: isActive ? colors.surfaceAlt : colors.surface,
            }]}
          >
            <View style={styles.txTypeButtonContent}>
              <MaterialCommunityIcons name={option.icon} size={20} color={isActive ? option.color : colors.muted} />
              <View style={styles.txTypeInfo}>
                <Text style={{ ...typography.body, fontWeight: '600', color: isActive ? option.color : colors.text }}>{option.label}</Text>
                <Text style={[typography.body, styles.txTypeDescription, { color: colors.muted }]}>{option.description}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

const BalancePreview = memo(({ product, current, projected }: BalancePreviewProps) => {
  const { colors, typography } = useTheme();
  const hasNegativeProjection = projected < 0;
  return (
    <Card style={{
      backgroundColor: colors.surfaceAlt,
      borderColor: hasNegativeProjection ? colors.danger : colors.success,
      borderWidth: 1
    }}>
      <Text style={[typography.label, styles.balanceTitle, { color: colors.text }]}>Previsão de Saldo</Text>
      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <Text style={[typography.label, styles.balanceLabel, { color: colors.muted }]}>ATUAL</Text>
          <Text style={[typography.h2, styles.balanceValue, { color: current < 0 ? colors.danger : colors.text }]}>{formatQuantity(product?.unit, current)}</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={20} color={colors.muted} />
        <View style={styles.balanceItem}>
          <Text style={[typography.label, styles.balanceLabel, { color: colors.muted }]}>PREVISTO</Text>
          <Text style={[typography.h2, styles.balanceValue, { color: hasNegativeProjection ? colors.danger : colors.success }]}>{formatQuantity(product?.unit, projected)}</Text>
        </View>
      </View>
    </Card>
  );
});

interface MovePanelProps {
  products: Product[] | null;
  balances: Balance[] | null;
  profile: any;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'created_at' | 'user_id'>) => void;
  isSubmitting: boolean;
}

// --- Componente Principal (Agora 100% Tipado) ---
const MovePanel = memo(({ products, balances, profile, onAddTransaction, isSubmitting }: MovePanelProps) => {
  const { colors } = useTheme();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [txType, setTxType] = useState<TransactionType>('entrada');
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm(prevState => ({ ...prevState, [field]: value }));
  }, []);

  const prodsById = useMemo(() => new Map((products || []).map(p => [p.id, p])), [products]);
  // CORREÇÃO 1: Adicionado `|| null` para garantir que o tipo seja `Product | null` e não `Product | null | undefined`.
  const selectedProduct = useMemo(() => selectedProductId ? (prodsById.get(selectedProductId) || null) : null, [selectedProductId, prodsById]);
  const isInteger = useMemo(() => isUnitType(selectedProduct?.unit), [selectedProduct]);

  const currentBalance = useMemo(() => {
    if (!selectedProductId || !balances) return 0;
    return balances.find(b => b.product_id === selectedProductId)?.saldo ?? 0;
  }, [selectedProductId, balances]);

  const projectedBalance = useMemo(() => {
    const qtyValue = parseFloat((form.qty || '0').replace(',', '.')) || 0;
    if (qtyValue === 0) return currentBalance;
    switch (txType) {
      case 'entrada': return currentBalance + qtyValue;
      case 'saida': case 'venda': return currentBalance - qtyValue;
      case 'ajuste': return qtyValue;
      default: return currentBalance;
    }
  }, [form.qty, txType, currentBalance]);

  const isFormValid = useMemo(() => {
    const qtyValue = parseFloat((form.qty || '0').replace(',', '.')) || 0;
    if (!selectedProductId || qtyValue <= 0) return false;
    if (txType === 'ajuste' && !form.observation.trim()) return false;
    if (txType === 'saida' && !form.justification.trim()) return false;
    return true;
  }, [selectedProductId, form, txType]);

  const isAdmin = profile?.role === 'admin';
  // CORREÇÃO 2: Adicionamos o tipo explícito `TxTypeOption[]` para ajudar o TypeScript.
  const txTypeOptions: TxTypeOption[] = useMemo(() => [
    { id: 'entrada', label: 'Entrada', icon: 'plus-circle', color: colors.success, description: 'Adicionar ao estoque' },
    { id: 'saida', label: 'Saída', icon: 'minus-circle', color: colors.danger, description: 'Retirar do estoque' },
    ...(isAdmin ? [{ id: 'ajuste' as TransactionType, label: 'Ajuste', icon: 'tune-variant' as const, color: colors.accent, description: 'Correção de saldo (Admin)' }] : []),
    { id: 'venda', label: 'Venda', icon: 'cash-register', color: colors.accent, description: 'Venda para cliente' }
  ], [isAdmin, colors]);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM_STATE);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isFormValid || !selectedProduct) return;
    const qtyValue = parseFloat((form.qty || '0').replace(',', '.')) || 0;
    onAddTransaction({
        product_id: selectedProduct.id,
        tx_type: txType,
        quantity: Math.abs(qtyValue),
        delta: projectedBalance - currentBalance,
        balance_after: projectedBalance,
        source_production_id: null,
        customer: txType === 'venda' ? form.customer.trim() : null,
        observation: txType === 'ajuste' ? form.observation.trim() : null,
        justification: txType === 'saida' ? form.justification.trim() : null,
    });
  }, [isFormValid, selectedProduct, form, txType, projectedBalance, currentBalance, onAddTransaction]);

  return (
    <View style={styles.panelContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="1. Selecione o Produto">
          <ProductSelector products={products} selectedId={selectedProductId} onSelect={setSelectedProductId} />
        </Section>

        <Section title="2. Escolha a Movimentação">
          <TransactionTypeSelector options={txTypeOptions} selectedType={txType} onSelect={setTxType} />
        </Section>

        <Section title="3. Preencha os Detalhes">
          <Card style={styles.detailsCard}>
            {txType === 'venda' && <Input label="Cliente (opcional)" value={form.customer} onChangeText={v => updateField('customer', v)} placeholder="Ex: João Silva" />}
            {txType === 'ajuste' && <Input label="Observação *" value={form.observation} onChangeText={v => updateField('observation', v)} placeholder="Ex: Correção de inventário" multiline />}
            {txType === 'saida' && <Input label="Justificativa *" value={form.justification} onChangeText={v => updateField('justification', v)} placeholder="Ex: Produto defeituoso" multiline />}

            <InputNumber label="Quantidade" mode={isInteger ? 'integer' : 'decimal'} decimals={isInteger ? 0 : 3} value={form.qty} onChangeText={v => updateField('qty', v)} placeholder="0" suffix={selectedProduct?.unit ?? undefined} />
          </Card>
        </Section>

        {selectedProductId && <BalancePreview product={selectedProduct} current={currentBalance} projected={projectedBalance} />}
      </ScrollView>

      <View style={[styles.actionsContainer, { borderTopColor: colors.line }]}>
        <Button title="Registrar Movimentação" onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting} full />
        <Button title="Limpar Campos" variant="text" onPress={resetForm} disabled={isSubmitting} full />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  panelContainer: { flex: 1 },
  scrollContent: { padding: 16, gap: 24 },
  sectionTitle: { fontSize: 18, marginBottom: 12, fontWeight: '600' },
  chipContainer: { paddingBottom: 4 },
  txTypeContainer: { gap: 8 },
  txTypeButton: { borderWidth: 2, borderRadius: 12, padding: 12 },
  txTypeButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txTypeInfo: { flex: 1 },
  txTypeDescription: { fontSize: 12, marginTop: 2 },
  detailsCard: { gap: 16 },
  balanceTitle: { fontWeight: '600', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  balanceItem: { alignItems: 'center', gap: 4 },
  balanceLabel: { fontSize: 11, fontWeight: '600' },
  balanceValue: { fontSize: 18, fontWeight: '800' },
  actionsContainer: { padding: 16, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});

export default MovePanel;
