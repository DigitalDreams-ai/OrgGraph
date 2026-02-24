FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/ontology/package.json ./packages/ontology/package.json

RUN pnpm install --frozen-lockfile --prod=false

COPY . .

RUN pnpm --filter api build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "api", "start"]
