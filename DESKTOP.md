# Talky Desktop (Electron)

Este projeto agora roda também como app nativo de PC (Windows, Mac, Linux),
usando Electron pra empacotar o mesmo React que já existia.

## 1. Instalar dependências

No seu computador (não dá pra rodar isso aqui na sandbox, que não tem acesso
à internet):

```bash
npm install
```

## 2. Rodar em modo desenvolvimento (com hot-reload)

```bash
npm run electron:dev
```

Isso sobe o Vite (`localhost:5173`) e abre uma janela do Electron carregando
ele. Qualquer alteração no código do React recarrega automaticamente.

## 3. Gerar o instalador (.exe / .dmg / .AppImage)

```bash
npm run electron:build        # gera para o seu sistema operacional atual
npm run electron:build:win    # força gerar instalador Windows (.exe)
npm run electron:build:mac    # força gerar instalador macOS (.dmg)
npm run electron:build:linux  # força gerar AppImage Linux
```

Os arquivos finais aparecem na pasta `release/`. É esse `.exe`/`.dmg` que
você distribui pro usuário instalar no PC.

> **Importante sobre build cross-platform:** o electron-builder consegue
> gerar `.exe` a partir do Linux/Mac (via Wine), mas gerar `.dmg` (macOS)
> só funciona rodando num Mac de verdade — é uma limitação da Apple, não
> do electron-builder.

## O que foi adicionado/alterado

- `electron/main.cjs` — processo principal: cria a janela, libera permissão
  de microfone/câmera automaticamente, e trata o compartilhamento de tela
  (`getDisplayMedia`) via `desktopCapturer`.
- `electron/preload.cjs` — vazio de propósito; o app não precisa de nenhuma
  API do Node exposta no navegador, então mantemos o isolamento máximo.
- `package.json` — novos scripts (`electron:dev`, `electron:build*`) e
  configuração do `electron-builder`.
- `vite.config.js` — `base: './'`, necessário pros assets carregarem
  corretamente quando o Electron abre o `index.html` direto do disco.

## Limitações conhecidas nesta primeira versão

- **Escolha de tela ao compartilhar**: hoje o `main.cjs` pega automaticamente
  a primeira tela disponível ao clicar em "Compartilhar tela" (sem deixar
  escolher qual monitor/janela). Para adicionar um seletor visual, dá pra
  criar uma janelinha própria que lista `desktopCapturer.getSources()` e
  deixa o usuário clicar em qual quer compartilhar — posso implementar isso
  se quiser.
- **Sem ícone customizado nem code signing**: o instalador vai funcionar,
  mas o Windows/macOS vão mostrar avisos de "app de desenvolvedor
  desconhecido" até você assinar o binário com um certificado (isso é um
  processo separado, pago, e não é obrigatório pra uso pessoal/interno).
- **Auto-update não configurado**: se quiser que o app se atualize sozinho
  quando você publicar uma nova versão, dá pra integrar o
  `electron-updater` depois.
