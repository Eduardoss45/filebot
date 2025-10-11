gemini prompt """
Ajuste o sistema atual em Electron.js para incluir as seguintes especificações:

📁 **1. Gerenciamento de pastas monitoradas**

- Permitir ao usuário selecionar pastas e salvar seus caminhos.
- Adicionar cada pasta às opções recentes.
- Cada pasta deve ter configurações próprias salvas em JSON.
- Permitir importação e exportação dessas configurações.
- Limitar o monitoramento a no máximo 5 pastas simultâneas para evitar sobrecarga.

⚙️ **2. Monitoramento automático (segundo plano)**

- Usar `chokidar` para monitorar alterações em tempo real nas pastas selecionadas.
- Permitir ativar/desativar o monitoramento por pasta.
- Quando ativo, mover automaticamente arquivos para a pasta de destino conforme critérios definidos (ex: extensão de arquivo).
- O processo deve funcionar em segundo plano sem travar a UI.

🧩 **3. Filtros e proteção contra erros**

- Permitir definir filtros por extensão (ex: `.js`).
- Adicionar lista de arquivos ignorados (ex: `script.js`, `index.js`, `main.js`) para evitar exceções e comportamentos indesejados.
- Garantir que o sistema continue estável mesmo com falhas ou acessos bloqueados.

💾 **4. Armazenamento e logs**

- Usar `electron-store` para salvar configurações persistentes do usuário.
- Usar `fs-extra` para manipulação de arquivos e pastas.
- Usar `log4js` para registrar logs de ações, erros e eventos de monitoramento.

🗄️ **5. Banco de dados local para regras do usuário**

- Integrar um banco de dados local para armazenar as regras de automação, filtros e histórico de ações.
- Permitir escolher entre `sqlite3` (para operações mais robustas) ou `lowdb` (para configuração mais leve e simples).
- Cada pasta monitorada deve ter suas próprias regras salvas e recuperáveis no banco.
- Garantir compatibilidade com o empacotamento do Electron (o usuário não precisa instalar nada adicional).
- Implementar função de backup/exportação do banco de dados em JSON.

🧠 **Requisitos gerais**

- Interface simples e responsiva em Electron.
- Modularização do código (ex: monitor, config, database, logger, ui).
- Código bem comentado e fácil de manter.
- Interface intuitiva e leve usando o bootstrap e estilização nativa com css (caso precise).
  """
  