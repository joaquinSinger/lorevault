# LoreVault

Content Vault para escritores de fantasía y ficción.

**Demo:** https://lorevault-opal.vercel.app

## Qué problema resuelve

Escribir un mundo de ficción genera decenas de personajes, lugares y reglas
de lore desparramados en cuadernos y documentos sueltos. Cuando la historia
crece, mantener la consistencia (¿de qué color eran los ojos de este
personaje? ¿en qué capítulo apareció esta ciudad?) se vuelve un trabajo en
sí mismo. LoreVault centraliza ese material en un solo lugar, conectado y
buscable, accesible desde cualquier dispositivo con una cuenta.

## Cómo funciona

- **Cuentas y vaults**: cada usuario crea su cuenta (email/contraseña) y
  organiza su material en uno o más vaults independientes.
- **Notas en 4 categorías fijas**: personajes, locaciones, lore y capítulos,
  con contenido en Markdown (edición con autoguardado + vista previa) y
  orden manual para capítulos.
- **Conexiones entre notas**: no dirigidas, visibles desde ambos lados,
  mostradas como marginalia junto a la nota (layout de "códice abierto").
- **Tags por vault**: etiquetas libres asociables a cualquier nota, con
  autocompletado y creación al vuelo.
- **Buscador global por título**: en tiempo real, sin distinguir mayúsculas
  ni tildes.

Los datos viven en Postgres (Supabase); el acceso está protegido por Row
Level Security a nivel de base de datos, no por filtros del cliente.

## Stack

- React + TypeScript (estricto) + Vite
- Tailwind CSS v4 (tema propio "Tinta y musgo", tokens en `src/index.css`)
- [Supabase](https://supabase.com) como backend (Postgres + Auth + RLS),
  sin servidor propio: el cliente habla con Supabase vía `supabase-js`,
  aislado en `src/lib/storage/` — la UI nunca toca `supabase-js` directo
- React Router, Context API para el estado global mínimo
- Vitest para la capa de persistencia (cliente de Supabase mockeado),
  GitHub Actions (lint + build)

## Cómo correrlo local

Requiere un proyecto de [Supabase](https://supabase.com) propio. Copiar
`.env.example` a `.env.local` y completar con las credenciales del proyecto
(Dashboard → Settings → API):

```
VITE_SUPABASE_URL=      # Project URL
VITE_SUPABASE_ANON_KEY= # anon/public key (pública por diseño; RLS protege los datos)
```

Después, aplicar el schema de la base: pegar en el SQL editor del dashboard,
en orden, el contenido de cada archivo de
[`supabase/migrations/`](supabase/migrations/) (el nombre de archivo empieza
con su timestamp — ejecutarlos de menor a mayor). Crean las 5 tablas, las
políticas de RLS y la columna de orden de capítulos.

```bash
npm install
npm run dev      # servidor de desarrollo
npm run test     # tests de la capa de persistencia
npm run build    # build de producción
```

## Roadmap

- **Etapa 1:** MVP local (IndexedDB, sin cuentas) — completa
- **Etapa 2 (esta):** backend real con Supabase — cuentas, múltiples vaults,
  tags, multi-dispositivo — completa
- **Etapa 3:** vista de grafo de conexiones
