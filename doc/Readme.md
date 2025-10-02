# Monitoramento automatico

Para ativar essa função devem ser enviados os seguintes dados:

exemplo para extenções:
{
    "from": "C:\Users\gilgi\OneDrive\Documentos\testes-filebot-api",
    "to": "C:\Users\gilgi\OneDrive\Documentos\testes-filebot-api\html",
    "extension": [".js"]
}

exemplo para padrões:
{
    "from": "C:\Users\gilgi\OneDrive\Documentos\models\estudos\linguagens-tipadas\typescript-para-javascript\filebot\B",
    "to": "C:\Users\gilgi\OneDrive\Documentos\models\estudos\linguagens-tipadas\typescript-para-javascript\filebot\A",
    "pattern": "desafio"
}

exemplo para data de criação:
{
    "from": "C:\Users\gilgi\OneDrive\Documentos\models\estudos\linguagens-tipadas\typescript-para-javascript\filebot\B",
    "to": "C:\Users\gilgi\OneDrive\Documentos\models\estudos\linguagens-tipadas\typescript-para-javascript\filebot\A",
    "creationDate": ""
}

exemplo para data de modificação:
{
    "from": "C:\Users\gilgi\OneDrive\Documentos\models\estudos\linguagens-tipadas\typescript-para-javascript\filebot\B",
    "to": "C:\Users\gilgi\OneDrive\Documentos\models\estudos\linguagens-tipadas\typescript-para-javascript\filebot\A",
    "creationDate": ""
}

# Ignorar arquivos com base no nome

{
    "from": "C:\Users\gilgi\OneDrive\Documentos\models\estudos\linguagens-tipadas\typescript-para-javascript\filebot\B",
    "to": "C:\Users\gilgi\OneDrive\Documentos\models\estudos\linguagens-tipadas\typescript-para-javascript\filebot\A",
    "extension": [".js"],
    "ignore": ["scripts.js", "scripts.ts"]
}

# 📂 Organizador de Arquivos Automático

## 🎯 Regras de Negócio

1. **Monitoramento em Tempo Real**: O aplicativo deve observar pastas específicas e reorganizar arquivos automaticamente conforme as regras definidas.
2. **Organização por Critérios**: Os arquivos podem ser organizados por:
   - Tipo (PDFs, imagens, vídeos, etc.).
   - Data de criação/modificação.
   - Nome ou padrões específicos.
3. **Personalização pelo Usuário**: O usuário deve poder definir regras personalizadas para cada pasta.
4. **Ações Automatizadas**: Além de mover arquivos, o app pode renomeá-los ou excluir duplicatas, conforme configuração.
5. **Registro de Ações**: Manter um histórico das movimentações para fácil recuperação.
6. **Modo Manual e Automático**: O usuário pode optar por organizar arquivos manualmente ou ativar a automação.
7. **Proteção contra Erros**: Arquivos importantes podem ser marcados como protegidos para evitar movimentações erradas.

---

## 🔧 Requisitos Funcionais

✅ Interface intuitiva para selecionar pastas e definir regras.  
✅ Suporte a múltiplas pastas monitoradas simultaneamente.  
✅ Opção para desfazer a última ação.  
✅ Execução em segundo plano para não interferir na experiência do usuário.  
✅ Logs de ações realizadas.  
✅ Configuração de exceções (arquivos que não devem ser movidos).

---

## 🖥 Requisitos Técnicos

🔹 **Stack principal:** Electron.js + Node.js  
🔹 **Bibliotecas sugeridas:**

- `fs-extra` → Para manipulação de arquivos/pastas.
- `chokidar` → Para monitoramento de arquivos em tempo real.
- `electron-store` → Para salvar configurações do usuário.
- `log4js` → Para gerar logs de ações.
- `sqlite3` ou `lowdb` → Para armazenar regras definidas pelo usuário.

# 📂 Organizador de Arquivos Automático

## 🎯 Regras de Negócio

1. **Monitoramento em Tempo Real**: O aplicativo deve observar pastas específicas e reorganizar arquivos automaticamente conforme as regras definidas.
2. **Organização por Critérios**: Os arquivos podem ser organizados por:
   - Tipo (PDFs, imagens, vídeos, etc.).
   - Data de criação/modificação.
   - Nome ou padrões específicos.
3. **Personalização pelo Usuário**: O usuário deve poder definir regras personalizadas para cada pasta.
4. **Ações Automatizadas**: Além de mover arquivos, o app pode renomeá-los ou excluir duplicatas, conforme configuração.
5. **Registro de Ações**: Manter um histórico das movimentações para fácil recuperação.
6. **Modo Manual e Automático**: O usuário pode optar por organizar arquivos manualmente ou ativar a automação.
7. **Proteção contra Erros**: Arquivos importantes podem ser marcados como protegidos para evitar movimentações erradas.

---

## 🔧 Requisitos Funcionais

✅ Interface intuitiva para selecionar pastas e definir regras.  
✅ Suporte a múltiplas pastas monitoradas simultaneamente.  
✅ Opção para desfazer a última ação.  
✅ Execução em segundo plano para não interferir na experiência do usuário.  
✅ Logs de ações realizadas.  
✅ Configuração de exceções (arquivos que não devem ser movidos).

