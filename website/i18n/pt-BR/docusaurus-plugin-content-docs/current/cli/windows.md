---
sidebar_position: 3
title: Windows e WSL
description: "Usando a CLI no Windows 10/11 pelo PowerShell ou cmd, e registrando o servidor em clientes Windows a partir do WSL."
---

# Windows e WSL

O pacote roda no Windows 10/11 com Node.js 20 ou mais recente, pelo PowerShell ou pelo cmd.

- O arquivo de configurações fica em `%APPDATA%\signoz\.env`, protegido pelas permissões por usuário dessa pasta
  (modos de arquivo não significam nada no Windows).
- `signoz mcp boot enable` registra uma tarefa de logon.
- `signoz mcp stop` pede ao servidor que encerre por um `POST /shutdown` protegido por token antes de recorrer a
  terminá-lo: um sinal no Windows é `TerminateProcess`, que não deixaria o servidor encerrar.
- As CLIs dos clientes rodam por `cross-spawn`, então os shims `.cmd` do Windows funcionam.
- Arquivos são gravados por um rename que tenta de novo, porque antivírus e editores seguram arquivos abertos.

## A partir do WSL

Com o pacote instalado dentro do WSL, `signoz mcp install` e `uninstall` também listam os clientes instalados do lado
Windows, como `Claude Code (Windows)` e assim por diante (`--client claude@windows`). Eles iniciam o servidor com
`wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, então ele continua lendo a configuração salva dentro do WSL. A
primeira chamada depois que o WSL ficou ocioso espera a distro iniciar (um ou dois segundos).

O lado Windows é alcançado pelo `powershell.exe`, tirado do PATH ou, com `appendWindowsPath = false`, de
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Quando não dá para alcançá-lo, `--client claude@windows` diz qual
passo falhou.

Para iniciar o servidor no login dentro do WSL, habilite o systemd em `/etc/wsl.conf` primeiro e depois rode
`npx signoz mcp boot enable`.
