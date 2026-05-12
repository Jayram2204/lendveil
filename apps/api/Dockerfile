FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
COPY packages/types ./packages/types
COPY config ./config
COPY docs/policies ./docs/policies
RUN pnpm build:types && pnpm build:api
EXPOSE 4000
CMD ["node", "apps/api/dist/apps/api/src/server.js"]