---

## 🖥 Requisitos Técnicos

🔹 **Stack principal:** Electron.js + Node.js  
🔹 **Bibliotecas sugeridas:**

- `fs-extra` → Para manipulação de arquivos/pastas.
- `chokidar` → Para monitoramento de arquivos em tempo real.
- `electron-store` → Para salvar configurações do usuário.
- `log4js` → Para gerar logs de ações.
- `sqlite3` ou `lowdb` → Para armazenar regras definidas pelo usuário.


# 📂 **FileBot - Organizador de Arquivos Automático**

## **Visão Geral**

O **FileBot** é um aplicativo de desktop desenvolvido com Electron.js e Node.js, projetado para organizar arquivos automaticamente em pastas específicas com base em critérios como tipo, data de criação/modificação, nome ou padrões. O objetivo é fornecer uma solução eficiente para organizar e manter os arquivos organizados, com a possibilidade de personalização de regras e monitoramento em tempo real das pastas.

---

## **Regras de Negócio**

1. **Monitoramento em Tempo Real**: O FileBot observa pastas específicas e reorganiza arquivos automaticamente conforme as regras definidas.
2. **Organização por Critérios**: Arquivos podem ser organizados por:
   - Tipo (ex: PDFs, imagens, vídeos).
   - Data de criação/modificação.
   - Nome ou padrões específicos.
3. **Personalização pelo Usuário**: O usuário pode definir regras personalizadas para cada pasta.
4. **Ações Automatizadas**: Mover, renomear ou excluir duplicatas conforme a configuração definida.
5. **Registro de Ações**: Histórico completo das movimentações realizadas.
6. **Modo Manual e Automático**: O usuário pode alternar entre a organização manual e a automática.
7. **Proteção contra Erros**: Arquivos importantes podem ser marcados como protegidos para evitar movimentações erradas.

---

## **Requisitos Funcionais**

- Interface intuitiva para selecionar pastas e definir regras.
- Suporte para monitoramento de múltiplas pastas simultaneamente.
- Funcionalidade para desfazer a última ação.
- Execução em segundo plano para não interferir na experiência do usuário.
- Geração e armazenamento de logs de ações realizadas.
- Configuração de exceções (arquivos que não devem ser movidos).

---

## **Requisitos Técnicos**

- **Stack principal**:

  - **Electron.js**: Framework para desenvolvimento de desktop.
  - **Node.js**: Para a lógica de back-end.

- **Bibliotecas sugeridas**:
  - **fs-extra**: Para manipulação de arquivos e pastas.
  - **chokidar**: Para monitoramento de arquivos em tempo real.
  - **electron-store**: Para salvar configurações do usuário.
  - **log4js**: Para geração de logs de ações realizadas.
  - **sqlite3** ou **lowdb**: Para armazenar regras e configurações do usuário.

## **Funcionalidades**

### **1. Monitoramento em Tempo Real**

O FileBot permite o monitoramento de pastas específicas e reorganiza arquivos automaticamente conforme as regras definidas.

Exemplo de configuração para monitoramento por tipo de arquivo:

```json
{
  "from": "C:/Documents/test-folder",
  "to": "C:/Documents/organized-folder",
  "extension": [".pdf"]
}
```

### **2. Organização por Critérios**

O usuário pode configurar regras de organização baseadas em:

- **Tipo de arquivo** (extensão).
- **Data de criação**.
- **Data de modificação**.
- **Nome do arquivo** ou padrões específicos.

### **3. Personalização de Regras**

As regras de organização são definidas pelo usuário, e o FileBot pode aplicar essas regras automaticamente ou manualmente.

### **4. Ações Automatizadas**

As ações de organização podem ser configuradas para:

- **Mover** arquivos.
- **Renomear** arquivos.
- **Excluir duplicatas**.

### **5. Logs de Ações Realizadas**

Todas as ações realizadas pelo FileBot são registradas em um log de atividades para fácil acompanhamento e recuperação.

---

## **Exemplos de Configurações**

- **Monitoramento por Extensão**:

```json
{
  "from": "C:/Documents/test-folder",
  "to": "C:/Documents/organized-folder",
  "extension": [".pdf", ".jpg"]
}
```

- **Monitoramento por Nome/Padrão**:

```json
{
  "from": "C:/Documents/test-folder",
  "to": "C:/Documents/organized-folder",
  "pattern": "invoice"
}
```

- **Monitoramento por Data de Criação**:

```json
{
  "from": "C:/Documents/test-folder",
  "to": "C:/Documents/organized-folder",
  "creationDate": "2025-03-01"
}
```

---

## **Tecnologias Utilizadas**

- **Electron.js**: Framework para criar aplicativos de desktop com JavaScript, HTML e CSS.
- **Node.js**: Ambiente de execução para JavaScript no back-end.
- **fs-extra**: Biblioteca para facilitar a manipulação de arquivos e pastas.
- **chokidar**: Biblioteca para monitoramento em tempo real de arquivos.
- **log4js**: Biblioteca para geração de logs detalhados.
- **sqlite3** ou **lowdb**: Bancos de dados para armazenar regras e configurações do usuário.

## **Licença**

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para mais detalhes.
