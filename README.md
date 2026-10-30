# AirSnap

App web leve para controlar um ar-condicionado LG e acompanhar o gasto de energia em reais, direto do celular.

Nasceu porque o app oficial LG ThinQ vive travado em loading infinito. O AirSnap abre na hora com o último estado salvo e atualiza em segundo plano.

## O que faz

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
- Preço do kWh editável (padrão R$ 1,15)

## Como funciona

```
iPhone (página web)  →  /api/lg na Vercel  →  API ThinQ Connect da LG
```

A página fica em `public/`. A função em `api/lg.js` guarda o token da LG no servidor e só repassa as chamadas permitidas. Nada de token no celular.

## Instalação

### 1. Token da LG

1. Abra https://connect-pat.lgthinq.com e entre com a conta do app LG ThinQ.
2. **ADD NEW TOKEN** → dê um nome → **SELECT ALL**.
   A permissão **Device Energy Consumption Inquiry** é necessária para a aba Energia.
3. **CREATE TOKEN** e copie o token.

### 2. Deploy na Vercel

1. Entre em https://vercel.com com a sua conta do GitHub.
2. **Add New… → Project** → importe este repositório.
3. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `THINQ_PAT` | o token da LG |
   | `APP_PASSWORD` | uma senha que você vai digitar no celular |

4. **Deploy**.

Opcionais: `THINQ_COUNTRY` (padrão `BR`) e `THINQ_REGION` (padrão `aic`, Américas).

### 3. No iPhone

1. Abra o endereço da Vercel no **Safari**.
2. Digite a `APP_PASSWORD`.
3. **Compartilhar → Adicionar à Tela de Início**.

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| Senha errada | Digite a `APP_PASSWORD` de novo |
| Token da LG inválido ou expirado | Gere outro token e troque `THINQ_PAT` na Vercel, depois faça **Redeploy** |
| Não achei nenhum ar-condicionado | Confira se o aparelho aparece no app LG ThinQ, na mesma conta |
| O aparelho está desconectado | O ar perdeu o Wi-Fi. Desligue e ligue na tomada |
| A LG demorou demais | Servidor da LG lento. Toque em ↻ |
| Seu ar não manda dados de energia | Gere um token com **SELECT ALL** |

## Limites da API da LG

- Não dá para mover a aleta passo a passo, só ligar o modo circular.
- Energia vem por dia e por mês. Não existe consumo por hora nem consumo instantâneo.
