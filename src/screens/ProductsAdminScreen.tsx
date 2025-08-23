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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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
        container: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
        },
        headerSection: { 
          gap: spacing.lg,
          marginBottom: spacing.lg 
        },
        statsRow: { 
          flexDirection: 'row', 
          gap: spacing.sm 
        },
        statCard: {
          flex: 1,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          gap: spacing.xs,
          elevation: 1,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
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
        unitRowContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          flexWrap: 'wrap',
          marginTop: spacing.xs,
        },
        productsList: { 
          gap: spacing.sm 
        },
        productCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          overflow: 'hidden',
        },
        editingIndicator: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: colors.primary,
        }
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

  const saveOrUpdate = useCallback(async () => {
    const trimmedName = name.trim();
    const normalizedUnit = (unit || '').toString().trim().toUpperCase() as Unit;

    if (!trimmedName || trimmedName.length < 2) {
      h.warning();
      return Alert.alert('Atenção', 'O nome do produto deve ter pelo menos 2 caracteres.');
    }

    if (trimmedName.length > 50) {
      h.warning();
      return Alert.alert('Atenção', 'O nome do produto não pode ter mais de 50 caracteres.');
    }

    if (!metaStr.trim() || metaNumber < 0 || metaNumber > 1000) {
      h.warning();
      return Alert.alert('Atenção', 'Informe uma meta válida entre 0 e 1000.');
    }

    if (!normalizedUnit || normalizedUnit.length > 10) {
      h.warning();
      return Alert.alert('Atenção', 'A unidade deve ter entre 1 e 10 caracteres.');
    }

    // Validação de caracteres especiais no nome
    if (!/^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/.test(trimmedName)) {
      h.warning();
      return Alert.alert('Atenção', 'O nome contém caracteres inválidos.');
    }

    // evita duplicados (mesmo nome + unidade)
    const already = (list || []).some(
      (p) =>
        p.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        String(p.unit).toUpperCase() === normalizedUnit &&
        (!editing || p.id !== editing.id)
    );
    if (already) {
      h.warning();
      return Alert.alert('Atenção', 'Já existe um produto com este nome e unidade.');
    }

    setBusy(true);
    try {
      const sanitizedData = {
        name: trimmedName,
        unit: normalizedUnit,
        meta_por_animal: Math.max(0, Math.min(1000, metaNumber))
      };

      if (editing) {
        const { error } = await supabase
          .from('products')
          .update(sanitizedData)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(sanitizedData);
        if (error) throw error;
      }
      
      await load();
      resetForm();
      h.success();
    } catch (e: any) {
      h.error();
      const errorMessage = e?.message?.includes('duplicate') 
        ? 'Produto já existe no sistema.'
        : e?.message?.includes('permission')
        ? 'Acesso negado. Verifique suas permissões.'
        : e?.message ?? 'Falha ao salvar produto.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setBusy(false);
    }
  }, [name, unit, metaStr, metaNumber, list, editing, h, load]);

  if (!isAdmin) {
    return (
      <Screen padded>
        <Text style={typography.body}>Acesso restrito.</Text>
      </Screen>
    );
  }

  /* ===== Cabeçalho (título + stats + formulário) ===== */
  const Header = (
    <View style={styles.headerSection}>
      {/* Page Header */}
      <View>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: spacing.sm
        }}>
          <View>
            <Text style={[typography.h1, { fontSize: 24 }]}>Produtos</Text>
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>
              Gerenciamento de Catálogo
            </Text>
          </View>
          <View style={{
            backgroundColor: colors.success + '20',
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.success + '30'
          }}>
            <Text style={{ 
              color: colors.success, 
              fontSize: 11, 
              fontWeight: '700' 
            }}>
              ADMIN
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Dashboard */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>
              TOTAL PRODUTOS
            </Text>
            <MaterialCommunityIcons name="package-variant" size={14} color={colors.muted} />
          </View>
          <Text style={{ 
            fontWeight: '900', 
            fontSize: 22, 
            color: colors.text,
            letterSpacing: -0.5 
          }}>
            {totalProducts}
          </Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>
              UNIDADES ATIVAS
            </Text>
            <MaterialCommunityIcons name="format-list-bulleted-type" size={14} color={colors.muted} />
          </View>
          <Text style={{ 
            fontWeight: '900', 
            fontSize: 22, 
            color: colors.accent,
            letterSpacing: -0.5 
          }}>
            {totalUnits}
          </Text>
        </View>
      </View>

      {/* Form Section */}
      <View style={styles.formCard}>
        {editing && <View style={styles.editingIndicator} />}
        
        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MaterialCommunityIcons 
              name={editing ? "pencil" : "plus"} 
              size={20} 
              color={editing ? colors.accent : colors.primary} 
            />
            <Text style={[typography.h2, { fontSize: 18 }]}>
              {editing ? 'Editar Produto' : 'Novo Produto'}
            </Text>
          </View>
          {editing && (
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '500' }}>
              Editando: {editing.name}
            </Text>
          )}
        </View>

        <View style={{ gap: spacing.md }}>
          <Input
            label="Nome do produto"
            value={name}
            onChangeText={(text) => setName(text.slice(0, 50))}
            placeholder="Ex.: Mocotó, Linguiça defumada"
            returnKeyType="next"
            maxLength={50}
            autoCorrect={false}
            leftIcon={
              <MaterialCommunityIcons 
                name="package-variant" 
                size={18} 
                color={colors.muted} 
              />
            }
          />

          <View>
            <Input
              label="Unidade de medida"
              value={unit}
              onChangeText={(t) => setUnit(String(t).toUpperCase().slice(0, 10))}
              placeholder="UN, KG, L, CX, PC"
              autoCapitalize="characters"
              returnKeyType="next"
              maxLength={10}
              autoCorrect={false}
              leftIcon={
                <MaterialCommunityIcons 
                  name="scale-balance" 
                  size={18} 
                  color={colors.muted} 
                />
              }
            />
            
            <View style={styles.unitRowContainer}>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>
                Sugestões:
              </Text>
              {[...new Set([...SUGGESTED_UNITS, ...unitsInUse])].map((u) => (
                <Chip
                  key={u}
                  label={u}
                  active={String(unit).toUpperCase() === u}
                  onPress={() => setUnit(u)}
                />
              ))}
            </View>
          </View>

          <InputNumber
            label={`Meta por animal (${String(unit).toUpperCase()})`}
            mode={isIntegerUnit ? 'integer' : 'decimal'}
            decimals={isIntegerUnit ? 0 : 3}
            value={metaStr}
            onChangeText={setMetaStr}
            placeholder={isIntegerUnit ? 'Ex.: 4' : 'Ex.: 1.700'}
            keyboardType="decimal-pad"
            leftIcon={
              <MaterialCommunityIcons 
                name="target" 
                size={18} 
                color={colors.muted} 
              />
            }
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title={editing ? 'Salvar Alterações' : 'Adicionar Produto'}
                loading={busy}
                onPress={saveOrUpdate}
                full
                leftIcon={
                  <MaterialCommunityIcons 
                    name={editing ? "content-save" : "plus"} 
                    size={16} 
                    color={colors.primaryOn || '#FFFFFF'} 
                  />
                }
              />
            </View>
            {editing && (
              <Button
                title="Cancelar"
                variant="text"
                onPress={() => {
                  resetForm();
                  h.light();
                }}
                leftIcon={
                  <MaterialCommunityIcons 
                    name="close" 
                    size={16} 
                    color={colors.muted} 
                  />
                }
              />
            )}
          </View>

          <View style={{
            backgroundColor: colors.surfaceAlt,
            padding: spacing.sm,
            borderRadius: 8,
            borderLeftWidth: 3,
            borderLeftColor: colors.accent
          }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500' }}>
              💡 A exclusão de produtos está desabilitada para preservar o histórico. 
              Use a função editar para modificar informações.
            </Text>
          </View>
        </View>
      </View>
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
        contentContainerStyle={styles.container}
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
          <View style={styles.productsList}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: spacing.sm,
              marginBottom: spacing.sm 
            }}>
              <MaterialCommunityIcons 
                name="package-variant-closed" 
                size={18} 
                color={colors.text} 
              />
              <Text style={[typography.h2, { fontSize: 18 }]}>
                Catálogo de Produtos
              </Text>
            </View>
            
            {list.map((item) => (
              <View key={item.id} style={styles.productCard}>
                {editing?.id === item.id && <View style={styles.editingIndicator} />}
                
                <View style={{ padding: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: colors.primary + '20',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MaterialCommunityIcons 
                        name="package-variant" 
                        size={22} 
                        color={colors.primary} 
                      />
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        color: colors.text, 
                        fontWeight: '800', 
                        fontSize: 16,
                        marginBottom: 2
                      }}>
                        {item.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <View style={{
                          backgroundColor: colors.surfaceAlt,
                          paddingHorizontal: spacing.xs,
                          paddingVertical: 2,
                          borderRadius: 6
                        }}>
                          <Text style={{ 
                            color: colors.muted, 
                            fontWeight: '700', 
                            fontSize: 11 
                          }}>
                            {String(item.unit).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ 
                          color: colors.muted, 
                          fontSize: 12, 
                          fontWeight: '500' 
                        }}>
                          Meta: {item.meta_por_animal} por animal
                        </Text>
                      </View>
                    </View>

                    <Button
                      title="Editar"
                      small
                      variant="tonal"
                      leftIcon={
                        <MaterialCommunityIcons 
                          name="pencil" 
                          size={14} 
                          color={colors.primary} 
                        />
                      }
                      onPress={() => {
                        setEditing(item);
                        setName(item.name);
                        setUnit(String(item.unit).toUpperCase());
                        setMetaStr(String(item.meta_por_animal));
                        h.light();
                      }}
                    />
                  </View>

                  {/* Product details */}
                  <View style={{
                    marginTop: spacing.sm,
                    paddingTop: spacing.sm,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.line,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.lg
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        color: colors.muted, 
                        fontSize: 11, 
                        fontWeight: '600' 
                      }}>
                        UNIDADE DE MEDIDA
                      </Text>
                      <Text style={{ 
                        color: colors.text, 
                        fontSize: 14, 
                        fontWeight: '700',
                        marginTop: 2
                      }}>
                        {String(item.unit).toUpperCase()}
                      </Text>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        color: colors.muted, 
                        fontSize: 11, 
                        fontWeight: '600' 
                      }}>
                        META POR ANIMAL
                      </Text>
                      <Text style={{ 
                        color: colors.primary, 
                        fontSize: 14, 
                        fontWeight: '700',
                        marginTop: 2
                      }}>
                        {item.meta_por_animal}
                      </Text>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <MaterialCommunityIcons 
                        name="chevron-right" 
                        size={20} 
                        color={colors.line} 
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </Screen>
  );
}
