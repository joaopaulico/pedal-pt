# pedal.pt

Site de ciclismo em Portugal. Feito com Astro + Tailwind CSS.

## Setup

```bash
npm install
npm run dev
```

O site fica disponível em `http://localhost:4321`.

## Publicar um artigo novo

Cria um ficheiro `.md` em `src/content/blog/` com este frontmatter:

```yaml
---
title: "Título do artigo"
description: "Descrição curta para SEO e previews"
date: 2026-04-05
category: "rotas"          # rotas | gear | guias | bikepacking
tags: ["sintra", "gravel"]
image: "/images/nome.jpg"  # opcional
draft: false
featured: false
readingTime: 8             # minutos, opcional
---
```

Escreve o conteúdo em markdown normal abaixo do frontmatter.

## Deploy

O site faz deploy automático no Netlify quando fazes push para o branch `main` no GitHub.

Para deploy manual:

```bash
npm run build
```

Os ficheiros ficam em `dist/`.

## Estrutura

```
src/
├── content/blog/    ← artigos em markdown
├── components/      ← Header, Footer, PostCard
├── layouts/         ← BaseLayout, BlogPost
├── pages/           ← páginas do site
└── styles/          ← CSS global
```
