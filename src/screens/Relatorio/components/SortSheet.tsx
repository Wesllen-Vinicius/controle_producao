import { StyleSheet, View } from 'react-native';
import BottomSheet from '../../../components/ui/BottomSheet';
import Chip from '../../../components/ui/Chip';
import { useTheme } from '../../../state/ThemeProvider';
import { SortOption } from '../types';

interface SortSheetProps {
  open: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function SortSheet({ open, onClose, currentSort, onSortChange }: SortSheetProps) {
  const { spacing } = useTheme();

  const handleSortChange = (sort: SortOption) => {
    onSortChange(sort);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Ordenar Produtos Por">
      <View style={[styles.content, { gap: spacing.sm }]}>
        <Chip
          label="📈 Maior Produção"
          active={currentSort === 'produced'}
          onPress={() => handleSortChange('produced')}
          style={styles.chip}
        />
        <Chip
          label="🎯 Maior Eficiência"
          active={currentSort === 'compliance'}
          onPress={() => handleSortChange('compliance')}
          style={styles.chip}
        />
        <Chip
          label="📝 Nome (A-Z)"
          active={currentSort === 'name'}
          onPress={() => handleSortChange('name')}
          style={styles.chip}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
    content: { padding: 16 },
    chip: { width: '100%' },
});
