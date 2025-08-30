# 🏭 Controle de Produção e Estoque

[![React Native](https://img.shields.io/badge/React_Native-0.79.5-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.22-1B1F23?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

Aplicativo móvel profissional para controle de **produção diária** e **gestão de estoque** em indústrias de processamento de carne. Desenvolvido com foco em usabilidade, performance e design moderno.

## ✨ Funcionalidades Principais

### 🔐 **Autenticação Segura**
- Login por e-mail/senha com Supabase Auth
- Controle de acesso por papéis (usuário/administrador)
- Recuperação de senha integrada
- Biometria/Face ID (quando disponível)

### 📊 **Gestão de Produção**
- **Registro diário**: Data + quantidade de animais abatidos
- **Cálculos automáticos**: Meta, diferença e média por produto
- **Produtos dinâmicos**: Configurados pelos administradores
- **Geração automática**: Entrada no estoque após produção
- **Histórico completo**: Filtros avançados por período e produto
- **Notificações**: Confirmações e alertas em tempo real

### 📦 **Controle de Estoque**
- **Saldo em tempo real**: Cards visuais por produto
- **Múltiplos tipos**: Entrada, saída, ajuste, venda, transferência
- **Validações inteligentes**: Saldo insuficiente, quantidades inválidas
- **Histórico detalhado**: Timeline de movimentações
- **Alertas automáticos**: Estoque baixo e negativo
- **Filtros avançados**: Por produto, tipo, período

### 🛠️ **Painel Administrativo**
- **CRUD de produtos**: Nome, unidade (UN/KG), meta por animal
- **Relatórios avançados**: KPIs, gráficos, exportação
- **Gestão de usuários**: Papéis e permissões
- **Estatísticas**: Dashboard com métricas de produção

### 🎨 **UX/UI Profissional**
- **Design responsivo**: Otimizado para celulares e tablets
- **Tema adaptativo**: Claro/escuro com detecção automática
- **Microinterações**: Haptic feedback e animações suaves
- **Skeletons realistas**: Loading states específicos por tela
- **Validação inline**: Feedback em tempo real
- **Toasts inteligentes**: Confirmações com UNDO
- **Navegação intuitiva**: Bottom tabs + stack navigation

## 🏗️ Arquitetura Técnica

### **Stack Principal**
- **Frontend**: React Native 0.79.5 + Expo 53
- **Linguagem**: TypeScript com tipagem estrita
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Navegação**: React Navigation 6 (Stack + Bottom Tabs)
- **Estado**: Context API com hooks personalizados
- **UI**: Componentes customizados + Expo Vector Icons
- **Performance**: FlashList para listas otimizadas

### **Ferramentas de Desenvolvimento**
- **Linting**: ESLint + TypeScript rules
- **Formatação**: Prettier configurado
- **Build**: EAS Build para production
- **Notificações**: Expo Notifications (Development Build)

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ErrorBoundary/   # Tratamento de erros
│   ├── Skeletons/       # Estados de loading
│   ├── ui/              # Design system
│   └── ...
├── hooks/               # Hooks customizados
├── navigation/          # Configuração de navegação
├── screens/             # Telas do aplicativo
│   ├── Estoque/         # Módulo de estoque
│   ├── Producao/        # Módulo de produção
│   ├── Relatorio/       # Módulo de relatórios
│   ├── Produtos/        # Administração de produtos
│   └── Perfil/          # Perfil do usuário
├── services/            # Integração com APIs
├── state/               # Gerenciamento de estado
├── theme/               # Sistema de design
├── types/               # Tipos TypeScript
└── utils/               # Utilitários
```

## 🚀 Início Rápido

### **Pré-requisitos**
- Node.js 18+ e npm/yarn
- Expo CLI: `npm install -g @expo/cli`
- Dispositivo Android/iOS ou emulador

### **1. Instalação**
```bash
# Clone o repositório
git clone <repository-url>
cd controle_producao

# Instale as dependências
npm install
```

### **2. Configuração**
Crie um arquivo `.env` na raiz:
```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### **3. Execução**
```bash
# Desenvolvimento
npm start

# Builds específicos
npm run android
npm run ios
npm run web
```

## 🗄️ Schema do Banco

### **Tabelas Principais**
```sql
-- Produtos (configuração)
products (id, name, unit, meta_por_animal, created_at)

-- Produção
productions (id, author_id, prod_date, abate, created_at)
production_items (id, production_id, product_id, produced, meta, diff, avg)

-- Estoque
inventory_transactions (id, product_id, quantity, unit, tx_type, created_by, metadata, created_at)
inventory_balances (product_id, saldo, updated_at)

-- Usuários
profiles (id, username, role, created_at)
```

### **Setup Inicial**
```sql
-- Produtos padrão
INSERT INTO products (name, unit, meta_por_animal)
VALUES ('Mocotó','UN',4), ('Bucho','KG',4), ('Tripa','KG',4);

-- Tornar usuário admin
INSERT INTO profiles (id, username, role)
SELECT u.id, split_part(u.email,'@',1), 'admin'
FROM auth.users u WHERE u.email='seu@email.com'
ON CONFLICT (id) DO UPDATE SET role='admin';
```

## 🔔 Notificações Push

⚠️ **Importante**: Notificações push não funcionam no Expo Go (SDK 53+).

### **Para funcionalidade completa:**
```bash
# 1. Instalar EAS CLI
npm install -g @expo/eas-cli

# 2. Login
eas login

# 3. Configurar build
eas build:configure

# 4. Gerar development build
eas build --profile development --platform android
```

Consulte [DEVELOPMENT_BUILD.md](./DEVELOPMENT_BUILD.md) para instruções detalhadas.

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm start                    # Inicia o servidor Expo
npm run android             # Build Android
npm run ios                 # Build iOS
npm run web                 # Build Web

# Qualidade de código
npm run lint                # Verificar erros ESLint
npm run lint:fix            # Corrigir erros automáticos
npm run prettier            # Formatar código
npm run type-check          # Verificar tipos TypeScript
npm run quality             # Verificar tudo
npm run quality:fix         # Corrigir e formatar tudo
```

## 🔧 Principais Funcionalidades Implementadas

### ✅ **Skeletons Específicos**
Cada tela possui skeleton realista que corresponde ao layout final:
- `EstoqueSkeleton`: Header, KPIs, lista de produtos
- `ProducaoSkeleton`: Stats, filtros, timeline de produção  
- `RelatorioSkeleton`: Filtros, gráficos, tabelas
- `PerfilSkeleton`: Avatar, configurações, seções
- `ProdutosSkeleton`: Dashboard, formulário, lista

### ✅ **Validações Inline**
Feedback em tempo real durante preenchimento de formulários:
- Validação de campos obrigatórios
- Verificação de saldo suficiente
- Limitação de quantidades
- Mensagens contextuais por tipo de erro

### ✅ **Gerenciamento de Temas**
Sistema completo de temas com:
- Detecção automática do tema do sistema
- Alternância manual claro/escuro
- Persistência da preferência do usuário
- Cores consistentes em toda aplicação

### ✅ **Performance Otimizada**
- `FlashList` para listas grandes
- `useMemo` e `useCallback` estratégicos
- Lazy loading de componentes
- Cache inteligente de dados
- Debounce em filtros e buscas

## 📱 Compatibilidade

- **Android**: 5.0+ (API 21+)
- **iOS**: 11.0+
- **Web**: Navegadores modernos
- **Dispositivos**: Smartphones e tablets

## 🚨 Troubleshooting

### **Problemas Comuns**
- **App em branco**: Verifique variáveis `.env` com prefixo `EXPO_PUBLIC_`
- **Erro de navegação**: Execute `npm start -- --clear`
- **Notificações não funcionam**: Use Development Build (não Expo Go)
- **Lentidão**: Verifique se está em modo debug

### **Debug**
```bash
# Limpar cache
npm start -- --clear

# Logs detalhados
npx expo start --dev-client

# Reset completo
rm -rf node_modules .expo
npm install
```

## 🤝 Contribuindo

1. Siga os padrões TypeScript e ESLint
2. Execute `npm run quality` antes de commits
3. Mantenha skeletons atualizados com layouts
4. Documente novas funcionalidades
5. Teste em dispositivos reais

## 📄 Licença

Este projeto é privado e proprietário. Todos os direitos reservados.

---

**Desenvolvido com ❤️ para otimizar processos industriais**