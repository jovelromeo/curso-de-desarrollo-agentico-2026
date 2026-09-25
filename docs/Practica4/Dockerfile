FROM node:26-slim

# herramientas del agente: git, ripgrep (grep/glob), curl, certificados TLS
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ripgrep curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# OpenCode + git: la imagen no permite push a ningún lado (protocol.allow=never)
# y usa identidad opencode-agent para los commits hechos desde el contenedor
RUN npm install -g @opencode/cli@2.0.16 \
  && npm cache clean --force \
  && git config --system protocol.allow never \
  && git config --system --add safe.directory /workspace \
  && git config --system user.name opencode-agent \
  && git config --system user.email opencode-agent@localhost

WORKDIR /workspace

ENTRYPOINT ["opencode"]
