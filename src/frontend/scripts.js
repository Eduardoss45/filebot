document.addEventListener('DOMContentLoaded', () => {
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
  const addFolderBtn = document.getElementById('add-folder-btn');
  const dayjs = window.dayjs;

  let folders = [];
  let fullHistory = [];
  let pendingHistory = [];

  const normalizePath = path => path.trim().replace(/\\/g, '/');
  const isHistoryTabActive = () => historyTab.classList.contains('active');

  const completedForm = () => {
    const fields = addFolderForm.querySelectorAll('input:not([disabled]), select:not([disabled])');
    return Array.from(fields).every(f => f.id === 'ignore-input' || f.value.trim() !== '');
  };

  const renderFolders = () => {
    folderListDiv.innerHTML = '';
    if (!folders.length) {
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
    if (!history.length) {
      historyListDiv.innerHTML =
        '<p class="text-center text-muted">Nenhum evento de arquivo registrado.</p>';
      return;
    }
    history.forEach(entry => addHistoryEntry(entry, false));
  };

  const addHistoryEntry = (entry, prepend = true) => {
    const item = document.createElement('div');
    item.className = 'list-group-item list-group-item-action';

    const canRevert =
      (entry.action_type === 'MOVE' || entry.action_type === 'RENAME_AND_MOVE') &&
      entry.status !== 'REVERTED';

    if (entry.status === 'REVERTED') {
      item.classList.add('bg-secondary', 'text-white');
    } else if (entry.action_type === 'MOVE' || entry.action_type === 'RENAME_AND_MOVE') {
      item.classList.add('bg-light');
    }

    item.innerHTML = `
    <div class="d-flex w-100 justify-content-between">
      <h6 class="mb-1">${entry.action_type}</h6>
      <small>${dayjs(entry.timestamp).utc().utcOffset(-3).format('DD/MM/YYYY HH:mm:ss')}</small>
    </div>
    <p class="mb-1"><code>${entry.source_path}</code> → <code>${entry.destination_path}</code></p>
    <small>${entry.details || ''}</small>
    ${
      canRevert
        ? `<button class="btn btn-sm btn-outline-warning mt-2 revert-btn" data-id="${entry.id}">Reverter</button>`
        : ''
    }
    ${
      entry.status === 'REVERTED'
        ? '<span class="badge bg-secondary float-end">Revertido</span>'
        : ''
    }
  `;

    if (prepend) {
      historyListDiv.prepend(item);
      historyListDiv.scrollTop = 0;
    } else {
      historyListDiv.appendChild(item);
    }
  };

  const renderRecentPaths = (paths, listElement, inputElement) => {
    listElement.innerHTML = '';
    if (!paths.length) {
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

  const loadFolders = async () => {
    folders = await window.electronAPI.getFolders();
    renderFolders();
  };

  const loadHistory = async () => {
    fullHistory = await window.electronAPI.getActionHistory();
    renderHistory(fullHistory);
  };

  historyListDiv.addEventListener('click', async event => {
    if (event.target.classList.contains('revert-btn')) {
      const actionId = event.target.dataset.id;
      if (confirm('Tem certeza que deseja reverter esta ação?')) {
        const result = await window.electronAPI.revertAction(actionId);
        alert(result.message);
        if (result.success) {
          const revertedEntry = await window.electronAPI.getActionById(actionId);
          if (revertedEntry) {
            const itemToUpdate = document
              .querySelector(`.revert-btn[data-id="${actionId}"]`)
              .closest('.list-group-item');
            if (itemToUpdate) {
              addHistoryEntry(revertedEntry, true);
              itemToUpdate.remove();
            }
          }
        }
      }
    }
  });

  addFolderForm.addEventListener('input', () => {
    addFolderBtn.disabled = !completedForm();
  });

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
        .map(i => i.trim())
        .filter(Boolean),
    };

    if (newFolder.from === newFolder.to)
      return alert('A pasta de origem e destino não podem ser iguais.');

    const existingFolders = await window.electronAPI.getFolders();

    if (
      existingFolders.some(
        f =>
          normalizePath(f.from) === normalizePath(newFolder.from) &&
          normalizePath(f.to) === normalizePath(newFolder.to) &&
          f.rule.criteria === newFolder.rule.criteria &&
          f.rule.value === newFolder.rule.value
      )
    )
      return alert('Já existe uma regra idêntica para essas pastas.');

    if (
      existingFolders.find(
        f =>
          f.from === newFolder.to &&
          f.to === newFolder.from &&
          f.rule.criteria === newFolder.rule.criteria &&
          f.rule.value === newFolder.rule.value
      )
    )
      return alert('Já existe uma regra que faz o caminho inverso.');

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
    if (!folder) return;

    if (button.classList.contains('start-stop-btn')) {
      const action = folder.monitoring ? 'stopMonitoring' : 'startMonitoring';
      const result = await window.electronAPI[action](folderId);
      if (result.success) folder.monitoring = !folder.monitoring;
      else alert(`Erro: ${result.message}`);
      renderFolders();
    }

    if (button.classList.contains('delete-btn')) {
      if (confirm(`Tem certeza que deseja excluir "${folder.name}"?`)) {
        await window.electronAPI.removeFolder(folderId);
        loadFolders();
      }
    }

    if (button.classList.contains('export-btn')) {
      const result = await window.electronAPI.exportFolderConfig(folderId);
      alert(
        result.success ? `Configuração exportada para: ${result.path}` : `Falha: ${result.message}`
      );
    }
  });

  importBtn.addEventListener('click', async () => {
    const importResult = await window.electronAPI.importFolderConfig();
    if (!importResult.success)
      return alert(
        importResult.message !== 'Importação cancelada.' ? `Falha: ${importResult.message}` : ''
      );

    const importedFolder = importResult.folder;
    const existingFolders = await window.electronAPI.getFolders();

    if (
      existingFolders.some(
        f =>
          normalizePath(f.from) === normalizePath(importedFolder.from) &&
          normalizePath(f.to) === normalizePath(importedFolder.to) &&
          f.rule.criteria === importedFolder.rule.criteria &&
          f.rule.value === importedFolder.rule.value
      )
    )
      return alert(`A configuração "${importedFolder.name}" já existe.`);

    const addResult = await window.electronAPI.addFolder(importedFolder);
    if (!addResult.success) return alert(addResult.message);

    alert(`Configuração "${importedFolder.name}" importada com sucesso!`);
    loadFolders();
  });

  backupBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.backupDatabase();
    alert(result.success ? `Backup salvo em: ${result.path}` : `Falha: ${result.message}`);
  });

  restoreBtn.addEventListener('click', async () => {
    if (!confirm('Restaurar substituirá todas as configurações. Deseja continuar?')) return;
    const result = await window.electronAPI.restoreDatabase();
    alert(result.success ? 'Backup restaurado com sucesso!' : `Falha: ${result.message}`);
    if (result.success) {
      loadFolders();
      loadHistory();
    }
  });

  historyTab.addEventListener('shown.bs.tab', async () => {
    await loadHistory();
    pendingHistory.forEach(entry => addHistoryEntry(entry));
    pendingHistory = [];
  });

  window.electronAPI.onHistoryUpdated(entry => {
    if (isHistoryTabActive()) addHistoryEntry(entry);
    else pendingHistory.push(entry);
  });

  const log = message => {
    const div = document.createElement('div');
    div.textContent = `[${dayjs().utc().utcOffset(-3).format('DD/MM/YYYY HH:mm:ss')}] ${message}`;
    logsDiv.appendChild(div);
    logsDiv.scrollTop = logsDiv.scrollHeight;
  };

  window.electronAPI.onLogMessage(log);

  loadFolders();
  loadHistory();
  addFolderBtn.disabled = !completedForm();
});
