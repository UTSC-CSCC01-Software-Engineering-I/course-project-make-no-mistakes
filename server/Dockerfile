FROM node:22-trixie-slim

WORKDIR /app

# Enable pnpm through Corepack
RUN corepack enable

# sqlite3 may need native compilation tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and pnpm build permissions
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the remaining server files
COPY . .

EXPOSE 8080

CMD ["pnpm", "run", "dev"]