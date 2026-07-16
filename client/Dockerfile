FROM node:22-slim

WORKDIR /app

# Enable pnpm through Corepack
RUN corepack enable

# Copy dependency and pnpm configuration files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the remaining client files
COPY . .

EXPOSE 5173

CMD ["pnpm", "run", "dev", "--host", "0.0.0.0", "--port", "5173"]