import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../../../components/ui/BottomSheet';
import Button from '../../../components/ui/Button';
import Chip from '../../../components/ui/Chip';
import { useTheme } from '../../../state/ThemeProvider';
import { handleExport } from '../services/exportService';
import { DayTotals, ExportFormat, ProductTotals } from '../types';

interface ExportSheetProps {
  open: boolean;
  onClose: () => void;
  hasProductFilter: boolean;
  data: DayTotals[] | ProductTotals[];
}

export function ExportSheet({ open, onClose, hasProductFilter, data }: ExportSheetProps) {
  const { colors, spacing } = useTheme();
  const [format, setFormat] = useState<ExportFormat>('csv');

  const onExport = () => {
    handleExport(format, hasProductFilter, data);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Exportar Relatório">
      <View style={[styles.content, { gap: spacing.lg }]}>
        <View style={{ gap: spacing.sm }}>
            <Text style={[styles.label, { color: colors.muted }]}>Formato do Arquivo</Text>
            <View style={styles.chipContainer}>
                <Chip label="📊 CSV" active={format === 'csv'} onPress={() => setFormat('csv')} />
                <Chip label="📋 JSON" active={format === 'json'} onPress={() => setFormat('json')} />
                <Chip label="📄 PDF" active={format === 'pdf'} onPress={() => setFormat('pdf')} />
            </View>
        </View>

        <Text style={[styles.infoText, { color: colors.muted }]}>
          {hasProductFilter
            ? 'A exportação conterá o detalhamento diário para os filtros selecionados.'
            : 'A exportação conterá os totais por produto para o período selecionado.'}
        </Text>
        <Button title="Exportar Agora" onPress={onExport} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
    content: { padding: 16 },
    label: { fontWeight: '600', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    chipContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    infoText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
