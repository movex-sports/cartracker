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
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-3"><div><h5 class="mb-1" id="movex-attachment-title"></h5><p class="text-muted mb-0" id="movex-attachment-copy"></p></div><span class="badge" id="movex-integration-badge"></span></div>
                        <div class="alert d-none" id="movex-attachment-alert" role="alert"></div>
                        <label class="movex-dropzone mb-0" for="movex-attachment-input"><span><i id="movex-upload-icon"></i><strong class="d-block" id="movex-upload-title"></strong><small class="text-muted" id="movex-upload-help"></small></span></label>
                        <input class="d-none" id="movex-attachment-input" type="file">
                        <div class="form-check form-switch mt-3 d-none" id="movex-thumb-option"><input class="form-check-input" type="checkbox" id="movex-photo-thumb"><label class="form-check-label" for="movex-photo-thumb">Definir a primeira foto enviada como principal</label></div>
                        <div id="movex-attachment-preview"></div>
                        <div class="movex-integration-note" id="movex-integration-note"><i class="ri-information-line fs-5"></i><span></span></div>
                    </section>
                </div>
                <div class="modal-footer border-0 px-4 px-lg-5 pb-4 pt-0"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Fechar</button><button type="button" class="btn btn-primary" id="movex-save-attachments" disabled><i class="ri-upload-cloud-2-line me-1"></i>Enviar fotos</button></div>
            </div>
        </div>`;
    document.body.appendChild(modalElement);
    var detailModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    var input = document.getElementById("movex-attachment-input");
    var preview = document.getElementById("movex-attachment-preview");
    var objectUrls = [];
    var selectedPhotos = [];
    var existingPhotos = [];
    var currentVehicleId = null;
    var photoRefreshTimer = null;
    var apiBaseUrl = "https://cartracker-api.onrender.com";
    var saveButton = document.getElementById("movex-save-attachments");
    var attachmentAlert = document.getElementById("movex-attachment-alert");

    function clearPreviews() {
        objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        objectUrls = [];
        selectedPhotos = [];
        preview.innerHTML = "";
        input.value = "";
    }

    function cellText(cells, index) { return cells[index] ? cells[index].textContent.trim().replace(/\s+/g, " ") : "—"; }
    function field(label, value) { return '<div class="movex-detail-field"><span>' + label + '</span><strong>' + escapeHtml(value || "—") + '</strong></div>'; }
    function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (c) { return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]; }); }

    function getToken() { return sessionStorage.getItem("movex_access_token") || sessionStorage.getItem("access_token") || ""; }
    function apiMessage(data, fallback) {
        if (typeof data?.detail === "string") return data.detail;
        if (Array.isArray(data?.detail)) return data.detail.map(function (item) { return item.msg; }).filter(Boolean).join(" ");
        return fallback;
    }
    function showAttachmentAlert(message, error) {
        attachmentAlert.textContent = message;
        attachmentAlert.className = "alert " + (error ? "alert-danger" : "alert-success");
    }
    async function apiRequest(url, options) {
        var requestOptions = options || {};
        requestOptions.headers = Object.assign({}, requestOptions.headers, { "Authorization": "Bearer " + getToken(), "Accept": "application/json" });
        var response = await fetch(url, requestOptions);
        if (response.status === 401) {
            ["movex_access_token", "access_token", "movex_token_type", "movex_token_expires_at", "movex_user"].forEach(function (key) { sessionStorage.removeItem(key); localStorage.removeItem(key); });
            window.location.replace("signin.html");
        }
        return response;
    }

    async function loadVehiclePhotos() {
        if (!currentVehicleId) return;
        preview.className = "movex-photo-preview";
        preview.innerHTML = '<div class="text-center text-muted py-4 grid-column-full"><span class="spinner-border spinner-border-sm me-2"></span>Carregando fotos...</div>';
        try {
            var response = await apiRequest(apiBaseUrl + "/veiculos/" + encodeURIComponent(currentVehicleId) + "/fotos", { method: "GET", cache: "no-store" });
            var data = await response.json().catch(function () { return []; });
            if (!response.ok) throw new Error(apiMessage(data, "Não foi possível carregar as fotos."));
            existingPhotos = Array.isArray(data) ? data : [];
            updateTableThumbnail(existingPhotos.find(function (photo) { return photo.thumb; })?.foto_url || "");
            renderPhotoPreviews();
            window.clearTimeout(photoRefreshTimer);
            photoRefreshTimer = window.setTimeout(loadVehiclePhotos, 14 * 60 * 1000);
        } catch (error) {
            existingPhotos = [];
            preview.innerHTML = '<div class="alert alert-danger grid-column-full mb-0">' + escapeHtml(error.message) + '</div>';
        }
    }

    function updateTableThumbnail(url) {
        var row = detailsBody?.querySelector('tr[data-vehicle-id="' + CSS.escape(String(currentVehicleId)) + '"]');
        var holder = row?.querySelector(".movex-vehicle-thumb");
        if (!holder) return;
        holder.replaceChildren();
        if (url) {
            var image = document.createElement("img");
            image.src = url;
            image.alt = "Foto principal do veículo";
            image.addEventListener("error", function () { holder.innerHTML = '<i class="ri-car-line"></i>'; }, { once: true });
            holder.appendChild(image);
        } else {
            holder.innerHTML = '<i class="ri-car-line"></i>';
        }
    }

    function openDetails(row) {
        var cells = row.querySelectorAll("td");
        if (!cells.length) return;
        clearPreviews();
        attachmentAlert.className = "alert d-none";
        document.getElementById("movex-detail-type").textContent = isVehiclePage ? "VEÍCULO" : "LOCATÁRIO";
        document.getElementById("movex-detail-title").textContent = cellText(cells, 0);
        document.getElementById("movex-detail-subtitle").textContent = isVehiclePage ? "Placa " + cellText(cells, 1) : "CPF " + cellText(cells, 1);

        if (isVehiclePage) {
            currentVehicleId = row.dataset.vehicleId || null;
            document.getElementById("movex-detail-grid").innerHTML = field("Placa", cellText(cells, 1)) + field("Ano", cellText(cells, 2)) + field("Combustível", cellText(cells, 3)) + field("Capacidade do tanque", cellText(cells, 4)) + field("Consumo", cellText(cells, 5)) + field("Velocidade máxima", cellText(cells, 6)) + field("Odômetro", cellText(cells, 7));
            document.getElementById("movex-attachment-title").textContent = "Fotos do veículo";
            document.getElementById("movex-attachment-copy").textContent = "Adicione fotos externas, internas e de identificação.";
            document.getElementById("movex-upload-icon").className = "ri-image-add-line";
            document.getElementById("movex-upload-title").textContent = "Selecionar fotos";
            document.getElementById("movex-upload-help").textContent = "PNG, JPG ou WEBP — selecione várias ou adicione em etapas";
            input.accept = "image/png,image/jpeg,image/webp";
            input.multiple = true;
            document.getElementById("movex-integration-badge").className = "badge bg-success-subtle text-success";
            document.getElementById("movex-integration-badge").textContent = "API conectada";
            document.getElementById("movex-thumb-option").classList.remove("d-none");
            document.querySelector("#movex-integration-note span").textContent = "Até 5 fotos por veículo, com no máximo 5 MB cada. As imagens são convertidas automaticamente para WebP.";
            saveButton.innerHTML = '<i class="ri-upload-cloud-2-line me-1"></i>Enviar fotos';
            saveButton.title = "";
        } else {
            currentVehicleId = null;
            document.getElementById("movex-detail-grid").innerHTML = field("CPF", cellText(cells, 1)) + field("Veículo", cellText(cells, 2)) + field("Endereço", cellText(cells, 3)) + field("Cidade/UF", cellText(cells, 4)) + field("CEP", cellText(cells, 5)) + field("Status", cellText(cells, 6));
            document.getElementById("movex-attachment-title").textContent = "Habilitação do locatário";
            document.getElementById("movex-attachment-copy").textContent = "Anexe a CNH digitalizada para consulta administrativa.";
            document.getElementById("movex-upload-icon").className = "ri-file-pdf-2-line";
            document.getElementById("movex-upload-title").textContent = "Selecionar habilitação em PDF";
            document.getElementById("movex-upload-help").textContent = "Somente arquivo PDF";
            input.accept = "application/pdf";
            input.multiple = false;
            document.getElementById("movex-integration-badge").className = "badge bg-warning-subtle text-warning";
            document.getElementById("movex-integration-badge").textContent = "Integração pendente";
            document.getElementById("movex-thumb-option").classList.add("d-none");
            document.querySelector("#movex-integration-note span").textContent = "O PDF pode ser selecionado e visualizado agora. O envio definitivo será habilitado quando a rota estiver disponível na API.";
            saveButton.innerHTML = '<i class="ri-upload-cloud-2-line me-1"></i>Salvar habilitação';
            saveButton.disabled = true;
            saveButton.title = "Aguardando integração com a API";
        }
        detailModal.show();
        if (isVehiclePage) loadVehiclePhotos();
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

    function renderPhotoPreviews() {
        objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        objectUrls = [];
        var total = existingPhotos.length + selectedPhotos.length;
        preview.innerHTML = '<div class="d-flex align-items-center justify-content-between grid-column-full"><strong>' + total + (total === 1 ? ' foto' : ' fotos') + ' de 5</strong><small class="text-muted">' + (selectedPhotos.length ? selectedPhotos.length + ' aguardando envio' : 'Clique acima para adicionar mais') + '</small></div>';
        existingPhotos.forEach(function (photo) {
            var item = document.createElement("div");
            item.className = "movex-photo-item";
            item.innerHTML = '<img alt="Foto do veículo"><div class="movex-photo-actions"><button type="button" class="btn btn-sm btn-light movex-thumb-photo" title="Definir como principal"><i class="ri-star-line"></i></button><button type="button" class="btn btn-sm btn-danger movex-delete-photo" title="Excluir foto"><i class="ri-delete-bin-line"></i></button></div>' + (photo.thumb ? '<span class="movex-photo-thumb-badge"><i class="ri-star-fill me-1"></i>Principal</span>' : '');
            item.querySelector("img").src = photo.foto_url;
            var thumbButton = item.querySelector(".movex-thumb-photo");
            if (photo.thumb) thumbButton.remove();
            else thumbButton.addEventListener("click", function () { setThumbnail(photo.foto_id); });
            item.querySelector(".movex-delete-photo").addEventListener("click", function () { deletePhoto(photo.foto_id, this); });
            preview.appendChild(item);
        });
        selectedPhotos.forEach(function (file, index) {
            var url = URL.createObjectURL(file);
            objectUrls.push(url);
            var item = document.createElement("div");
            item.className = "movex-photo-item";
            item.innerHTML = '<img alt="Prévia da foto"><button type="button" aria-label="Remover foto"><i class="ri-close-line"></i></button>';
            item.querySelector("img").src = url;
            item.querySelector("button").addEventListener("click", function () {
                selectedPhotos.splice(index, 1);
                renderPhotoPreviews();
            });
            preview.appendChild(item);
        });
        saveButton.disabled = !selectedPhotos.length;
    }

    async function setThumbnail(photoId) {
        try {
            var response = await apiRequest(apiBaseUrl + "/veiculos/" + encodeURIComponent(currentVehicleId) + "/fotos/" + encodeURIComponent(photoId) + "/thumb", { method: "PATCH" });
            var data = await response.json().catch(function () { return {}; });
            if (!response.ok) throw new Error(apiMessage(data, "Não foi possível definir a foto principal."));
            showAttachmentAlert("Foto principal atualizada.", false);
            await loadVehiclePhotos();
        } catch (error) { showAttachmentAlert(error.message, true); }
    }

    async function deletePhoto(photoId, button) {
        if (button.dataset.confirmDelete !== "true") {
            button.dataset.confirmDelete = "true";
            button.title = "Clique novamente para confirmar";
            button.innerHTML = '<i class="ri-check-line"></i>';
            window.setTimeout(function () {
                if (!button.isConnected) return;
                button.dataset.confirmDelete = "false";
                button.title = "Excluir foto";
                button.innerHTML = '<i class="ri-delete-bin-line"></i>';
            }, 3000);
            return;
        }
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        try {
            var response = await apiRequest(apiBaseUrl + "/veiculos/" + encodeURIComponent(currentVehicleId) + "/fotos/" + encodeURIComponent(photoId), { method: "DELETE" });
            if (!response.ok) {
                var data = await response.json().catch(function () { return {}; });
                throw new Error(apiMessage(data, "Não foi possível excluir a foto."));
            }
            showAttachmentAlert("Foto excluída com sucesso.", false);
            await loadVehiclePhotos();
        } catch (error) { showAttachmentAlert(error.message, true); }
    }

    input.addEventListener("change", function () {
        var files = Array.from(input.files || []);
        if (!files.length) return;
        if (isVehiclePage) {
            preview.className = "movex-photo-preview";
            files.forEach(function (file) {
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                    showAttachmentAlert(file.name + ": formato não permitido.", true);
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    showAttachmentAlert(file.name + ": o arquivo excede 5 MB.", true);
                    return;
                }
                if (existingPhotos.length + selectedPhotos.length >= 5) {
                    showAttachmentAlert("Cada veículo pode ter no máximo 5 fotos.", true);
                    return;
                }
                var alreadySelected = selectedPhotos.some(function (selected) {
                    return selected.name === file.name && selected.size === file.size && selected.lastModified === file.lastModified;
                });
                if (!alreadySelected) selectedPhotos.push(file);
            });
            input.value = "";
            renderPhotoPreviews();
        } else {
            objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
            objectUrls = [];
            preview.innerHTML = "";
            var file = files[0];
            var pdfUrl = URL.createObjectURL(file);
            objectUrls.push(pdfUrl);
            preview.className = "movex-pdf-preview";
            preview.innerHTML = '<i class="ri-file-pdf-2-fill"></i><div class="flex-grow-1 overflow-hidden"><strong class="d-block text-truncate">' + escapeHtml(file.name) + '</strong><span class="text-muted fs-12">' + (file.size / 1024 / 1024).toFixed(2).replace(".", ",") + ' MB · pronto para integração</span></div><a class="btn btn-sm btn-soft-primary" href="' + pdfUrl + '" target="_blank" rel="noopener"><i class="ri-eye-line me-1"></i>Visualizar PDF</a>';
        }
    });

    saveButton.addEventListener("click", async function () {
        if (!isVehiclePage || !currentVehicleId || !selectedPhotos.length) return;
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Enviando...';
        attachmentAlert.className = "alert d-none";
        try {
            var makeThumb = document.getElementById("movex-photo-thumb").checked;
            var uploadQueue = selectedPhotos.slice();
            for (var index = 0; index < uploadQueue.length; index += 1) {
                var formData = new FormData();
                formData.append("file", uploadQueue[index]);
                formData.append("thumb", String(makeThumb && index === 0));
                var response = await apiRequest(apiBaseUrl + "/veiculos/" + encodeURIComponent(currentVehicleId) + "/fotos", { method: "POST", body: formData });
                var data = await response.json().catch(function () { return {}; });
                if (!response.ok) throw new Error(apiMessage(data, "Não foi possível enviar " + uploadQueue[index].name + "."));
                selectedPhotos = selectedPhotos.filter(function (file) { return file !== uploadQueue[index]; });
            }
            document.getElementById("movex-photo-thumb").checked = false;
            showAttachmentAlert("Fotos enviadas com sucesso.", false);
            await loadVehiclePhotos();
        } catch (error) {
            showAttachmentAlert(error.message || "Não foi possível enviar as fotos.", true);
            renderPhotoPreviews();
        } finally {
            saveButton.innerHTML = '<i class="ri-upload-cloud-2-line me-1"></i>Enviar fotos';
            saveButton.disabled = !selectedPhotos.length;
        }
    });

    modalElement.addEventListener("hidden.bs.modal", function () {
        window.clearTimeout(photoRefreshTimer);
        photoRefreshTimer = null;
        clearPreviews();
    });
})();
