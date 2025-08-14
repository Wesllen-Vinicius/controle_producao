// screens/ProductsAdminScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Screen from '../components/Screen';

// UI kit premium
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { InputNumber } from '../components/ui/Input';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import SkeletonList from '../components/SkeletonList';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useTheme } from '../state/ThemeProvider';
import { useHaptics } from '../hooks/useHaptics';

type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'PC' | string;
type Product = { id: string; name: string; unit: Unit; meta_por_animal: number };

const SUGGESTED_UNITS: Unit[] = ['UN', 'KG', 'L', 'CX', 'PC'];

export default function ProductsAdminScreen() {
  const { profile } = useAuth();
  const { colors, spacing, typography, radius } = useTheme();
  const h = useHaptics();

  const [list, setList] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('UN');
  const [metaStr, setMetaStr] = useState<string>(''); // String controlada pelo InputNumber
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerGap: { gap: spacing.md },
        listGap: { gap: spacing.sm, paddingTop: spacing.sm },
        pill: {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.line,
          borderWidth: 1,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderRadius: 999,
          alignSelf: 'flex-start',
        },
        pillText: { color: colors.muted, fontWeight: '700' },
        unitRowContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          flexWrap: 'wrap',
        },
        statCard: {
          flex: 1,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
        },
        statLabel: { color: colors.muted, fontWeight: '700' },
        statValue: { fontWeight: '900', fontSize: 18, color: colors.text, marginTop: 2 },
      }),
    [colors, spacing, radius]
  );

  const isAdmin = profile?.role === 'admin';

  const unitsInUse: Unit[] = useMemo(() => {
    const s = new Set<string>();
    (list || []).forEach((p) => s.add(String(p.unit).toUpperCase()));
    return Array.from(s) as Unit[];
  }, [list]);

  const totalProducts = list?.length ?? 0;
  const totalUnits = unitsInUse.length;

  const isIntegerUnit = String(unit).toUpperCase() === 'UN';
  const metaNumber = useMemo(() => {
    // metaStr vem do InputNumber já padronizada (ponto decimal)
    const n = parseFloat(metaStr || '0');
    return Number.isFinite(n) ? n : 0;
  }, [metaStr]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) Alert.alert('Erro', error.message);
    else setList((data as Product[]) || []);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function resetForm() {
    setEditing(null);
    setName('');
    setUnit('UN');
    setMetaStr('');
  }

  async function saveOrUpdate() {
    if (!name.trim()) {
      h.warning();
      return Alert.alert('Atenção', 'Preencha o nome do produto.');
    }
    if (!metaStr.trim() || metaNumber < 0) {
      h.warning();
      return Alert.alert('Atenção', 'Informe uma meta por animal válida.');
    }
    const unitNorm = (unit || '').toString().trim().toUpperCase() as Unit;
    if (!unitNorm) {
      h.warning();
      return Alert.alert('Atenção', 'Informe a unidade.');
    }

    // evita duplicados (mesmo nome + unidade)
    const already = (list || []).some(
      (p) =>
        p.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        String(p.unit).toUpperCase() === unitNorm &&
        (!editing || p.id !== editing.id)
    );
    if (already) {
      h.warning();
      return Alert.alert('Atenção', 'Já existe um produto com este nome e unidade.');
    }

    setBusy(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('products')
          .update({ name: name.trim(), unit: unitNorm, meta_por_animal: metaNumber } as any)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert({ name: name.trim(), unit: unitNorm, meta_por_animal: metaNumber } as any);
        if (error) throw error;
      }
      await load();
      resetForm();
      h.success();
    } catch (e: any) {
      h.error();
      Alert.alert('Erro', e.message ?? 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <Screen padded>
        <Text style={typography.body}>Acesso restrito.</Text>
      </Screen>
    );
  }

  /* ===== Cabeçalho (título + stats + formulário) ===== */
  const Header = (
    <View style={styles.headerGap}>

      {/* Mini-stats estilo apps grandes */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Produtos</Text>
          <Text style={styles.statValue}>{totalProducts}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Unidades em uso</Text>
          <Text style={styles.statValue}>{totalUnits}</Text>
        </View>
      </View>

      {/* Formulário */}
      <Card padding="md" variant="filled" elevationLevel={2} style={{ gap: spacing.sm }}>
        <Input
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Mocotó"
          returnKeyType="next"
        />

        {/* Unidade dinâmica: input livre + sugestões */}
        <Input
          label="Unidade de medida"
          value={unit}
          onChangeText={(t) => setUnit(String(t).toUpperCase())}
          placeholder="UN, KG, L, CX, ..."
          autoCapitalize="characters"
          returnKeyType="next"
        />

        {/* Sugestões (sistema mistura favoritas + em uso) */}
        <View style={styles.unitRowContainer}>
          {[...new Set([...SUGGESTED_UNITS, ...unitsInUse])].map((u) => (
            <Chip
              key={u}
              label={u}
              active={String(unit).toUpperCase() === u}
              onPress={() => setUnit(u)}
            />
          ))}
        </View>

        {/* Meta por animal com InputNumber (ajusta inteiro x decimal pelo tipo da unidade) */}
        <InputNumber
          label={`Meta por animal (${String(unit).toUpperCase()})`}
          mode={isIntegerUnit ? 'integer' : 'decimal'}
          decimals={isIntegerUnit ? 0 : 3}
          value={metaStr}
          onChangeText={setMetaStr}
          placeholder={isIntegerUnit ? 'Ex.: 4' : 'Ex.: 1.700'}
          keyboardType="decimal-pad"
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <Button
              title={editing ? 'Salvar alterações' : 'Adicionar'}
              loading={busy}
              onPress={saveOrUpdate}
              full
            />
          </View>
          {editing && (
            <View style={{ width: 140 }}>
              <Button
                title="Cancelar"
                variant="text"
                onPress={() => {
                  resetForm();
                  h.light();
                }}
              />
            </View>
          )}
        </View>

        <Text style={{ color: colors.muted, marginTop: spacing.sm, fontSize: 12 }}>
          Exclusão de produtos está desabilitada para preservar o histórico. Edite o produto caso precise alterar.
        </Text>
      </Card>
    </View>
  );

  /* ===== Render ===== */
  return (
    <Screen padded={false} scroll={false}>
      <Animated.ScrollView
        // elasticidade estilo “app grande”
        bounces
        overScrollMode="always"
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
          rowGap: spacing.md, // RN novos suportam rowGap/gap
        } as any}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {Header}

        {list === null ? (
          <View style={{ marginTop: spacing.md }}>
            <SkeletonList rows={3} />
          </View>
        ) : list.length === 0 ? (
          <View style={{ marginTop: spacing.md }}>
            <EmptyState title="Nenhum produto cadastrado" />
          </View>
        ) : (
          <View style={styles.listGap}>
            {list.map((item) => (
              <Card key={item.id} padding="md" variant="tonal" elevationLevel={0} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>
                    {item.name}{' '}
                    <Text style={{ color: colors.muted }}>({String(item.unit).toUpperCase()})</Text>
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                      borderWidth: StyleSheet.hairlineWidth,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12 }}>
                      Meta {item.meta_por_animal}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    title="Editar"
                    small
                    onPress={() => {
                      setEditing(item);
                      setName(item.name);
                      setUnit(String(item.unit).toUpperCase());
                      // Mostramos com ponto (InputNumber já trata); se quiser vírgula visual, ajuste seu InputNumber
                      setMetaStr(String(item.meta_por_animal));
                      h.light();
                    }}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </Screen>
  );
}
