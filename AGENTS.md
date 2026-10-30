# AGENTS.md

Guia para quem (pessoa ou IA) mexer no AirSnap.

## O que é

PWA para controlar ar-condicionado LG pela API **ThinQ Connect** e ver o gasto de energia em reais.
Multiusuário: cada pessoa cria conta, gera o próprio token pessoal na LG e conecta o seu ar.
Só funciona com **ar-condicionado LG ThinQ**. Não é um app oficial da LG — nunca usar marca, logo ou nome da LG como se fosse dela.

## Stack

- React 19 + TypeScript (strict) + Vite
- **Konsta UI** (tema iOS, escuro) + Tailwind CSS v4
- Supabase (Auth + Postgres)
- Vercel Functions (`api/lg.ts`), região `pdx1`
- Ícones: `lucide-react`

## Comandos

```bash
npm run dev        # app + API local em http://localhost:3000
npm run typecheck  # tsc
npm run build      # tsc + vite build
npm run setup-env  # cria/ajusta .env.local e gera TOKEN_ENCRYPTION_KEY
```

Sempre rodar `npm run build` antes de dar uma tarefa como pronta.

## Estrutura

```
api/lg.ts                 proxy da LG: valida JWT do Supabase, lê token criptografado, chama a LG
src/lib/                  lógica pura (ac, energy, format, api, storage, supabase, countries)
src/hooks/                estado (useAirConditioner, useEnergy, useAuth, ...)
src/components/           telas e peças de UI
src/components/ui.tsx     peças compartilhadas (Section, TextField, RoundButton, ...)
supabase/schema.sql       tabela thinq_accounts (rodar no SQL Editor)
public/                   logo.png, icon.png, icon-512.png, favicon.png, manifest
```

## Regras de código

- **Sem comentários no código.** Nenhum `//`, `/* */` ou `<!-- -->`. Se precisar explicar, o nome da função/variável explica.
- TypeScript estrito, sem `any`. Imports locais com extensão `.ts`/`.tsx`.
- Funções pequenas; lógica pura em `src/lib`, estado em `src/hooks`, UI em `src/components`.
- Textos da interface em **português do Brasil**, curtos e diretos.

## UI

- **Use Konsta UI primeiro.** Antes de criar qualquer componente, veja se o Konsta já tem: `Page`, `Navbar`, `Block`, `BlockTitle`, `List`, `ListItem`, `ListButton`, `Button`, `Toggle`, `Range`, `Segmented`, `SegmentedButton`, `Stepper`, `Preloader`, `Dialog`, `Sheet`, `Toast`, `Chip`, `Card`.
- Componentes próprios só quando o Konsta não resolve bem. Os que existem e o motivo:
  - `TextField`, `SelectField`, `TextAreaField` (ui.tsx): os inputs do Konsta ficavam pouco visíveis no tema escuro. Rótulo em cima, fundo preenchido, olhinho em senha. Todo formulário usa esses três.
  - `TabBar`: a Tabbar do Konsta ficava transparente por cima do conteúdo.
  - `BarChart`: o Konsta não tem gráfico.
  - `Slider` (ui.tsx, estilo `.airsnap-range` no index.css): o `Range` do Konsta calcula a posição do botão uma vez e às vezes desalinha. O nosso é um `input range` nativo estilizado, sem cálculo em JS.
  - `WindDial` + `WindSheet`: seletor de ventilação em arco, aberto num `Sheet` do Konsta ao tocar em "Velocidade da ventilação". Arrastar, tocar no número, − / + ou teclado. Envia 600 ms depois do último toque.
  - `AcUnit`: ilustração do ar com o vento animado. Cor muda com o modo, velocidade com o nível. Desenho próprio, nunca imagem da LG.
  - `Spinner` (ui.tsx): anel fino com arco azul. É o **único** loading do app; não usar o `Preloader` do Konsta. Nunca mostrar dois loadings ao mesmo tempo.
  - `Hud`: aviso no centro da tela. Toda ação do usuário que fala com a LG passa por `withHud()` (`src/lib/hud.ts`): mostra "Enviando…", depois check verde animado ou X vermelho. Atualizações automáticas não usam o Hud.
