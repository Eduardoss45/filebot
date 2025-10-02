document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("organization-form");
  const fromPathInput = document.getElementById("from-path");
  const toPathInput = document.getElementById("to-path");
  const selectFromBtn = document.getElementById("select-from-btn");
  const selectToBtn = document.getElementById("select-to-btn");
  const revertBtn = document.getElementById("revert-btn");
  const statusMessage = document.getElementById("status-message");

  const criteriaRadios = document.querySelectorAll('input[name="criteria"]');
  const criteriaInputs = {
    extension: document.getElementById("extension-input"),
    pattern: document.getElementById("pattern-input"),
    creationDate: document.getElementById("creation-date-input"),
    modificationDate: document.getElementById("modification-date-input"),
  };

  // Função para habilitar/desabilitar inputs de critério
  const toggleCriteriaInputs = () => {
    const selectedCriteria = document.querySelector(
      'input[name="criteria"]:checked'
    ).value;
    for (const key in criteriaInputs) {
      criteriaInputs[key].disabled = key !== selectedCriteria;
    }
  };

  criteriaRadios.forEach((radio) => {
    radio.addEventListener("change", toggleCriteriaInputs);
  });

  // Selecionar pastas
  selectFromBtn.addEventListener("click", async () => {
    const path = await window.electronAPI.selecionarPasta();
    if (path) {
      fromPathInput.value = path;
    }
  });

  selectToBtn.addEventListener("click", async () => {
    const path = await window.electronAPI.selecionarPasta();
    if (path) {
      toPathInput.value = path;
    }
  });

  // Iniciar organização
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const from = fromPathInput.value;
    const to = toPathInput.value;

    if (!from || !to) {
      updateStatus("Por favor, selecione as pastas de origem e destino.", "alert-danger");
      return;
    }

    const selectedCriteria = document.querySelector(
      'input[name="criteria"]:checked'
    ).value;
    const criteriaValue = criteriaInputs[selectedCriteria].value;

    if (!criteriaValue) {
        updateStatus(`Por favor, preencha o campo para o critério '${selectedCriteria}'.`, "alert-danger");
        return;
    }

    const args = { from, to };

    switch (selectedCriteria) {
      case "extension":
        args.extension = criteriaValue.split(",").map((ext) => ext.trim());
        break;
      case "pattern":
        args.pattern = criteriaValue;
        break;
      case "creationDate":
        args.creationDate = new Date(criteriaValue).toLocaleDateString('pt-BR');
        break;
      case "modificationDate":
        args.modificationDate = new Date(criteriaValue).toLocaleDateString('pt-BR');
        break;
    }

    updateStatus("Iniciando organização...", "alert-info");
    const result = await window.electronAPI.organizarAutomaticamente(args);
    updateStatus(result.message, result.success ? "alert-success" : "alert-danger");
  });

  // Reverter movimentação
  revertBtn.addEventListener("click", async () => {
    updateStatus("Revertendo a última operação...", "alert-info");
    const result = await window.electronAPI.reverterMovimentacao({});
    updateStatus(result.message, result.success ? "alert-success" : "alert-danger");
  });

  // Função para atualizar a mensagem de status
  const updateStatus = (message, alertClass) => {
    statusMessage.textContent = message;
    statusMessage.className = `alert ${alertClass} mt-3`;
  };

  // Inicializa o estado dos inputs
  toggleCriteriaInputs();
});