# AirSnap

App web leve para controlar um ar-condicionado LG e acompanhar o gasto de energia em reais, direto do celular.

Nasceu porque o app oficial LG ThinQ vive travado em loading infinito. O AirSnap abre na hora com o último estado salvo e atualiza em segundo plano.

## Funcionalidades

**Controle**
- Liga e desliga
- Modo (Frio, Ventilar, Desumidificar...)
- Temperatura desejada com − / + e barra deslizante
- Velocidade da ventilação por níveis
- Circular de cima para baixo
- Vários aparelhos na mesma conta

**Energia**
- Gasto de hoje e do mês em R$
- Previsão da conta do mês, pela média diária
- Gráficos por semana, mês e ano, com navegação para períodos anteriores
- Preço do kWh configurável

**Duas telas, um app**
- No celular: abas Controle e Energia, com visual nativo de iOS
- No computador: painel único com controle e energia lado a lado

## Stack

- **React 19 + TypeScript**
- **Konsta UI** (componentes iOS) + **Tailwind CSS v4**
- **Vite**
- **Supabase** (Auth + Postgres)
- **Vercel Functions** para o proxy da API da LG

## Arquitetura

```
iPhone / navegador (PWA)  →  Vercel Function  →  LG ThinQ Connect API
```

- **`src/`**: app React. `lib/` tem a lógica pura (ar-condicionado, energia, formatação), `hooks/` o estado e `components/` as telas.
- **`api/lg.ts`**: proxy serverless que guarda as credenciais no servidor e só libera as rotas que o app usa.

## Decisões

- **Cache-first**: o último estado e os dados de energia ficam salvos no aparelho, então a tela abre na hora.
- **UI otimista**: os comandos aparecem na tela antes da resposta da LG e voltam atrás se falharem.
- **Timeout curto**: chamadas à LG param em 10 s, sem loading infinito.
- **Debounce na temperatura**: vários toques no − / + viram um único comando.
- **Layout por tamanho de tela**: abas no celular, painel único a partir de 1024 px.

## Contas

Qualquer pessoa cria uma conta, gera o próprio token pessoal na LG e conecta o seu ar. O app tem um passo a passo pra isso.

> Só funciona com **ar-condicionado LG** conectado ao app **LG ThinQ**. AirSnap não é um app oficial da LG.

## Segurança

- Login, confirmação de e-mail e recuperação de senha pelo **Supabase Auth**.
- O token LG de cada pessoa é guardado criptografado com **AES-256-GCM**, amarrado ao id do usuário. Nem quem lê o banco consegue usar o token.
- A tabela de tokens tem **RLS** ligado e nenhum acesso pelo navegador: só o servidor lê.
- O servidor valida o JWT de cada chamada e usa só o token do próprio usuário.
- O token é testado na LG antes de ser salvo, e só entra conta que tenha ar-condicionado.
- O usuário pode trocar o token, desconectar a LG ou excluir a conta inteira a qualquer hora.
- O proxy só libera as rotas que o app usa e valida cada parâmetro.

## Limitações da API da LG

- A aleta não se move passo a passo, só existe o modo circular.
- A energia vem por dia e por mês. Não há consumo por hora nem instantâneo.
