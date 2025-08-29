// Produtos/components/ProductForm.tsx

import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Input, { InputNumber } from '@/components/ui/Input';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react'; // Importa o React
import { StyleSheet, Text, View } from 'react-native';
import { Product, Unit } from '../types';


const SUGGESTED_UNITS: Unit[] = ['UN', 'KG', 'L', 'CX', 'PC'];

type Props = {
  editingProduct: Product | null;
  onSubmit: (productData: Omit<Product, 'id'>) => Promise<{ success: boolean }>;
  onCancel: () => void;
  isBusy: boolean; // Estado de loading geral da página
  unitsInUse: Unit[];
};

// Envolvemos o componente com React.memo para otimizar a performance
export const ProductForm = React.memo(({ editingProduct, onSubmit, onCancel, isBusy, unitsInUse }: Props) => {
  const { colors, spacing, typography, radius } = useTheme();
  const h = useHaptics();

  // BUG FIX: Estado de loading local, apenas para o envio do formulário
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('UN');
  const [metaStr, setMetaStr] = useState('');
  const nameInputRef = useRef<any>(null);

  const styles = useMemo(() => StyleSheet.create({
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: colors.line,
    },
    editingIndicator: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 3,
      backgroundColor: colors.accent,
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
    },
    unitRowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
      marginTop: spacing.xs,
    },
    infoBox: {
        backgroundColor: colors.surfaceAlt,
        padding: spacing.sm,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent
    },
    formSectionHeader: {
        gap: spacing.sm,
        marginBottom: spacing.md
    },
    formSectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm
    },
    formFieldsContainer: {
        gap: spacing.md
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center'
    },
    mainButtonContainer: {
        flex: 1
    }
  }), [colors, radius, spacing, typography]);


  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setUnit(editingProduct.unit);
      setMetaStr(String(editingProduct.meta_por_animal));
      setTimeout(() => nameInputRef.current?.focus(), 200);
    } else {
      setName('');
      setUnit('UN');
      setMetaStr('');
    }
  }, [editingProduct]);

  const metaNumber = useMemo(() => {
    const n = parseFloat(metaStr.replace(',', '.') || '0');
    return isFinite(n) ? n : 0;
  }, [metaStr]);

  const isIntegerUnit = unit.toUpperCase() === 'UN';

  const handleSubmit = async () => {
    h.light();
    // BUG FIX: Ativa o loading local e desativa no final
    setIsSubmitting(true);
    try {
      const productData = {
        name: name.trim(),
        unit: unit.trim().toUpperCase(),
        meta_por_animal: metaNumber,
      };
      const { success } = await onSubmit(productData);
      if (success) {
        h.success();
      } else {
        h.error();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    h.light();
    onCancel();
  };

  const allUnits = useMemo(() => [...new Set([...SUGGESTED_UNITS, ...unitsInUse])], [unitsInUse]);

  return (
    <View style={styles.formCard}>
      {editingProduct && <View style={styles.editingIndicator} />}

      <View style={styles.formSectionHeader}>
        <View style={styles.formSectionHeaderRow}>
          <MaterialCommunityIcons
            name={editingProduct ? "pencil" : "plus"}
            size={20}
            color={editingProduct ? colors.accent : colors.primary}
          />
          <Text style={[typography.h2, { fontSize: 18, color: colors.text }]}>
            {editingProduct ? 'Editar Produto' : 'Novo Produto'}
          </Text>
        </View>
        {editingProduct && (
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '500' }}>
            Editando: {editingProduct.name}
          </Text>
        )}
      </View>

      <View style={styles.formFieldsContainer}>
        <Input
          ref={nameInputRef}
          label="Nome do produto"
          value={name}
          onChangeText={(text) => setName(text.slice(0, 50))}
          placeholder="Ex.: Mocotó, Linguiça defumada"
          maxLength={50}
          autoCorrect={false}
          leftIcon={<MaterialCommunityIcons name="package-variant" size={18} color={colors.muted} />}

        />

        <View>
          <Input
            label="Unidade de medida"
            value={unit}
            onChangeText={(t) => setUnit(String(t).toUpperCase().slice(0, 10))}
            placeholder="UN, KG, L..."
            autoCapitalize="characters"
            maxLength={10}
            autoCorrect={false}
            leftIcon={<MaterialCommunityIcons name="scale-balance" size={18} color={colors.muted} />}
      />
          <View style={styles.unitRowContainer}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>Sugestões:</Text>
            {allUnits.map((u) => (
              <Chip key={u} label={u} active={unit.toUpperCase() === u} onPress={() => setUnit(u)} />
            ))}
          </View>
        </View>

        <InputNumber
          label={`Meta por animal (${unit.toUpperCase()})`}
          mode={isIntegerUnit ? 'integer' : 'decimal'}
          decimals={isIntegerUnit ? 0 : 3}
          value={metaStr}
          onChangeText={setMetaStr}
          placeholder={isIntegerUnit ? 'Ex.: 4' : 'Ex.: 1.700'}
          keyboardType="decimal-pad"
          leftIcon={<MaterialCommunityIcons name="target" size={18} color={colors.muted} />}
        />

        <View style={styles.actionButtonsRow}>
          <View style={styles.mainButtonContainer}>
            <Button
              title={editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
              // BUG FIX: usa o estado de loading local (isSubmitting)
              loading={isSubmitting}
              // UX MELHORADA: desabilita se a página estiver ocupada ou se o form já estiver sendo enviado
              disabled={isBusy || isSubmitting}
              onPress={handleSubmit}
              full
              leftIcon={<MaterialCommunityIcons name={editingProduct ? "content-save" : "plus"} size={16} color={colors.primaryOn || '#FFFFFF'} />}
            />
          </View>
          {editingProduct && (
            <Button title="Cancelar" variant="text" onPress={handleCancel} disabled={isSubmitting} />
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500', lineHeight: 16 }}>
            💡 A exclusão de produtos está desabilitada para preservar o histórico. Use a edição para modificar.
          </Text>
        </View>
      </View>
    </View>
  );
});
