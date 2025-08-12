import React, { useEffect, useState } from 'react';
import Screen from '../components/Screen';
import { Alert, FlatList, Text, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { Button, Card, Chip, Input } from '../components/ui';
import { useTheme } from '../state/ThemeProvider';
import SkeletonList from '../components/SkeletonList';

type Product = { id: string; name: string; unit: 'UN' | 'KG'; meta_por_animal: number };

export default function ProductsAdminScreen() {
  const { profile } = useAuth();
  const { colors, spacing, typography } = useTheme();

  const [list, setList] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'UN' | 'KG'>('UN');
  const [meta, setMeta] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function saveOrUpdate() {
    if (!name.trim() || !meta.trim()) {
      return Alert.alert('Atenção', 'Preencha nome e meta por animal.');
    }
    const m = parseFloat(meta.replace(',', '.'));
    if (Number.isNaN(m) || m < 0) {
      return Alert.alert('Atenção', 'Meta inválida.');
    }

    // evita duplicados básicos (mesmo nome + unidade)
    const already = (list || []).some(
      (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase() && p.unit === unit && (!editing || p.id !== editing.id)
    );
    if (already) {
      return Alert.alert('Atenção', 'Já existe um produto com este nome e unidade.');
    }

    setBusy(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('products')
          .update({ name: name.trim(), unit, meta_por_animal: m } as any)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert({ name: name.trim(), unit, meta_por_animal: m } as any);
        if (error) throw error;
      }
      await load();
      resetForm();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
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

  return (
    <Screen padded>
      <Text style={typography.h1}>Produtos (Admin)</Text>

      <Card style={{ gap: spacing.sm }}>
        <Input value={name} onChangeText={setName} placeholder="Nome" />

        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Chip label="UN" active={unit === 'UN'} onPress={() => setUnit('UN')} />
          <Chip label="KG" active={unit === 'KG'} onPress={() => setUnit('KG')} />
        </View>

        <Input
          value={meta}
          onChangeText={setMeta}
          placeholder="Meta por animal"
          keyboardType="numeric"
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title={editing ? 'Salvar alterações' : 'Adicionar'} loading={busy} onPress={saveOrUpdate} />
          </View>
          {editing && (
            <View style={{ width: 130 }}>
              <Button title="Cancelar" onPress={resetForm} />
            </View>
          )}
        </View>
      </Card>

      {list === null ? (
        <SkeletonList rows={3} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Card style={{ gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                {item.name} <Text style={{ color: colors.muted }}>({item.unit})</Text>
              </Text>
              <Text style={{ color: colors.muted }}>Meta: {item.meta_por_animal} por animal</Text>
              <View style={{ marginTop: spacing.sm, flexDirection: 'row' }}>
                <Button
                  title="Editar"
                  small
                  onPress={() => {
                    setEditing(item);
                    setName(item.name);
                    setUnit(item.unit);
                    setMeta(String(item.meta_por_animal));
                  }}
                />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
