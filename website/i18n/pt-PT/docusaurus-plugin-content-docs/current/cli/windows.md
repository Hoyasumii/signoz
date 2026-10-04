---
sidebar_position: 3
title: Janelas e WSL
description: "Usando o CLI no Windows 10/11 do PowerShell ou cmd, e registrando o servidor em clientes Windows do WSL."
---

# Janelas e WSL

O pacote é executado no Windows 10/11 com Node.js 20 ou mais tarde, de PowerShell ou cmd.

- O ficheiro de configuração está activo `%APPDATA%\signoz\.env`, protegidos pelas permissões dessa pasta por usuário
  (modos de arquivo não significam nada no Windows).
- `signoz mcp boot enable` registra uma tarefa de logon.
- `signoz mcp stop` pede ao servidor para desligar através de um token-guarded `POST /shutdown` antes de cair para
  terminar: um sinal no Windows é `TerminateProcess`, que não deixaria o servidor desligar.
- Os CLIs clientes são executados através `cross-spawn`, assim Windows `.cmd` Shims funciona.
- Os arquivos são escritos através de um renome que retorna, porque antivírus e editores mantêm os arquivos abertos.

## De WSL

Quando o pacote é instalado dentro do WSL, `signoz mcp install` e `uninstall` também listar os clientes instalados no
lado Windows, como `Claude Code (Windows)` E assim por diante (`--client claude@windows`). Iniciar o servidor com
`wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, então ele continua lendo a configuração salva dentro do WSL. A primeira
chamada após WSL foi ocioso espera para que a distro comece (um segundo ou dois).

O lado do Windows é alcançado através `powershell.exe`, retirado do PATH ou, com `appendWindowsPath = false`, de
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Quando não pode ser alcançado, `--client claude@windows` diz qual
passo falhou.

Para iniciar o servidor no login dentro do WSL, habilitar o sistema `/etc/wsl.conf` primeiro, em seguida, executar
`npx signoz mcp boot enable`.
