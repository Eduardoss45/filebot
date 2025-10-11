document.addEventListener('DOMContentLoaded', () => {
  // * Seleção de elementos do DOM
  const addFolderForm = document.getElementById('add-folder-form');
  const fromPathInput = document.getElementById('from-path');
  const toPathInput = document.getElementById('to-path');
  const selectFromBtn = document.getElementById('select-from-btn');
  const selectToBtn = document.getElementById('select-to-btn');
  const folderListDiv = document.getElementById('folder-list');
  const historyListDiv = document.getElementById('history-list');
  const logsDiv = document.getElementById('logs');
  const historyTab = document.getElementById('history-tab');
  const backupBtn = document.getElementById('backup-btn');
  const restoreBtn = document.getElementById('restore-btn');
  const recentFromBtn = document.getElementById('recent-from-btn');
  const recentToBtn = document.getElementById('recent-to-btn');
  const recentFromList = document.getElementById('recent-from-list');
  const recentToList = document.getElementById('recent-to-list');
  const importBtn = document.getElementById('import-btn');

  // * Estado local
  let folders = [];

  // * Funções de renderização
  const renderFolders = () => {
    folderListDiv.innerHTML = '';
    if (folders.length === 0) {
      folderListDiv.innerHTML =
        '<p class="text-center text-muted">Nenhuma pasta monitorada. Adicione uma para começar.</p>';
      return;
    }
    folders.forEach(folder => {
      const folderItem = document.createElement('div');
      folderItem.className = 'list-group-item d-flex justify-content-between align-items-center';
      folderItem.innerHTML = `
        <div>
          <h5>${folder.name}</h5>
          <small class="text-muted">De:</small> <code>${folder.from}</code><br>
          <small class="text-muted">Para:</small> <code>${folder.to}</code><br>
          <span class="badge bg-${folder.monitoring ? 'success' : 'secondary'}">${
        folder.monitoring ? 'Monitorando' : 'Inativo'
      }</span>
        </div>
        <div>
          <button class="btn btn-${
            folder.monitoring ? 'warning' : 'success'
          } btn-sm start-stop-btn" data-id="${folder.id}">
            <i class="bi ${folder.monitoring ? 'bi-stop-circle' : 'bi-play-circle'}"></i> ${
        folder.monitoring ? 'Parar' : 'Iniciar'
      }
          </button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${folder.id}">
            <i class="bi bi-trash"></i> Excluir
          </button>
          <button class="btn btn-info btn-sm export-btn" data-id="${folder.id}">
            <i class="bi bi-box-arrow-up"></i> Exportar
          </button>
        </div>
      `;
      folderListDiv.appendChild(folderItem);
    });
  };

  const renderHistory = history => {
    historyListDiv.innerHTML = '';
    if (history.length === 0) {
      historyListDiv.innerHTML =
        '<p class="text-center text-muted">Nenhum evento de arquivo registrado.</p>';
      return;
    }
    history.forEach(entry => {
      const item = document.createElement('a');
      item.className = 'list-group-item list-group-item-action';
      item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${entry.fileName}</h6>
                <small>${new Date(entry.timestamp).toLocaleString()}</small>
            </div>
            <p class="mb-1"><span class="badge bg-info">${entry.status}</span> <code>${
        entry.sourcePath
      }</code> → <code>${entry.destinationPath}</code></p>
            <small>${entry.details || ''}</small>
        `;
      historyListDiv.appendChild(item);
    });
  };

  const renderRecentPaths = (paths, listElement, inputElement) => {
    listElement.innerHTML = '';
    if (paths.length === 0) {
      listElement.innerHTML =
        '<li><a class="dropdown-item disabled" href="#">Nenhum caminho recente</a></li>';
      return;
    }
    paths.forEach(p => {
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'dropdown-item';
      link.href = '#';
      link.textContent = p.path;
      link.addEventListener('click', e => {
        e.preventDefault();
        inputElement.value = p.path;
      });
      listItem.appendChild(link);
      listElement.appendChild(listItem);
    });
  };

  // * Carregamento de dados
  const loadFolders = async () => {
    folders = await window.electronAPI.getFolders();
    renderFolders();
  };

  const loadHistory = async () => {
    const history = await window.electronAPI.getHistory();
    renderHistory(history);
  };

  // * Escuta de eventos
  selectFromBtn.addEventListener('click', async () => {
    const path = await window.electronAPI.selecionarPasta();
    if (path) fromPathInput.value = path;
  });

  selectToBtn.addEventListener('click', async () => {
    const path = await window.electronAPI.selecionarPasta();
    if (path) toPathInput.value = path;
  });

  recentFromBtn.addEventListener('click', async () => {
    const recentPaths = await window.electronAPI.getRecentPaths();
    renderRecentPaths(recentPaths, recentFromList, fromPathInput);
  });

  recentToBtn.addEventListener('click', async () => {
    const recentPaths = await window.electronAPI.getRecentPaths();
    renderRecentPaths(recentPaths, recentToList, toPathInput);
  });
  // ! Verificar se o campo ignore está funcionando corretamente
  addFolderForm.addEventListener('submit', async event => {
    event.preventDefault();
    const newFolder = {
      name: document.getElementById('folder-name').value,
      from: fromPathInput.value,
      to: toPathInput.value,
      rule: {
        criteria: document.getElementById('criteria-select').value,
        value: document.getElementById('criteria-value').value,
      },
      ignore: document
        .getElementById('ignore-input')
        .value.split(',')
        .filter(Boolean)
        .map(item => item.trim()),
    };
    await window.electronAPI.addFolder(newFolder);
    addFolderForm.reset();
    fromPathInput.value = '';
    toPathInput.value = '';
    loadFolders();
  });

  folderListDiv.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;

    const folderId = button.dataset.id;
    const folder = folders.find(f => f.id === folderId);

    if (button.classList.contains('start-stop-btn')) {
      const action = folder.monitoring ? 'stopMonitoring' : 'startMonitoring';
      const result = await window.electronAPI[action](folderId);
      if (result.success) {
        // Update local state and re-render for immediate feedback
        folder.monitoring = !folder.monitoring;
        renderFolders();
      } else {
        alert(`Erro: ${result.message}`);
      }
    }

    if (button.classList.contains('delete-btn')) {
      if (confirm(`Tem certeza que deseja excluir a regra "${folder.name}"?`)) {
        await window.electronAPI.removeFolder(folderId);
        loadFolders();
      }
    }

    if (button.classList.contains('export-btn')) {
      const result = await window.electronAPI.exportFolderConfig(folderId);
      if (result.success) {
        alert(`Configuração exportada para: ${result.path}`);
      } else {
        alert(`Falha na exportação: ${result.message}`);
      }
    }
  });

  importBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.importFolderConfig();
    if (result.success) {
      alert(`Configuração "${result.folder.name}" importada com sucesso!`);
      loadFolders();
    } else if (result.message !== 'Importação cancelada.') {
      alert(`Falha na importação: ${result.message}`);
    }
  });

  historyTab.addEventListener('shown.bs.tab', loadHistory);

  backupBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.backupDatabase();
    alert(
      result.success ? `Backup salvo em: ${result.path}` : `Falha no backup: ${result.message}`
    );
  });

  restoreBtn.addEventListener('click', async () => {
    if (
      confirm('Restaurar um backup substituirá todas as configurações atuais. Deseja continuar?')
    ) {
      const result = await window.electronAPI.restoreDatabase();
      if (result.success) {
        alert('Backup restaurado com sucesso!');
        loadFolders();
        loadHistory();
      } else {
        alert(`Falha na restauração: ${result.message}`);
      }
    }
  });

  // --- Logging ---
  const log = message => {
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsDiv.appendChild(div);
    logsDiv.scrollTop = logsDiv.scrollHeight;
  };

  window.electronAPI.onLogMessage(log);

  // --- Initial Load ---
  loadFolders();
});
