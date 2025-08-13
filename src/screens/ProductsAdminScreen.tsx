// screens/ProductsAdminScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View, StyleSheet } from 'react-native';
import Screen from '../components/Screen';

// UI kit premium — imports diretos
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useTheme } from '../state/ThemeProvider';
import SkeletonList from '../components/SkeletonList';

type Unit = 'UN' | 'KG' | string;
type Product = { id: string; name: string; unit: Unit; meta_por_animal: number };

const SUGGESTED_UNITS: Unit[] = ['UN', 'KG', 'L', 'CX', 'PC'];

export default function ProductsAdminScreen() {
  const { profile } = useAuth();
  const { colors, spacing, typography } = useTheme();

  const [list, setList] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('UN');
  const [meta, setMeta] = useState(''); // aceita "1,7" ou "1.7"
  const [busy, setBusy] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
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
        headerWrap: { gap: spacing.md },
        listWrap: { gap: spacing.sm, paddingTop: spacing.sm },
      }),
    [colors, spacing]
  );

  async function load() {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) Alert.alert('Erro', error.message);
    else setList((data as Product[]) || []);
  }

  useEffect(() => {
    if (profile?.role === 'admin') load();
  }, [profile?.role]);

  function resetForm() {
    setEditing(null);
    setName('');
    setUnit('UN');
    setMeta('');
  }

  // aceita dígitos, vírgula e ponto
  function onChangeMeta(text: string) {
    const cleaned = text.replace(/[^0-9,.\s]/g, '').replace(/\s+/g, '');
    setMeta(cleaned);
  }

  async function saveOrUpdate() {
    if (!name.trim() || !meta.trim()) {
      return Alert.alert('Atenção', 'Preencha nome e meta por animal.');
    }
    // vírgula -> ponto para persistir
    const m = parseFloat(meta.replace(',', '.'));
    if (Number.isNaN(m) || m < 0) {
      return Alert.alert('Atenção', 'Meta inválida.');
    }
    const unitNorm = (unit || '').toString().trim().toUpperCase() as Unit;
    if (!unitNorm) {
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
      return Alert.alert('Atenção', 'Já existe um produto com este nome e unidade.');
    }

    setBusy(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('products')
          .update({ name: name.trim(), unit: unitNorm, meta_por_animal: m } as any)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert({ name: name.trim(), unit: unitNorm, meta_por_animal: m } as any);
        if (error) throw error;
      }
      await load();
      resetForm();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  if (profile?.role !== 'admin') {
    return (
      <Screen padded>
        <Text style={typography.body}>Acesso restrito.</Text>
      </Screen>
    );
  }

  const Header = (
    <View style={styles.headerWrap}>
      <Text style={typography.h1}>Produtos (Admin)</Text>

      {/* Formulário */}
      <Card padding="md" variant="filled" elevationLevel={2} style={{ gap: spacing.sm }}>
        <Input
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Mocotó"
        />

        {/* Unidade dinâmica: input livre + sugestões */}
        <Input
          label="Unidade de medida"
          value={unit}
          onChangeText={(t) => setUnit(String(t).toUpperCase())}
          placeholder="UN, KG, L, CX, ..."
          autoCapitalize="characters"
        />
        <View style={styles.unitRow}>
          {SUGGESTED_UNITS.map((u) => (
            <Chip key={u} label={u} active={String(unit).toUpperCase() === u} onPress={() => setUnit(u)} />
          ))}
        </View>

        {/* Meta por animal com decimal permitindo vírgula */}
        <Input
          label="Meta por animal"
          value={meta}
          onChangeText={onChangeMeta}
          placeholder="Ex.: 1,7 (KG) ou 4 (UN)"
          keyboardType="decimal-pad"
          autoCapitalize="none"
        />

        <View style={styles.actionsRow}>
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
              <Button title="Cancelar" variant="text" onPress={resetForm} />
            </View>
          )}
        </View>

        <Text style={{ color: colors.muted, marginTop: spacing.sm, fontSize: 12 }}>
          Exclusão de produtos está desabilitada para preservar o histórico. Edite o produto caso precise alterar.
        </Text>
      </Card>
    </View>
  );

  return (
    <Screen padded>
      <ScrollView
        // único container rolável (nada de VirtualizedList aqui)
        contentContainerStyle={{
          paddingHorizontal: spacing.md,  // <-- espaçamento lateral de volta
          paddingBottom: spacing.xl,
        }}
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
          <View style={styles.listWrap}>
            {list.map((item) => (
              <Card key={item.id} padding="md" variant="tonal" elevationLevel={0} style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {item.name}{' '}
                  <Text style={{ color: colors.muted }}>({String(item.unit).toUpperCase()})</Text>
                </Text>

                <View style={styles.pill}>
                  <Text style={styles.pillText}>Meta: {item.meta_por_animal} por animal</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <Button
                    title="Editar"
                    small
                    onPress={() => {
                      setEditing(item);
                      setName(item.name);
                      setUnit(String(item.unit).toUpperCase());
                      setMeta(String(item.meta_por_animal).replace('.', ',')); // mostra com vírgula
                    }}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
