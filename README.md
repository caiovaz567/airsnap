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

## Arquitetura

```
iPhone (PWA)  →  Vercel Function  →  LG ThinQ Connect API
```

- **`public/`**: PWA em HTML, CSS e JavaScript puros, sem dependências. Instalável na tela inicial do iOS.
- **`api/lg.js`**: proxy serverless que guarda as credenciais no servidor e só libera as rotas que o app usa.

## Decisões

- **Cache-first**: o último estado e os dados de energia ficam salvos no aparelho, então a tela abre na hora.
- **UI otimista**: os comandos aparecem na tela antes da resposta da LG e voltam atrás se falharem.
- **Timeout curto**: chamadas à LG param em 10 s, sem loading infinito.
- **Debounce na temperatura**: vários toques no − / + viram um único comando.
- **Zero dependências**: nada para instalar nem para buildar.

## Limitações da API da LG

- A aleta não se move passo a passo, só existe o modo circular.
- A energia vem por dia e por mês. Não há consumo por hora nem instantâneo.
