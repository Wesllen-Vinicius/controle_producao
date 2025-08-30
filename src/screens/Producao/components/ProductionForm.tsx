// src/screens/Producao/components/ProductionForm.tsx
import { memo } from 'react';
import { Text, View } from 'react-native';
import DateField from '../../../components/DateField';
import ErrorFeedback from '../../../components/ErrorFeedback';
import Button from '../../../components/ui/Button';
import Chip from '../../../components/ui/Chip';
import { InputNumber } from '../../../components/ui/Input';
import { useTheme } from '../../../state/ThemeProvider';
import { Product } from '../types';
import { todayStr, tomorrow } from '../utils';

type Props = {
  prodDate: string;
  setProdDate: (date: string) => void;
  abateStr: string;
  setAbateStr: (abate: string) => void;
  products: Product[] | null;
  selected: string[];
  toggleProduct: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  errors?: Record<string, string>;
};

const ProductionForm = memo(
  ({
    prodDate,
    setProdDate,
    abateStr,
    setAbateStr,
    products,
    selected,
    toggleProduct,
    selectAll,
    clearSelection,
    errors = {},
  }: Props) => {
    const { colors, spacing, typography } = useTheme();

    return (
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text
            style={[
              typography.label,
              { marginBottom: spacing.sm, color: colors.text, fontWeight: '600' },
            ]}
          >
            Data da Produção
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <DateField value={prodDate} onChange={setProdDate} maximumDate={tomorrow()} />
            </View>
            <Button title="Hoje" variant="tonal" onPress={() => setProdDate(todayStr())} />
          </View>
          {errors.date && <ErrorFeedback error={errors.date} />}
        </View>

        <View>
          <Text
            style={[
              typography.label,
              { marginBottom: spacing.sm, color: colors.text, fontWeight: '600' },
            ]}
          >
            Animais Abatidos
          </Text>
          <InputNumber
            mode="integer"
            value={abateStr}
            onChangeText={setAbateStr}
            placeholder="0"
            keyboardType="number-pad"
            maxLength={5}
          />
          {errors.abate && <ErrorFeedback error={errors.abate} />}
        </View>

        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}
          >
            <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>
              Produtos ({selected.length})
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Button title="Todos" variant="text" small onPress={selectAll} />
              <Button title="Limpar" variant="text" small onPress={clearSelection} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(products ?? []).map(p => (
              <Chip
                key={p.id}
                label={p.name}
                active={selected.includes(p.id)}
                onPress={() => toggleProduct(p.id)}
              />
            ))}
          </View>
          {errors.products && <ErrorFeedback error={errors.products} />}
        </View>

        {/* General errors */}
        {errors.general && <ErrorFeedback error={errors.general} />}
        {errors.quantities && <ErrorFeedback error={errors.quantities} />}
      </View>
    );
  }
);

ProductionForm.displayName = 'ProductionForm';

export default ProductionForm;
