## 📌 Lista de Tarefas - Organizador de Arquivos Automático

### 🎯 Regras de Negócio
- [X] Implementar monitoramento em tempo real de pastas.
- [X] Permitir organização por tipo de arquivo.
- [X] Permitir organização por data de criação/modificação.
- [X] Permitir organização por nome/padrões específicos.
- [X] Criar sistema de personalização de regras pelo usuário.
- [X] Implementar ações automatizadas: mover, renomear e excluir duplicatas.
- [X] Registrar histórico de ações realizadas.
- [X] Criar opção para modo manual e automático.
- [X] Implementar proteção contra movimentações erradas (arquivos protegidos).
- [X] Permitir que o usuário defina regras personalizadas para cada pasta.
- [X] Manter um histórico das movimentações para fácil recuperação.

---

### 🔧 Requisitos Funcionais
- [X] Criar interface intuitiva para seleção de pastas e definição de regras.
- [X] Implementar suporte a múltiplas pastas monitoradas simultaneamente.
- [X] Criar opção para desfazer a última ação realizada.
- [X] Permitir execução em segundo plano.
- [X] Gerar e armazenar logs de ações realizadas.
- [X] Implementar configuração de exceções para arquivos que não devem ser movidos.

---

### 🖥 Requisitos Técnicos
- [X] Configurar projeto com Electron.js e Node.js.
- [X] Integrar `fs-extra` para manipulação de arquivos e pastas.
- [X] Utilizar `chokidar` para monitoramento de arquivos em tempo real.
- [ ] Implementar `electron-store` para armazenamento de configurações do usuário.
- [X] Utilizar `log4js` para geração de logs.
- [ ] Definir e configurar banco de dados (`sqlite3` ou `lowdb`) para armazenamento das regras do usuário.

