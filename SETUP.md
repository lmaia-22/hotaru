# Guia de Configuração Detalhado

## 1. Configuração do Supabase

### Criar Projeto
1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Crie um novo projeto
3. Anote a URL e as chaves (anon key e service role key)

### Executar Migração
1. No Supabase Dashboard, vá para **SQL Editor**
2. Copie e execute o conteúdo de `supabase/migrations/001_create_profiles.sql`
3. Isso criará a tabela `profiles` com as políticas RLS apropriadas

### Configurar Site URL e Redirect URLs
1. Vá para **Authentication > URL Configuration**
2. Configure **Site URL**: `http://localhost:3000` (desenvolvimento) ou `https://your-domain.com` (produção)
3. Adicione **Redirect URLs** (adicione todas que vai usar):
   - `http://localhost:3000/auth/callback` (desenvolvimento)
   - `https://your-domain.com/auth/callback` (produção)
   - ⚠️ **Importante**: Adicione ambas se vai usar em desenvolvimento e produção

### Configurar OAuth (Opcional)

#### Configurar GitHub OAuth

1. **Criar OAuth App no GitHub:**
   - Acesse https://github.com/settings/developers
   - Clique em "New OAuth App" (ou "OAuth Apps" > "New OAuth App")
   - Preencha os dados:
     - **Application name**: Hotaru (ou qualquer nome)
     - **Homepage URL**: `http://localhost:3000` (dev) ou `https://your-domain.com` (produção)
     - **Authorization callback URL**: 
       - ⚠️ **IMPORTANTE**: Use a URL do Supabase, não da sua aplicação!
       - Formato: `https://[seu-projeto-id].supabase.co/auth/v1/callback`
       - Exemplo: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
       - Você encontra esta URL no Supabase Dashboard: **Project Settings** > **API** > **Project URL** + `/auth/v1/callback`
       - Para desenvolvimento local, use a mesma URL do Supabase (o Supabase gerencia os redirects)
   - Clique em "Register application"
   - **IMPORTANTE**: Copie o **Client ID** e gere um **Client Secret** (clique em "Generate a new client secret")

2. **Configurar no Supabase:**
   - Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
   - Vá para **Authentication** (menu lateral)
   - Clique em **Providers**
   - Encontre **GitHub** na lista de providers
   - Clique no toggle para **Ativar** o provider GitHub
   - Preencha:
     - **Client ID**: Cole o Client ID que você copiou do GitHub
     - **Client Secret**: Cole o Client Secret que você gerou no GitHub
   - Os **Redirect URLs** já configurados em "URL Configuration" serão usados automaticamente
   - Clique em **Save**

3. **Testar:**
   - Vá para `/auth/login` na sua aplicação
   - Clique no botão "GitHub"
   - Você será redirecionado para GitHub para autorizar
   - Após autorizar, será redirecionado de volta para a aplicação

#### Configurar Google OAuth

1. **Criar Credentials no Google Cloud Console:**
   - Acesse [Google Cloud Console](https://console.cloud.google.com)
   - Crie um novo projeto ou selecione um existente
   - Vá para **APIs & Services** > **Credentials**
   - Clique em **Create Credentials** > **OAuth client ID**
   - Se necessário, configure o OAuth consent screen primeiro
   - Configure o OAuth client:
     - **Application type**: Web application
     - **Name**: Hotaru (ou qualquer nome)
     - **Authorized JavaScript origins**: 
       - `http://localhost:3000` (desenvolvimento)
       - `https://your-domain.com` (produção)
     - **Authorized redirect URIs**: 
       - ⚠️ **IMPORTANTE**: Use a URL do Supabase, não da sua aplicação!
       - Formato: `https://[seu-projeto-id].supabase.co/auth/v1/callback`
       - Exemplo: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
       - Você encontra esta URL no Supabase Dashboard: **Project Settings** > **API** > **Project URL** + `/auth/v1/callback`
   - Clique em **Create**
   - **IMPORTANTE**: Copie o **Client ID** e **Client Secret**

2. **Configurar no Supabase:**
   - Acesse seu projeto no Supabase Dashboard
   - Vá para **Authentication** > **Providers**
   - Encontre **Google** na lista
   - Clique no toggle para **Ativar** o provider Google
   - Preencha:
     - **Client ID**: Cole o Client ID do Google Cloud Console
     - **Client Secret**: Cole o Client Secret do Google Cloud Console
   - Clique em **Save**

3. **Testar:**
   - Vá para `/auth/login` na sua aplicação
   - Clique no botão "Google"
   - Você será redirecionado para Google para autorizar
   - Após autorizar, será redirecionado de volta para a aplicação

## 2. Configuração do Redis

### Opção A: Upstash Redis (Recomendado para Produção)

1. Acesse [Upstash Dashboard](https://console.upstash.com)
2. Crie uma nova base de dados Redis
3. Escolha região próxima aos seus utilizadores
4. Copie:
   - REST URL
   - REST Token
5. Adicione ao `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Opção B: Redis Local (Desenvolvimento)

1. Inicie o Redis com Docker:
```bash
docker-compose up -d
```

2. Para usar Redis local com @upstash/redis, você precisa de um servidor HTTP em frente ao Redis. Uma opção é usar [Upstash Redis CLI](https://github.com/upstash/upstash-redis) ou configurar um proxy.

Alternativa mais simples para desenvolvimento: use Upstash free tier mesmo localmente.

## 3. Variáveis de Ambiente

Crie `.env.local` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis / Upstash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **Nunca commite o arquivo `.env.local`** - ele está no `.gitignore`

## 4. Primeira Execução

1. Instale dependências:
```bash
npm install
```

2. Verifique se as variáveis de ambiente estão configuradas

3. Execute em modo de desenvolvimento:
```bash
npm run dev
```

4. Acesse `http://localhost:3000`

5. Faça login com magic link ou OAuth

## 5. Verificações

### Verificar Supabase
- Tabela `profiles` existe e tem RLS habilitado
- Políticas RLS estão ativas
- Providers OAuth configurados (se usando)

### Verificar Redis
```bash
# Se usando Redis local via Docker
docker-compose ps
docker-compose logs redis

# Testar conexão (se tiver redis-cli)
redis-cli ping
```

## 6. Troubleshooting

### Erro: "Redis configuration is missing"
- Verifique se as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` estão definidas
- Verifique se o arquivo `.env.local` está na raiz do projeto

### Erro: "Unauthorized" ao criar paste
- Verifique se está autenticado
- Verifique se o perfil foi criado na tabela `profiles`
- Verifique as políticas RLS no Supabase

### Erro: "Rate limit exceeded"
- Limite padrão: 30 pastes por hora
- Aguarde 1 hora ou ajuste `RATE_LIMIT_MAX` em `lib/redis.ts`

### Pastes não aparecem
- Verifique se o Redis está acessível
- Verifique os logs do console para erros
- Verifique se os TTLs estão configurados corretamente (7200 segundos = 2 horas)

## 7. Deploy para Produção

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente no painel do Vercel
3. Deploy automático em cada push

### Outros Plataformas
- Configure variáveis de ambiente
- Build: `npm run build`
- Start: `npm start`
- Configure redirect URLs no Supabase

## 8. Monitoramento

### Supabase
- Dashboard: Métricas de autenticação, utilização de base de dados
- Logs: Erros e queries lentas

### Upstash Redis
- Dashboard: Comandos por segundo, utilização de memória
- Logs: Erros de conexão
