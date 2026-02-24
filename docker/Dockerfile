FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/ontology/package.json ./packages/ontology/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter api build

EXPOSE 3000

CMD ["pnpm", "--filter", "api", "start"]
