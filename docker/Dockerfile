FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable

ARG CCI_VERSION=3.78.0
ENV CCI_VERSION=${CCI_VERSION}

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv ca-certificates \
  && python3 -m venv /opt/cci \
  && /opt/cci/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/cci/bin/pip install --no-cache-dir "cumulusci==${CCI_VERSION}" \
  && ln -sf /opt/cci/bin/cci /usr/local/bin/cci \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/ontology/package.json ./packages/ontology/package.json

RUN pnpm install --frozen-lockfile --prod=false

COPY . .

RUN pnpm --filter api build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "api", "start"]