- Tema: `App theme="ios" dark`. Cor de destaque: `primary` do Konsta.
- Espaçamento: seções com `Section` (Block strong inset) e `gap-6` entre elas.
- **Toda tela fica centralizada**, na horizontal e na vertical. Telas de fluxo (login, cadastro, conectar LG, avisos) usam `mx-auto flex min-h-full max-w-md flex-col justify-center`. O painel do PC usa `min-h` da tela menos o cabeçalho, com `justify-center`.
- Telas de fluxo não têm seta de voltar nem Navbar. A ação secundária é um botão `outline` abaixo do divisor "ou".
- Layout: abaixo de 1024 px usa `MobileLayout` (abas Controle/Energia/Conta); a partir de 1024 px, `DesktopLayout` (controle e energia lado a lado).
- Sempre conferir a tela no celular (390 px) e no PC antes de entregar.

## Acessibilidade

- **Tamanho mínimo de texto:** 14 px (`text-sm`) para qualquer texto de apoio. 12 px (`text-xs`) só em eixo de gráfico. Nunca `text-[10px]`/`text-[11px]`.
- **Contraste:** texto secundário usa `text-white/70` (≥ 4.5:1 no fundo escuro). Nunca `opacity-50`/`opacity-60` em texto. Placeholders no mínimo `text-white/45`.
- Alvo de toque com no mínimo 44 px.
- Botão só com ícone sempre tem `aria-label`.
- Animações respeitam `prefers-reduced-motion`.

## Segurança

- O token da LG **nunca** vai para o navegador. Só o servidor lê, decifra e usa.
- Token guardado com AES-256-GCM (`TOKEN_ENCRYPTION_KEY`), com o id do usuário como AAD.
- Tabela `thinq_accounts`: RLS ligado, sem acesso para `anon`/`authenticated`; só `service_role`.
- Toda rota em `api/lg.ts` exige JWT válido do Supabase e o cabeçalho `x-airsnap: 1`.
- Rotas novas da LG: liberar uma a uma no `handle()` e validar cada parâmetro.
- Nunca colocar segredos em código, README, prints ou logs. Segredos só em `.env.local` (ignorado pelo git) e nas variáveis da Vercel.

## Variáveis de ambiente

| Nome | Onde | Para quê |
|---|---|---|
| `VITE_SUPABASE_URL` | navegador + servidor | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | navegador | chave pública do Supabase |
| `SUPABASE_SECRET_KEY` | só servidor | acesso admin ao banco e ao Auth |
| `TOKEN_ENCRYPTION_KEY` | só servidor | chave AES-256 (32 bytes base64url) |

## API da LG (ThinQ Connect)

- Base: `https://api-{região}.lgthinq.com` (`aic` Américas, `eic` Europa/África, `kic` Ásia). Região sai do país do usuário.
- Cabeçalhos: `Authorization: Bearer <token>`, `x-country`, `x-message-id`, `x-client-id`, `x-api-key`, `x-service-phase: OP`; em controle, `x-conditional-control: true`.
- O ar recusa comandos muito seguidos ("Fail device control"). Todo comando passa pela fila do `useAirConditioner`: um por vez, com 1,5 s de intervalo e até 2 novas tentativas. Enquanto houver comando na fila, o app não sobrescreve a tela com o estado vindo da LG.
- Enquanto o Hud mostra "Enviando…", ele cobre a tela e **bloqueia toques**, pra não acumular comandos.
- Ventilação: quando o perfil tem `airFlow.windStep` (faixa 1–5), ele é o nível da ventoinha, igual ao app da LG. Sem ele, usa `windStrengthDetail` (ignorando `NATURE`) ou `windStrength`.
- **Posição da aleta não existe na API oficial.** `windDirection.rotateUpDown` só liga/desliga o vai-e-vem (desligar trava a aleta onde ela está). `windStep` NÃO é aleta, é a ventoinha (testado no aparelho real). A decisão foi não simular posição; o usuário usa o app da LG pra isso.
- Ventilação: alguns aparelhos usam `windStrengthDetail` (níveis) sem `AUTO`; o automático fica em `windStrength: "AUTO"`. Use `windCommandKey()` em `src/lib/ac.ts`.
- **Nada de estimativa ou previsão** na Energia: o usuário quer só o dado real da LG (gasto do mês até agora, hoje, por dia/mês), com o horário em que a LG mandou. Não existe consumo por hora nem "agora" na API oficial.
- Energia vem em **Wh**, por dia (`DAILY`, `YYYYMMDD`) ou mês (`MONTHLY`, `YYYYMM`).
- Referência: biblioteca oficial `thinq-connect/pythinqconnect`.

## Git

- Nunca adicionar `Co-Authored-By` nem atribuição a IA em commits ou PRs.
- Mensagens de commit em português, curtas.
