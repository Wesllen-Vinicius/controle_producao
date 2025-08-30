// src/screens/Estoque/components/InventoryHeader.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { Text, View } from 'react-native';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { useTheme } from '../../../state/ThemeProvider';
import { InventoryStats } from '../types';

type Props = {
  stats: InventoryStats;
  onFilterPress: () => void;
};

const InventoryHeader = memo(({ stats, onFilterPress }: Props) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <View>
          <Text style={[typography.h1, { fontSize: 24, color: colors.text }]}>Estoque</Text>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>
            Controle de Inventário
          </Text>
        </View>
        <Button
          title="Filtros"
          variant="tonal"
          small
          onPress={onFilterPress}
          leftIcon={<MaterialCommunityIcons name="tune-variant" size={16} color={colors.primary} />}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Card
          variant="tonal"
          padding="sm"
          style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: colors.primary }}
        >
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>
            {stats.totalProducts}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 2 }}>
            PRODUTOS
          </Text>
        </Card>
        <Card
          variant="tonal"
          padding="sm"
          style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: colors.danger }}
        >
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.danger }}>
            {stats.negativeStock}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 2 }}>
            NEGATIVOS
          </Text>
        </Card>
        <Card
          variant="tonal"
          padding="sm"
          style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: '#FF8C00' }}
        >
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#FF8C00' }}>
            {stats.lowStock}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 2 }}>
            BAIXOS
          </Text>
        </Card>
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <MaterialCommunityIcons name="package-variant" size={20} color={colors.text} />
          <Text style={[typography.h2, { fontSize: 18, color: colors.text }]}>Saldos Atuais</Text>
        </View>
      </View>
    </View>
  );
});
InventoryHeader.displayName = 'InventoryHeader';

export default InventoryHeader;
