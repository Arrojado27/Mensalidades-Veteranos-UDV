# Mensalidades Veteranos U.D.V.

App móvel (PWA) para o tesoureiro dos Veteranos U.D.V. controlar as mensalidades dos
jogadores, despesas e saldo do grupo, época a época.

🔗 **App publicada:** https://arrojado27.github.io/Mensalidades-Veteranos-UDV/
(deploy automático a cada push para `main`, via GitHub Actions — ver
`.github/workflows/deploy.yml`.)

## O que já vem preenchido

Os dados da época **2025/26** foram importados do mapa de mensalidades em papel/Excel:
40 jogadores, histórico mês a mês (Set a Jun), despesas e saldos confirmados de
dezembro a junho. Mensalidade definida em 20€/mês.

## Como correr localmente

```bash
npm install
npm run dev
```

Abre o URL indicado no browser do telemóvel (mesma rede Wi-Fi) para testar como app.

## Como instalar no telemóvel (PWA)

1. Faz o build de produção e coloca os ficheiros de `dist/` num servidor web
   (ver secção "Publicar" abaixo).
2. No telemóvel, abre o URL no Safari (iPhone) ou Chrome (Android).
3. Usa "Adicionar ao ecrã principal" — a app fica com ícone e nome próprios,
   abre em ecrã inteiro e funciona offline.

## Build de produção

```bash
npm run build
```

Gera a pasta `dist/` com os ficheiros estáticos prontos a publicar (HTML, JS, CSS,
manifest e service worker da PWA).

## Publicar (hosting)

Os dados ficam guardados **apenas no telemóvel** (localStorage), por isso a app não
precisa de servidor com base de dados — só de um sítio a servir os ficheiros estáticos
de `dist/`. Algumas opções simples e gratuitas: GitHub Pages, Netlify, Vercel ou
Cloudflare Pages. Basta apontar o serviço escolhido para esta pasta e o comando
`npm run build`.

## Notas importantes

- **Backup**: como os dados só existem neste telemóvel, faz "Exportar backup" em
  Definições regularmente (e sobretudo antes de trocar de telemóvel). O ficheiro
  `.json` pode ser importado de volta em qualquer altura.
- **PIN**: opcional, em Definições, para bloquear o acesso à app.
- **Nova época**: em Definições, "Criar nova época" transfere os jogadores ativos
  sem histórico de pagamentos, para começares a época seguinte do zero.
