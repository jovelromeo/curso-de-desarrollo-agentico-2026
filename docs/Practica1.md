# Inspección y prueba de MCP
> Pre-requisitos: tener instalado [OpenCode](https://opencode.ai/) y Node.js 20 o superior (Recomendación: [instalar con nvm](https://github.com/nvm-sh/nvm)).

1. Crear una definición de [docker-compose.yml](../docker-compose.yml) para un servidor Postgres.
2. Iniciar la base de datos.
3. Inspecional servidor MCP
    1. Correr [MCP Inspector](https://modelcontextprotocol-io.translate.goog/docs/2026-07-28/tools/inspector) web.
    2. Configurar [mcp-postgres-server](https://github.com/antonorlov/mcp-postgres-server) en el MCP Inspector.
    3. Explorar las herramientas disponibles.
    4. Consultar schemas, tablas, etc.
4. Probar con OpenCode
    1. Configurar servidor MCP para uso con Opencode.
        1. Crear configuración de Opencode con el archivo [opencode.jsonc](../opencode.jsonc).
        2. Agregar la configuración del MCP de postgres (mcp-postgres-server) al archivo de configuración (disponible en link del paso 3.2).
    2. Iniciar OpenCode.
    3. Ejecutar `/mcps` y validar que esté conectado.
    4. Instruir al agente para la creación de un conjunto de tablas básicas y sus datos de prueba (ej. usuarios, roles y permisos).
    5. Instruir al agente para obtener diferentes datos en relación a la base de datos y validar con un cliente de base de datos (ej. dame la lista de total de usuarios por rol).
    