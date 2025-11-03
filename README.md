# Hotaru 🔥

Uma plataforma de clipboard compartilhada entre utilizadores com controlo de partilha e expiração automática.

## Funcionalidades

- ✅ Autenticação via Supabase (Magic Link, GitHub, Google)
- ✅ Criar pastes com até 100 KB de conteúdo
- ✅ Controlo de visibilidade (Público ou Privado com utilizadores específicos)
- ✅ Expiração automática após 2 horas
- ✅ Rate limiting (30 pastes por hora por utilizador)
- ✅ Interface moderna com Tailwind CSS e modo escuro
- ✅ Busca de utilizadores para partilha privada
- ✅ Listagem de pastes públicos e privados

## Stack Tecnológica

- **Frontend**: Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Autenticação**: Supabase Auth (@supabase/ssr)
- **Base de Dados**: Supabase (PostgreSQL)
- **Cache/Store**: Redis (Upstash)
- **Testes**: Vitest + Testing Library
- **Dev**: Docker Compose para Redis local

## Pré-requisitos

- Node.js 18+ e npm/yarn/pnpm
- Conta no Supabase
- Conta no Upstash Redis (ou Redis local)
- Docker (para Redis local)

## Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd hotaru
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente. Crie um arquivo `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis / Upstash
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Configure o Supabase:
   - Crie um novo projeto no [Supabase](https://supabase.com)
   - Execute o SQL em `supabase/migrations/001_create_profiles.sql` no SQL Editor do Supabase
   - Configure os providers OAuth (GitHub/Google) se necessário

5. Configure o Redis:
   - Para desenvolvimento local, inicie o Redis com Docker:
   ```bash
   docker-compose up -d
   ```
   - Para produção, crie uma conta no [Upstash](https://upstash.com) e configure as variáveis de ambiente

6. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Estrutura do Projeto

```
hotaru/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── pastes/          # Endpoints para pastes
│   │   ├── auth/            # Callback de autenticação
│   │   ├── profiles/        # Gestão de perfis
│   │   └── users/           # Busca de utilizadores
│   ├── auth/login/          # Página de login
│   └── page.tsx             # Página principal (Dashboard)
├── components/              # Componentes React
│   ├── Dashboard.tsx        # Dashboard principal
│   ├── PasteForm.tsx        # Formulário de criação
│   ├── PasteList.tsx        # Lista de pastes
│   └── LoginForm.tsx        # Formulário de login
├── lib/                     # Bibliotecas e utilitários
│   ├── supabase/           # Clientes Supabase
│   ├── redis.ts            # Cliente Redis
│   ├── paste.ts            # Funções de gestão de pastes
│   ├── rate-limit.ts       # Rate limiting
│   └── redis-pubsub.ts     # Pub/Sub (futuro)
├── types/                   # Definições TypeScript
│   ├── paste.ts            # Tipos de paste
│   └── supabase.ts         # Tipos do Supabase
├── supabase/               # Migrações SQL
│   └── migrations/
└── test/                   # Testes
```

## API Endpoints

### Pastes

- `GET /api/pastes` - Lista pastes (query params: `type=all|mine`, `limit`)
- `POST /api/pastes` - Cria um novo paste
- `GET /api/pastes/[id]` - Obtém um paste específico
- `DELETE /api/pastes/[id]` - Deleta um paste

### Outros

- `GET /api/profiles` - Obtém perfil do utilizador
- `PATCH /api/profiles` - Atualiza perfil
- `GET /api/users/search?q=query` - Busca utilizadores

## Testes

Execute os testes com:
```bash
npm test
```

Para interface de testes:
```bash
npm run test:ui
```

## Build para Produção

```bash
npm run build
npm start
```

## Estrutura de Dados

### Paste (Redis)
```json
{
  "paste_id": "ulid",
  "user_id": "uuid",
  "content": "string",
  "visibility": "public" | "private",
  "shared_with": ["uuid"],
  "created_at": "ISO string",
  "expires_at": "ISO string"
}
```

### Profile (Supabase)
- `id` (UUID, FK para auth.users)
- `email` (TEXT)
- `display_name` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Rate Limiting

- Limite: 30 pastes por hora por utilizador
- Implementado com Redis TTL
- Resposta 429 quando excedido

## Segurança

- Row Level Security (RLS) habilitado no Supabase
- Validação de acesso baseada em visibilidade
- Rate limiting por utilizador
- Validação de tamanho de conteúdo (max 100 KB)

## Próximas Melhorias

- [ ] Implementar tempo real com Server-Sent Events ou WebSockets
- [ ] Melhorar UI de busca de utilizadores (mostrar display_name nos chips)
- [ ] Notificações push quando um paste é compartilhado
- [ ] Suporte para syntax highlighting de código
- [ ] Exportar pastes para diferentes formatos
- [ ] Histórico de pastes deletados (opcional)
- [ ] Suporte para pastes anônimos (sem autenticação)

## Licença

MIT