FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web ./apps/web
RUN pnpm build:web
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["pnpm", "start"]
