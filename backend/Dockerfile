# ─────────────────────────────────────────────────────────────────────────────
# ValidaLab — backend NestJS · imagen de producción
#
# Dos etapas: `build` compila con el árbol completo de dependencias y `runtime`
# parte de cero con solo las de producción. Así el compilador de TypeScript y el
# resto del utillaje de desarrollo no viajan a la imagen final.
#
# La imagen NO ejecuta migraciones al arrancar: `migrationsRun` es `false` y las
# migraciones son un paso de release (`npm run migration:run:prod`), porque con
# varias réplicas todas las intentarían a la vez.
#
#   docker build -t validalab-backend .
#   docker run --env-file .env -p 3000:3000 validalab-backend
# ─────────────────────────────────────────────────────────────────────────────

# --- Etapa 1: compilación ---------------------------------------------------
# Node 24, la misma línea mayor que fija el CI.
FROM node:24-alpine AS build

WORKDIR /app

# Las dependencias se copian aparte del código: mientras el manifiesto no
# cambie, Docker reutiliza la capa del `npm ci` y no reinstala en cada build.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build


# --- Etapa 2: ejecución -----------------------------------------------------
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# `--omit=dev` deja fuera Jest, ESLint y el resto del utillaje. `typeorm`,
# `dotenv`, `pg` y `zod` SÍ son dependencias de producción, que es lo que hace
# viable ejecutar las migraciones desde esta imagen sin el árbol de desarrollo.
#
# El `rm` no es cosmético: `typeorm` declara `ts-node` como peer dependency
# opcional, npm la resuelve en el lockfile y `npm ci` la instala aunque se pida
# `--omit=dev --omit=peer`. Sin este borrado, un compilador de TypeScript (~25 MB)
# viajaría a la imagen de producción por la puerta de atrás. Es seguro quitarlo
# porque `ts-node` solo hace falta para cargar un DataSource escrito en `.ts`, y
# aquí siempre se carga el compilado (`dist/database/data-source.js`).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && rm -rf node_modules/typescript node_modules/ts-node \
           node_modules/.bin/tsc node_modules/.bin/tsserver \
           node_modules/.bin/ts-node* \
 && npm cache clean --force

COPY --from=build /app/dist ./dist

# La imagen de Node trae un usuario `node` sin privilegios; el proceso no
# necesita escribir en el sistema de archivos.
USER node

# El puerto lo asigna la plataforma y `AppConfigService` lo lee del entorno, así
# que no se fija aquí. `EXPOSE` es solo documentación del valor por defecto.
EXPOSE 3000

CMD ["node", "dist/main"]
