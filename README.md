## `README.md`

```markdown
# Produção & Estoque (Expo + Supabase)

App mobile (Expo/React Native + TypeScript) para controlar **produção diária** e **estoque** de produtos de abate.
Foco em fluxo simples e responsivo (S25 Ultra / S25 / S24+), design dark inspirado no Reddit, microinterações (haptics), e dados dinâmicos do Supabase.

## ✨ Principais recursos

- **Autenticação** por e-mail/senha (Supabase Auth).
- **Produção diária**:
  - Usuário informa **data** e **abate** (animais).
  - Produtos são **dinâmicos** (definidos por administradores).
  - Para cada produto: **Meta = abate × meta_por_animal**, **Dif = meta − produção**, **Média = produção ÷ abate** (tudo em tempo real).
  - Ao salvar, cria `productions` + `production_items` e gera **entrada automática no estoque**.
- **Estoque**:
  - Cards com **saldo por produto**.
  - Movimentações manuais: **carregamento (entrada)**, **saída**, **ajuste**, **transferência**, **venda**.
  - Histórico com **filtros** (produto, tipo, período) e detalhes.
- **Admin**:
  - CRUD de **produtos** (nome, unidade **UN/KG**, `meta_por_animal`).
  - Controle de acesso por **papéis** (`user` / `admin`).
- **UX**:
  - Tema dark, chips, cards, skeletons, toasts com **UNDO** e **haptics**.

## 🧱 Stack

- **Expo** (React Native + TypeScript)
- **@react-navigation** (stack + bottom tabs)
- **Supabase** (Auth, Postgres, RLS)
- **expo-haptics**, **@expo/vector-icons**

## 📦 Estrutura
```

src/
components/
Screen.tsx # container responsivo
ui.tsx # Card, Input, Button, Chip, KPI, Skeleton, EmptyState
navigation/
index.tsx # tabs + modais de detalhe
screens/
AuthScreen.tsx
ProducaoScreen.tsx
EstoqueScreen.tsx
PerfilScreen.tsx
ProductsAdminScreen.tsx
ProductionDetailsScreen.tsx
TransactionDetailsScreen.tsx
services/
supabase.ts
state/
AuthProvider.tsx
ThemeProvider.tsx
ToastProvider.tsx
theme.ts

````

## 🔐 Variáveis de ambiente (Expo)
Expo só injeta variáveis que começam com `EXPO_PUBLIC_`.
Crie um arquivo `.env` (baseado em `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
````

> Após alterar `.env`, rode o app com cache limpo: `npx expo start -c`.

## 🗄️ Banco (resumo do schema)

- `products (id, name, unit, meta_por_animal, created_at)`
- `productions (id, author_id, prod_date, abate, created_at)`
- `production_items (id, production_id, product_id, produced, meta, diff, avg)`
- `inventory_transactions (id, product_id, quantity, unit, tx_type, created_by, source_production_id, created_at)`
- `inventory_balances (product_id, saldo, updated_at)` – _view/materialized ou mantido via triggers_
- `profiles (id, username, role, created_at)`

### Seed rápido das metas padrão

```sql
insert into products (name, unit, meta_por_animal)
values ('Mocotó','UN',4), ('Bucho','KG',4), ('Tripa','KG',4)
on conflict (name) do nothing;
```

### Tornar um usuário **admin**

```sql
insert into public.profiles (id, username, role)
select u.id, split_part(u.email,'@',1), 'admin'
from auth.users u
where u.email='seu@email.com'
on conflict (id) do update set role='admin';
```

## ▶️ Como rodar

1. **Instale dependências** (use `expo install` para versões compatíveis):

   ```bash
   npm i
   expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
   expo install react-native-screens react-native-safe-area-context react-native-gesture-handler
   expo install @supabase/supabase-js expo-haptics @expo/vector-icons
   ```

2. **Inicie o app**:

   ```bash
   npx expo start -c
   ```

   - Pressione **a** (emulador Android), **i** (simulador iOS) ou use **Expo Go** no celular (LAN/Tunnel).
   - Para web: pressione **w**.

> Se abrir branco no device, veja logs com **“j”** no terminal do Expo.
> Erro comum: `Invalid URL` → variáveis `.env` sem `EXPO_PUBLIC_`.

## 🛠️ Scripts úteis

```bash
npm run start       # npx expo start
npm run android     # abre emulador (se disponível)
npm run ios         # abre simulador (macOS)
npm run web         # abre no navegador
```

## 🧩 Dicas & Troubleshooting

- **Navigation error**: “Couldn't register the navigator…”
  — Troque `@react-navigation/native-stack` por `@react-navigation/stack` (já feito) e garanta uma única versão de cada pacote.
- **Sem conexão no device**: use **Tunnel** no Metro (ou mesma rede), desative firewall/VPN e verifique `.env`.
- **Caches**: `npx expo start -c` resolve 90% dos problemas de cache.

## 📜 Licença

Projeto privado. Use internamente na sua operação.
Se quiser abrir código futuramente, adicionamos uma licença apropriada.
