document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings');
  const monitoringSwitch = document.getElementById('monitoring');
  const regrasSwitch = document.getElementById('ativar-regras-personalizadas');
  const folderSelect = form.querySelector('select[name="pasta-selecionada"]');
  const folderInput = document.getElementById('folderInput');
  const organizationRadios = form.querySelectorAll('input[name="metodo-organizacao"]');
  const saveBtn = form.querySelector('.btn-success');
  const deleteBtn = form.querySelector('.btn-danger');
  const dateInputs = form.querySelectorAll('input[type="date"]');
  const registroCard = document.querySelector('#collapseThree .card');
  const patternInput = form.querySelector('input[placeholder*="Nome ou padrão específico"]');
  const warningDiv = document.createElement('div');
  warningDiv.className = 'alert alert-warning mt-2 d-none';
  form.prepend(warningDiv);

  function updateFormState() {
    const monitoringOn = monitoringSwitch.checked;
    const regrasOn = regrasSwitch.checked;

    warningDiv.classList.add('d-none');
    warningDiv.textContent = '';
    regrasSwitch.disabled = !monitoringOn;
    folderInput.disabled = !monitoringOn || !regrasOn;
    folderSelect.disabled = !monitoringOn || !regrasOn;
    patternInput.disabled = !monitoringOn;

    if (!monitoringOn) {
      warningDiv.textContent =
        'Monitoramento desativado: todas as regras e seleção de pasta estão desabilitadas.';
      warningDiv.classList.remove('d-none');
    }

    if (!regrasOn && monitoringOn) {
      warningDiv.textContent =
        'Regras personalizadas desativadas: a seleção de pasta está desabilitada.';
      warningDiv.classList.remove('d-none');
    }

    const selectedMethod = Array.from(organizationRadios).find(r => r.checked)?.value;
    if (selectedMethod === 'tipo') {
      dateInputs.forEach(i => (i.disabled = true));
      if (monitoringOn) {
        warningDiv.textContent += "\nMétodo 'Tipo' selecionado: campos de data desabilitados.";
        warningDiv.classList.remove('d-none');
      }
    } else {
      dateInputs.forEach(i => (i.disabled = !monitoringOn));
    }

    saveBtn.disabled = !monitoringOn;
    deleteBtn.disabled = !monitoringOn;
  }

  monitoringSwitch.addEventListener('change', updateFormState);
  regrasSwitch.addEventListener('change', updateFormState);
  organizationRadios.forEach(r => r.addEventListener('change', updateFormState));

  updateFormState();

  folderInput.addEventListener('change', () => {
    if (folderInput.files.length > 0) {
      const folderPath = folderInput.files[0].webkitRelativePath.split('/')[0];

      folderSelect.innerHTML = `<option value="${folderPath}" selected>${folderPath}</option>`;
      folderSelect.disabled = false;

      let pathField = form.querySelector('input[name="pasta-caminho"]');
      if (!pathField) {
        pathField = document.createElement('input');
        pathField.type = 'hidden';
        pathField.name = 'pasta-caminho';
        form.appendChild(pathField);
      }
      pathField.value = folderPath;

      updatePatternFiles();
    } else {
      folderSelect.innerHTML = `<option selected>Selecione uma pasta (Obrigatório)</option>`;
      folderSelect.disabled = true;
    }
  });

  function getFilesMatchingPattern(pattern) {
    if (!folderInput.files.length || !pattern.trim()) return [];
    return Array.from(folderInput.files).filter(file => {
      const fileName = file.name.split('.')[0];
      return fileName.includes(pattern.trim());
    });
  }

  function updatePatternFiles() {
    const pattern = patternInput.value;
    const matchingFiles = getFilesMatchingPattern(pattern);
    if (matchingFiles.length > 0) {
      registroCard.innerHTML = `<p class="text-info">Arquivos correspondentes ao padrão "${pattern}": ${matchingFiles
        .map(f => f.name)
        .join(', ')}</p>`;
    } else if (pattern.trim()) {
      registroCard.innerHTML = `<p class="text-warning">Nenhum arquivo encontrado para o padrão "${pattern}".</p>`;
    }
  }

  patternInput.addEventListener('input', updatePatternFiles);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    console.log('Dados a enviar:', data);

    registroCard.innerHTML = `<p class="text-success">Configuração pronta para processar localmente: ${JSON.stringify(
      data
    )}</p>`;
  });

  saveBtn.addEventListener('click', () => form.requestSubmit());
  deleteBtn.addEventListener('click', () => {
    form.reset();
    updateFormState();
    registroCard.innerHTML = `<p class="text-muted">Configuração excluída...</p>`;
  });
});
