---
sidebar_position: 2
title: Configuration
description: "Enregistrer vos paramètres une fois et enregistrer le SigNoz Serveur MCP dans Claude Code, Codex et OpenCode."
---

# Configuration

## La voie rapide

Enregistrez vos paramètres une fois, puis laissez le CLI enregistrer le serveur dans les clients qu'il trouve:

```bash
npx signoz mcp config    # asks for the instance URL, an API key (or the browser tokens), an environment and a port
npx signoz mcp install   # finds Claude Code, Codex and OpenCode on your PATH and registers signoz-mcp (stdio)
```

`install` montre une liste des clients qu'il a trouvés. Cochez ceux que vous voulez, et il enregistre le serveur à
travers le CLI propre de chaque client, sous le nom `signoz`. La commande enregistrée lit la configuration sauvegardée
lorsque le client la lance, de sorte qu'aucun justificatif ne se retrouve dans la configuration du client. Voir
[`signoz mcp install`](../cli/mcp-commands.md#signoz-mcp-install) pour les drapeaux.

## À la main: stdio

Laissez le client commencer `signoz-mcp`. Il lit la configuration enregistrée, donc la configuration du client n'a pas
besoin de clés:

```json
{
  "mcpServers": {
    "signoz": { "command": "npx", "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"] }
  }
}
```

En Claude Code:

```bash
claude mcp add signoz -- npx -y -p @hoyasumii/signoz signoz-mcp
```

Sans configuration sauvegardée, ou pour la surcharger, donner au client une `env` bloc avec `SIGNOZ_BASE_URL` et
`SIGNOZ_API_KEY` (voir [Configuration](./configuration.md)) :

```json
{
  "mcpServers": {
    "signoz": {
      "command": "npx",
      "args": ["-y", "-p", "@hoyasumii/signoz", "signoz-mcp"],
      "env": { "SIGNOZ_BASE_URL": "https://signoz.example.com", "SIGNOZ_API_KEY": "your-api-key" }
    }
  }
}
```

## À la main : HTTP

Exécutez un serveur en arrière-plan et pointez vos clients à son URL:

```bash
npx signoz mcp start          # prints the URL, http://127.0.0.1:3767/mcp by default
claude mcp add --transport http signoz http://127.0.0.1:3767/mcp
```

Sans le CLI, `signoz-mcp --http` l'exécute au premier plan avec les paramètres depuis l'environnement ou la
configuration enregistrée. `signoz-mcp --help` liste les drapeaux. Pour démarrer le serveur à chaque connexion, lancez
`npx signoz mcp boot enable` (voir [`signoz mcp boot`](../cli/mcp-commands.md#signoz-mcp-boot)) .

## Vérification du fonctionnement

Demandez à votre agent d'appeler `signoz_whoami`, ou l'exécuter depuis le terminal:

```bash
npx signoz whoami
```

Il répond à l'URL de l'instance, le mode auth, le compte utilisateur ou de service, SigNoz version les miroirs SDK et
l'environnement par défaut.
