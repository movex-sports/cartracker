(function () {
    "use strict";

    var isVehiclePage = /meus-veiculos\.html$/i.test(window.location.pathname);
    var isRenterPage = /meus-locatarios\.html$/i.test(window.location.pathname);
    if (!isVehiclePage && !isRenterPage) return;

    var modalElement = document.createElement("div");
    modalElement.className = "modal fade";
    modalElement.id = "movexDetailModal";
    modalElement.tabIndex = -1;
    modalElement.setAttribute("aria-hidden", "true");
    modalElement.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header border-0 px-4 px-lg-5 pt-4 pb-2">
                    <div><span class="badge bg-primary-subtle text-primary mb-2" id="movex-detail-type"></span><h3 class="modal-title mb-1" id="movex-detail-title"></h3><p class="text-muted mb-0" id="movex-detail-subtitle"></p></div>
                    <button type="button" class="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fechar"></button>
                </div>
                <div class="modal-body px-4 px-lg-5 pb-4">
                    <div class="movex-detail-grid" id="movex-detail-grid"></div>
                    <section class="movex-attachment-section">
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-3"><div><h5 class="mb-1" id="movex-attachment-title"></h5><p class="text-muted mb-0" id="movex-attachment-copy"></p></div><span class="badge bg-warning-subtle text-warning">Integração pendente</span></div>
                        <label class="movex-dropzone mb-0" for="movex-attachment-input"><span><i id="movex-upload-icon"></i><strong class="d-block" id="movex-upload-title"></strong><small class="text-muted" id="movex-upload-help"></small></span></label>
                        <input class="d-none" id="movex-attachment-input" type="file">
                        <div id="movex-attachment-preview"></div>
                        <div class="movex-integration-note"><i class="ri-information-line fs-5"></i><span>O arquivo pode ser selecionado e visualizado agora. O envio definitivo será habilitado quando as rotas de anexos estiverem disponíveis na API.</span></div>
                    </section>
                </div>
                <div class="modal-footer border-0 px-4 px-lg-5 pb-4 pt-0"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Fechar</button><button type="button" class="btn btn-primary" disabled title="Aguardando integração com a API"><i class="ri-upload-cloud-2-line me-1"></i>Salvar anexos</button></div>
            </div>
        </div>`;
    document.body.appendChild(modalElement);
    var detailModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    var input = document.getElementById("movex-attachment-input");
    var preview = document.getElementById("movex-attachment-preview");
    var objectUrls = [];

    function clearPreviews() {
        objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        objectUrls = [];
        preview.innerHTML = "";
        input.value = "";
    }

    function cellText(cells, index) { return cells[index] ? cells[index].textContent.trim().replace(/\s+/g, " ") : "—"; }
    function field(label, value) { return '<div class="movex-detail-field"><span>' + label + '</span><strong>' + escapeHtml(value || "—") + '</strong></div>'; }
    function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (c) { return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]; }); }

    function openDetails(row) {
        var cells = row.querySelectorAll("td");
        if (!cells.length) return;
        clearPreviews();
        document.getElementById("movex-detail-type").textContent = isVehiclePage ? "VEÍCULO" : "LOCATÁRIO";
        document.getElementById("movex-detail-title").textContent = cellText(cells, 0);
        document.getElementById("movex-detail-subtitle").textContent = isVehiclePage ? "Placa " + cellText(cells, 1) : "CPF " + cellText(cells, 1);

        if (isVehiclePage) {
            document.getElementById("movex-detail-grid").innerHTML = field("Placa", cellText(cells, 1)) + field("Ano", cellText(cells, 2)) + field("Combustível", cellText(cells, 3)) + field("Capacidade do tanque", cellText(cells, 4)) + field("Consumo", cellText(cells, 5)) + field("Velocidade máxima", cellText(cells, 6)) + field("Odômetro", cellText(cells, 7));
            document.getElementById("movex-attachment-title").textContent = "Fotos do veículo";
            document.getElementById("movex-attachment-copy").textContent = "Adicione fotos externas, internas e de identificação.";
            document.getElementById("movex-upload-icon").className = "ri-image-add-line";
            document.getElementById("movex-upload-title").textContent = "Selecionar fotos";
            document.getElementById("movex-upload-help").textContent = "PNG, JPG ou WEBP — múltiplos arquivos";
            input.accept = "image/png,image/jpeg,image/webp";
            input.multiple = true;
        } else {
            document.getElementById("movex-detail-grid").innerHTML = field("CPF", cellText(cells, 1)) + field("Veículo", cellText(cells, 2)) + field("Endereço", cellText(cells, 3)) + field("Cidade/UF", cellText(cells, 4)) + field("CEP", cellText(cells, 5)) + field("Status", cellText(cells, 6));
            document.getElementById("movex-attachment-title").textContent = "Habilitação do locatário";
            document.getElementById("movex-attachment-copy").textContent = "Anexe a CNH digitalizada para consulta administrativa.";
            document.getElementById("movex-upload-icon").className = "ri-file-pdf-2-line";
            document.getElementById("movex-upload-title").textContent = "Selecionar habilitação em PDF";
            document.getElementById("movex-upload-help").textContent = "Somente arquivo PDF";
            input.accept = "application/pdf";
            input.multiple = false;
        }
        detailModal.show();
    }

    var detailsTable = document.getElementById("students-table");
    var detailsBody = detailsTable && detailsTable.querySelector("tbody");

    function prepareRows() {
        detailsBody?.querySelectorAll("tr").forEach(function (row) {
            if (!row.querySelector("td") || row.querySelector("td[colspan]")) return;
            row.classList.add("movex-detail-row");
            row.tabIndex = 0;
            row.setAttribute("aria-label", "Abrir detalhes");
        });
    }

    detailsTable?.addEventListener("click", function (event) {
        if (event.target.closest("button, a, input, select, label")) return;
        var row = event.target.closest("tbody tr");
        if (row) openDetails(row);
    });

    detailsTable?.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        var row = event.target.closest("tbody tr.movex-detail-row");
        if (!row) return;
        event.preventDefault();
        openDetails(row);
    });

    if (detailsBody) new MutationObserver(prepareRows).observe(detailsBody, { childList: true });
    prepareRows();

    input.addEventListener("change", function () {
        var files = Array.from(input.files || []);
        objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        objectUrls = [];
        preview.innerHTML = "";
        if (!files.length) return;
        if (isVehiclePage) {
            preview.className = "movex-photo-preview";
            files.forEach(function (file) {
                var url = URL.createObjectURL(file); objectUrls.push(url);
                var item = document.createElement("div"); item.className = "movex-photo-item";
                item.innerHTML = '<img alt="Prévia da foto"><button type="button" aria-label="Remover foto"><i class="ri-close-line"></i></button>';
                item.querySelector("img").src = url;
                item.querySelector("button").addEventListener("click", function () { URL.revokeObjectURL(url); item.remove(); });
                preview.appendChild(item);
            });
        } else {
            var file = files[0];
            var pdfUrl = URL.createObjectURL(file);
            objectUrls.push(pdfUrl);
            preview.className = "movex-pdf-preview";
            preview.innerHTML = '<i class="ri-file-pdf-2-fill"></i><div class="flex-grow-1 overflow-hidden"><strong class="d-block text-truncate">' + escapeHtml(file.name) + '</strong><span class="text-muted fs-12">' + (file.size / 1024 / 1024).toFixed(2).replace(".", ",") + ' MB · pronto para integração</span></div><a class="btn btn-sm btn-soft-primary" href="' + pdfUrl + '" target="_blank" rel="noopener"><i class="ri-eye-line me-1"></i>Visualizar PDF</a>';
        }
    });

    modalElement.addEventListener("hidden.bs.modal", clearPreviews);
})();
