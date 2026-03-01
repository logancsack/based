FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json eslint.config.mjs ./
COPY packages ./packages
COPY apps ./apps
COPY examples ./examples
COPY .changeset ./.changeset

RUN corepack enable && pnpm install && pnpm build

EXPOSE 3000

CMD ["pnpm", "--filter", "based-lang", "run", "based", "--", "serve", "--entry", "examples/webhook.fr", "--port", "3000"]
