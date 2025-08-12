import React, { useEffect, useState } from 'react';
import Screen from '../components/Screen';
import { Alert, FlatList, Text } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { Button, Card, Input } from '../components/ui';
import { typography } from '../theme';

type Product = { id: string; name: string; unit: 'UN'|'KG'; meta_por_animal: number };

export default function ProductsAdminScreen() {
  const { profile } = useAuth();
  const [list, setList] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState(''); const [unit, setUnit] = useState<'UN'|'KG'>('UN'); const [meta, setMeta] = useState('');

  async function load() {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) Alert.alert('Erro', error.message);
    else setList((data as Product[]) || []);
  }
  useEffect(()=>{ if (profile?.role==='admin') load(); }, [profile?.role]);

  async function save() {
    if (!name || !meta) return Alert.alert('Erro', 'Preencha nome e meta.');
    const m = parseFloat(meta); if (isNaN(m)) return Alert.alert('Erro', 'Meta inválida.');
    const { error } = await supabase.from('products').insert({ name, unit, meta_por_animal: m } as any);
    if (error) Alert.alert('Erro', error.message); else { setName(''); setUnit('UN'); setMeta(''); load(); }
  }
  async function update() {
    if (!editing) return;
    const m = parseFloat(meta); if (isNaN(m)) return Alert.alert('Erro', 'Meta inválida.');
    const { error } = await supabase.from('products').update({ name, unit, meta_por_animal: m } as any).eq('id', editing.id);
    if (error) Alert.alert('Erro', error.message); else { setEditing(null); setName(''); setMeta(''); setUnit('UN'); load(); }
  }

  if (profile?.role !== 'admin') return <Screen><Text style={{ color: '#fff' }}>Acesso restrito.</Text></Screen>;

  return (
    <Screen>
      <Text style={typography.h1 as any}>Produtos (Admin)</Text>
      <Card>
        <Input value={name} onChangeText={setName} placeholder="Nome" />
        <Input value={unit} onChangeText={(t)=>setUnit((t.toUpperCase()==='KG'?'KG':'UN') as any)} placeholder="Unidade (UN ou KG)" />
        <Input value={meta} onChangeText={setMeta} placeholder="Meta por animal" keyboardType="numeric" />
        <Button title={editing ? 'Salvar alterações' : 'Adicionar'} onPress={editing ? update : save} />
      </Card>

      <FlatList
        data={list}
        keyExtractor={(i)=>i.id}
        renderItem={({item})=>(
          <Card style={{ marginTop: 8 }}>
            <Text style={{ color:'#fff', fontWeight:'700' }}>{item.name} ({item.unit})</Text>
            <Text style={{ color:'#cbd5e1', marginTop: 4 }}>Meta: {item.meta_por_animal} por animal</Text>
            <Button title="Editar" small onPress={()=>{ setEditing(item); setName(item.name); setUnit(item.unit); setMeta(String(item.meta_por_animal)); }} />
          </Card>
        )}
      />
    </Screen>
  );
}
