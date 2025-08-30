// Produtos/components/ProductListItem.tsx

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Product } from '../types';
// ATENÇÃO: Ajuste o caminho para seus componentes e hooks
import Button from '@/components/ui/Button';
import { useTheme } from '@/state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Props = {
  item: Product;
  onEdit: (item: Product) => void;
  isEditing: boolean;
};

const ProductListItem = ({ item, onEdit, isEditing }: Props) => {
  const { colors, spacing, radius } = useTheme();

  // CORREÇÃO: Movendo os estilos para dentro do componente com useMemo e StyleSheet.create
  const styles = useMemo(
    () =>
      StyleSheet.create({
        productCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          overflow: 'hidden', // A tipagem agora é inferida corretamente
        },
        editingIndicator: {
          position: 'absolute', // A tipagem agora é inferida corretamente
          top: 0,
          left: 0,
          bottom: 0,
          width: 3,
          backgroundColor: colors.accent,
        },
        iconContainer: {
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: colors.primary + '20',
          alignItems: 'center',
          justifyContent: 'center',
        },
        unitBadge: {
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.line,
        },
        cardContentContainer: {
          padding: spacing.md,
          gap: spacing.md,
        },
        mainRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        infoContainer: {
          flex: 1,
          gap: 2,
        },
        nameText: {
          color: colors.text,
          fontWeight: '800',
          fontSize: 16,
        },
        detailsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        unitBadgeText: {
          color: colors.muted,
          fontWeight: '700',
          fontSize: 11,
        },
        metaText: {
          color: colors.muted,
          fontSize: 12,
          fontWeight: '500',
        },
      }),
    [colors, radius, spacing]
  );

  return (
    <View style={styles.productCard}>
      {isEditing && <View style={styles.editingIndicator} />}

      <View style={styles.cardContentContainer}>
        <View style={styles.mainRow}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="package-variant" size={22} color={colors.primary} />
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.nameText}>{item.name}</Text>
            <View style={styles.detailsRow}>
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>{String(item.unit).toUpperCase()}</Text>
              </View>
              <Text style={styles.metaText}>Meta: {item.meta_por_animal} por animal</Text>
            </View>
          </View>

          <Button
            title="Editar"
            small
            variant="tonal"
            onPress={() => onEdit(item)}
            leftIcon={<MaterialCommunityIcons name="pencil" size={14} color={colors.primary} />}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(ProductListItem);
