# Pedal Enhancements — Guia de Integração

Tudo o que precisas está em dois ficheiros, em `public/`:

- `public/css/pedal-enhance.css`
- `public/js/pedal-enhance.js`

Para activar no site, adiciona **duas linhas** ao `<head>` de `src/layouts/BaseLayout.astro`, idealmente logo a seguir aos links de fontes:

```html
<link rel="stylesheet" href="/css/pedal-enhance.css" />
<script src="/js/pedal-enhance.js" defer></script>
```

E só. O script detecta automaticamente o tipo de página e aplica os enhancements certos.

---

## O que foi adicionado

### Cor adicional à paleta

- `--pedal-navy: #1d4e6f` e `--pedal-navy-soft: #2c5f7c` definidos como CSS custom properties no topo do CSS. Usadas na barra de progresso de leitura, no TOC activo, no card "Próximo artigo" da homepage, e nos hovers do toolbar do mapa.

### Páginas de rota (`/rotas/<slug>`)

Sobre o mapa Leaflet existente (não é reescrito — o script liga-se ao que já lá está):

- **Toolbar no canto superior direito:** botão "Descarregar GPX" em verde, selector de camadas (Dark, Streets, Satélite, Relevo), e botão "Ecrã inteiro".
- **Markers de início (A, verde) e fim (B, vermelho)** com popups.
- **Animação de revelação da polyline** no load (stroke-dashoffset).
- **Scale bar métrica** no canto inferior esquerdo.
- **Ligação hover elevação ↔ mapa:** passar o rato sobre o perfil de elevação mostra um ponto pulsante (âmbar) na posição correspondente do mapa, e vice-versa uma linha cruzada no SVG. Bidireccional via índice da lista de coordenadas.

### Homepage (`/`)

Por baixo do hero em vídeo aparece uma **live strip** com três cards:

- "Última rota" — accent verde
- "Último review" — accent âmbar  
- "Próximo artigo" — accent navy

Cada card tem uma barra superior que desliza no hover, título, meta-dados, e o indicador "EM DIRECTO · últimas publicações" com um ponto a pulsar ao lado.

**Para actualizares estes cards quando publicares:** edita o array `LIVE_STRIP_ITEMS` no topo de `public/js/pedal-enhance.js`. Cada item tem:

```js
{
  kind: 'Última rota',          // label curta
  title: 'Alcabideche, Serra e Mar',
  href: '/rotas/alcabideche-serra-mar/',
  meta: ['36.7 km', '780m ↑', 'Gravel'],
  accent: '#44b687',            // cor do hover/barra superior
  icon: 'route',                // 'route' | 'gear' | 'compass'
}
```

### Artigos (`/blog/<slug>`, `/gear/<slug>`, `/rotas/<slug>`)

- **Barra de progresso de leitura** no topo da página, gradient verde → navy.
- **TOC flutuante** no lado direito (apenas em ecrãs ≥1280px). Gerado automaticamente a partir dos `<h2>` e `<h3>` do artigo. Tem scroll-spy — a secção visível fica destacada a navy. Só aparece quando já passaste o título principal.
- **Botão "Guardar" no canto inferior direito.** Clicar guarda a URL em `localStorage`. Sem backend. Aparece ao fim de ~400px de scroll.

---

## Testar localmente

```bash
cd pedal-pt-site
npm run dev
```

Abre:
- `http://localhost:4321/rotas/alcabideche-serra-mar/` — confirma toolbar, markers, animação, hover ligado
- `http://localhost:4321/` — confirma live strip por baixo do vídeo
- `http://localhost:4321/blog/guia-completo-ciclismo-portugal/` — confirma progress bar e TOC

---

## Desligar

Se quiseres desligar temporariamente, basta remover ou comentar as duas linhas no `BaseLayout.astro`. Os ficheiros ficam em `public/` mas não são carregados.

Para desligar só uma feature, comentar a chamada correspondente no bloco `whenReady(...)` no final do `pedal-enhance.js`:

```js
whenReady(function () {
  enhanceRouteMap();   // comenta para desligar mapa
  injectLiveStrip();   // comenta para desligar live strip
  enhanceArticle();    // comenta para desligar reading UX
});
```

---

## Próximos passos que sugiro (mas só se quiseres)

1. Adicionar o navy ao `tailwind.config.mjs` como `ocean: { 500: '#1d4e6f', 400: '#2c5f7c' }` para o poderes usar como `bg-ocean-500`, `text-ocean-400` directamente.
2. Lightbox para as imagens dos artigos — usava o PhotoSwipe ou um swipe custom.
3. Filtros em `/rotas/` por distância/desnível/região.
4. Newsletter signup no footer (Buttondown tem free tier).
