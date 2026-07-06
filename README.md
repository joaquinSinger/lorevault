# LoreVault

Content Vault local para escritores de fantasía y ficción.

**Demo:** https://lorevault-opal.vercel.app

## Qué problema resuelve

Escribir un mundo de ficción genera decenas de personajes, lugares y reglas
de lore desparramados en cuadernos y documentos sueltos. Cuando la historia
crece, mantener la consistencia (¿de qué color eran los ojos de este
personaje? ¿en qué capítulo apareció esta ciudad?) se vuelve un trabajo en
sí mismo. LoreVault centraliza ese material en un solo lugar, conectado y
buscable.

## Cómo funciona

- **Notas en 4 categorías fijas**: personajes, locaciones, lore y capítulos,
  con contenido en Markdown (edición con autoguardado + vista previa).
- **Conexiones entre notas**: no dirigidas, visibles desde ambos lados,
  mostradas como marginalia junto a la nota (layout de "códice abierto").
- **Buscador global por título**: en tiempo real, sin distinguir mayúsculas
  ni tildes.
- **Backup manual**: exportar todo el vault a un `.json` e importarlo después
  (reemplazo total con confirmación).

Todo es 100% local: los datos viven en IndexedDB del navegador, no hay
backend ni cuentas. El export a JSON es la forma de respaldar o mover el
vault a otro navegador.

## Stack

- React + TypeScript (estricto) + Vite
- Tailwind CSS v4 (tema propio "Tinta y musgo", tokens en `src/index.css`)
- IndexedDB vía [`idb`](https://github.com/jakearchibald/idb), aislada en
  `src/lib/storage/` — la UI nunca toca IndexedDB directo, lo que deja lista
  la migración a un backend (Etapa 2) sin tocar componentes
- React Router, Context API para el estado global mínimo
- Vitest para la capa de persistencia, GitHub Actions (lint + build)

## Cómo correrlo local

Requiere un proyecto de [Supabase](https://supabase.com) propio. Copiar
`.env.example` a `.env.local` y completar con las credenciales del proyecto
(Dashboard → Settings → API):

```
VITE_SUPABASE_URL=      # Project URL
VITE_SUPABASE_ANON_KEY= # anon/public key (pública por diseño; RLS protege los datos)
```

Después, aplicar el schema de la base: pegar el contenido de
[`supabase/migrations/20260706000000_etapa2_schema.sql`](supabase/migrations/20260706000000_etapa2_schema.sql)
en el SQL editor del dashboard y ejecutarlo (crea las 5 tablas y las
políticas de RLS).

```bash
npm install
npm run dev      # servidor de desarrollo
npm run test     # tests de la capa de persistencia
npm run build    # build de producción
```

## Roadmap

- **Etapa 1 (esta):** MVP local — completa
- **Etapa 2:** sync con backend (Supabase), multi-dispositivo
- **Etapa 3:** vista de grafo de conexiones
