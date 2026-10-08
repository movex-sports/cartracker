document.addEventListener("click", function (event) {
            const link = event.target.closest("a[href]");
            if (!link) return;

            const rawHref = link.getAttribute("href") || "";
            if (!rawHref || rawHref.startsWith("#") || /^(https?:|mailto:|tel:|javascript:)/i.test(rawHref)) return;

            const token = localStorage.getItem("movex_access_token")
                || sessionStorage.getItem("movex_access_token")
                || localStorage.getItem("access_token")
                || sessionStorage.getItem("access_token");

            if (!token) return;

            const destination = new URL(rawHref, window.location.href);
            if (!destination.pathname.toLowerCase().endsWith(".html")) return;

            destination.hash = `access_token=${encodeURIComponent(token)}`;
            link.href = destination.href;
        });

document.addEventListener("DOMContentLoaded", function () {
                const primaryColumn = document.getElementById("students-primary-column");
                const statsColumn = document.getElementById("students-stats-column");
                const tableSource = document.getElementById("students-table-source");
                const tableCard = document.getElementById("students-table-card");
                const statsPanel = primaryColumn?.firstElementChild;

                if (primaryColumn && statsColumn && tableCard && statsPanel) {
                    const layoutRow = primaryColumn.parentElement;

                    statsColumn.replaceChildren(statsPanel);
                    primaryColumn.replaceChildren(tableCard);
                    statsColumn.className = "col-12 mb-3";
                    primaryColumn.className = "col-12";
                    statsColumn.style.visibility = "";
                    primaryColumn.style.visibility = "";
                    layoutRow?.insertBefore(statsColumn, primaryColumn);
                    tableCard.classList.remove("h-100");
                    statsPanel.id = "student-category-panel";
                    statsPanel.className = "student-category-panel";
                    statsPanel.innerHTML = `
                        <div class="student-category-heading align-items-center d-flex">
                            <div class="flex-grow-1">
                                <h4 class="card-title mb-1">Veículos por marca</h4>
                                <p class="text-muted mb-0">Distribuição da frota por marca de veículo.</p>
                            </div>
                            <span class="badge bg-primary-subtle text-primary student-category-total" id="student-category-total">0 veículos</span>
                        </div>
                        <div class="student-category-summary" id="student-category-summary"></div>
                    `;
                    tableSource?.remove();
                }

                const studentsTable = document.getElementById("students-table");
                if (!studentsTable) {
                    return;
                }

                studentsTable.querySelector("thead").innerHTML = `
                    <tr>
                        <th scope="col">Veículo</th>
                        <th scope="col">Placa</th>
                        <th scope="col">Ano</th>
                        <th scope="col">Combustível</th>
                        <th scope="col">Tanque</th>
                        <th scope="col">Consumo</th>
                        <th scope="col">Vel. máxima</th>
                        <th scope="col">Odômetro</th>
                    </tr>
                `;

                studentsTable.querySelector("tbody").innerHTML = "";
            });

document.addEventListener("DOMContentLoaded", function () {
                const apiBaseUrl = "https://cartracker-api.onrender.com";
                const studentsEndpoint = `${apiBaseUrl}/veiculos`;
                const createVehicleEndpoint = `${apiBaseUrl}/veiculos`;
                const brandsEndpoint = `${apiBaseUrl}/catalogo/marcas`;
                const updateStudentEndpoint = `${apiBaseUrl}/user-filling/aluno`;
                const removeBackgroundEndpoint = `${apiBaseUrl}/fotos-tratamento/remove-background`;
                const confirmPlayerPhotoEndpoint = `${apiBaseUrl}/fotos-tratamento/confirmar-jogador-upload`;
                const studentsTable = document.getElementById("students-table");
                const studentsTableBody = studentsTable?.querySelector("tbody");
                const studentModalElement = document.getElementById("studentWizardModal");
                const studentPhotoModalElement = document.getElementById("studentPhotoModal");
                const studentPhotoModal = studentPhotoModalElement ? bootstrap.Modal.getOrCreateInstance(studentPhotoModalElement) : null;
                const studentPhotoSubtitle = document.getElementById("student-photo-subtitle");
                const studentPhotoInput = document.getElementById("student-photo-input");
                const studentPhotoProcessButton = document.getElementById("student-photo-process-btn");
                const studentPhotoConfirmButton = document.getElementById("student-photo-confirm-btn");
                const studentPhotoStatus = document.getElementById("student-photo-status");
                const studentPhotoPreviewEmpty = document.getElementById("student-photo-preview-empty");
                const studentPhotoEditor = document.getElementById("student-photo-editor");
                const studentPhotoTemplateImage = document.getElementById("student-photo-template-image");
                const studentPhotoPlayerLayer = document.getElementById("student-photo-player-layer");
                const studentPhotoPlayerImage = document.getElementById("student-photo-player-image");
                const studentPhotoResizeHandle = document.getElementById("student-photo-resize-handle");
                const studentPhotoCenterButton = document.getElementById("student-photo-center-btn");
                const studentPhotoResetButton = document.getElementById("student-photo-reset-btn");
                const studentPhotoEditorHelp = document.getElementById("student-photo-editor-help");
                const studentPhotoSuccessOverlay = document.getElementById("student-photo-success-overlay");
                const studentForm = document.getElementById("student-wizard-form");
                const reviewButton = document.getElementById("student-review-btn");
                const backButton = document.getElementById("student-back-btn");
                const submitButton = document.getElementById("student-submit-btn");
                const submitError = document.getElementById("student-submit-error");
                const dataTab = document.getElementById("student-data-tab");
                const reviewTab = document.getElementById("student-review-tab");
                const successTab = document.getElementById("student-success-tab");
                const progressBar = document.querySelector("#student-progress-bar .progress-bar");
                const vehicleBrandInput = document.getElementById("vehicle-brand-input");
                const vehicleModelInput = document.getElementById("vehicle-model-input");
                const vehicleYearInput = document.getElementById("vehicle-year-input");
                const vehicleColorInput = document.getElementById("vehicle-color-input");
                const vehiclePlateInput = document.getElementById("vehicle-plate-input");
                const vehicleFuelInput = document.getElementById("vehicle-fuel-input");
                const vehicleTankInput = document.getElementById("vehicle-tank-input");
                const vehicleConsumptionInput = document.getElementById("vehicle-consumption-input");
                const vehicleMaxSpeedInput = document.getElementById("vehicle-max-speed-input");
                let brandsLoaded = false;
                const categorySummary = document.getElementById("student-category-summary");
                const categoryTotal = document.getElementById("student-category-total");
                const editStudentButton = document.getElementById("edit-student-btn");
                const editStudentModalElement = document.getElementById("editStudentModal");
                const editStudentModal = editStudentModalElement ? bootstrap.Modal.getOrCreateInstance(editStudentModalElement) : null;
                const editStudentForm = document.getElementById("edit-student-form");
                const editStudentName = document.getElementById("edit-student-name");
                const editStudentPosition = document.getElementById("edit-student-position");
                const editStudentCategory = document.getElementById("edit-student-category");
                const editStudentSubtitle = document.getElementById("edit-student-subtitle");
                const editStudentError = document.getElementById("edit-student-error");
                const editStudentSaveButton = document.getElementById("edit-student-save-btn");
                let currentStudents = [];
                let selectedStudentIndex = null;
                let currentPhotoStudent = null;
                let currentProcessedPlayerPhoto = null;
                let currentPreviewObjectUrls = [];
                let playerTransform = { x: 0.225, y: 0.15, width: 0.55 };
                let playerPointerAction = null;
                let photoSuccessCloseTimer = null;

                if (!studentsTable || !studentsTableBody || !studentForm) {
                    return;
                }

                studentsTable.querySelector("thead").innerHTML = `
                    <tr>
                        <th scope="col">Veículo</th>
                        <th scope="col">Placa</th>
                        <th scope="col">Ano</th>
                        <th scope="col">Combustível</th>
                        <th scope="col">Tanque</th>
                        <th scope="col">Consumo</th>
                        <th scope="col">Vel. máxima</th>
                        <th scope="col">Odômetro</th>
                    </tr>
                `;

                function captureTokenFromUrl() {
                    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
                    const tokenFromUrl = hashParams.get("access_token");

                    if (!tokenFromUrl) {
                        return "";
                    }

                    localStorage.setItem("movex_access_token", tokenFromUrl);
                    localStorage.setItem("movex_token_type", "bearer");
                    localStorage.setItem("access_token", tokenFromUrl);

                    if (window.history?.replaceState) {
                        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
                    }

                    return tokenFromUrl;
                }

                function getAccessToken() {
                    return captureTokenFromUrl()
                        || localStorage.getItem("movex_access_token")
                        || sessionStorage.getItem("movex_access_token")
                        || localStorage.getItem("access_token")
                        || sessionStorage.getItem("access_token")
                        || "";
                }

                function redirectToSignin() {
                    ["movex_access_token", "access_token", "movex_token_type", "movex_token_expires_at", "movex_user"].forEach(function (key) {
                        sessionStorage.removeItem(key);
                        localStorage.removeItem(key);
                    });
                    window.location.replace("signin.html");
                }

                async function fetchWithAuthentication(url, options) {
                    const token = getAccessToken();
                    if (!token) {
                        redirectToSignin();
                        throw new Error("Sessão não encontrada.");
                    }

                    const requestOptions = options || {};
                    requestOptions.headers = Object.assign({}, requestOptions.headers, {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${token}`
                    });
                    const response = await fetch(url, requestOptions);
                    if (response.status === 401) {
                        redirectToSignin();
                        throw new Error("Sessão expirada.");
                    }
                    return response;
                }

                function resetModelSelect(message) {
                    vehicleModelInput.innerHTML = "";
                    vehicleModelInput.append(new Option(message || "Selecione uma marca primeiro", ""));
                    vehicleModelInput.disabled = true;
                }

                function populateYears() {
                    const maximumYear = new Date().getFullYear() + 1;
                    vehicleYearInput.innerHTML = "";
                    vehicleYearInput.append(new Option("Selecione o ano", ""));
                    for (let year = maximumYear; year >= 2005; year -= 1) {
                        vehicleYearInput.append(new Option(String(year), String(year)));
                    }
                }

                async function loadBrands() {
                    if (brandsLoaded) return;
                    vehicleBrandInput.disabled = true;
                    vehicleBrandInput.innerHTML = "";
                    vehicleBrandInput.append(new Option("Carregando marcas...", ""));
                    resetModelSelect();

                    try {
                        const response = await fetchWithAuthentication(brandsEndpoint, { method: "GET" });
                        const brands = await response.json().catch(function () { return []; });
                        if (!response.ok) throw new Error(getApiErrorMessage(response, brands));

                        vehicleBrandInput.innerHTML = "";
                        vehicleBrandInput.append(new Option("Selecione a marca", ""));
                        brands.forEach(function (brand) {
                            vehicleBrandInput.append(new Option(brand.nome, String(brand.marca_id)));
                        });
                        vehicleBrandInput.disabled = false;
                        brandsLoaded = true;
                    } catch (error) {
                        vehicleBrandInput.innerHTML = "";
                        vehicleBrandInput.append(new Option("Não foi possível carregar as marcas", ""));
                        vehicleBrandInput.disabled = false;
                    }
                }

                async function loadModels(brandId) {
                    resetModelSelect(brandId ? "Carregando modelos..." : "Selecione uma marca primeiro");
                    if (!brandId) return;

                    try {
                        const endpoint = `${brandsEndpoint}/${encodeURIComponent(brandId)}/modelos`;
                        const response = await fetchWithAuthentication(endpoint, { method: "GET" });
                        const models = await response.json().catch(function () { return []; });
                        if (!response.ok) throw new Error(getApiErrorMessage(response, models));

                        vehicleModelInput.innerHTML = "";
                        vehicleModelInput.append(new Option("Selecione o modelo", ""));
                        models.forEach(function (model) {
                            vehicleModelInput.append(new Option(model.nome, String(model.modelo_id)));
                        });
                        vehicleModelInput.disabled = false;
                    } catch (error) {
                        vehicleModelInput.innerHTML = "";
                        vehicleModelInput.append(new Option("Não foi possível carregar os modelos", ""));
                        vehicleModelInput.disabled = false;
                    }
                }

                function getSelectedText(select) {
                    return select.selectedIndex > 0 ? select.options[select.selectedIndex].text.trim() : "";
                }

                function escapeHtml(value) {
                    return String(value ?? "").replace(/[&<>"']/g, function (character) {
                        return {
                            "&": "&amp;",
                            "<": "&lt;",
                            ">": "&gt;",
                            '"': "&quot;",
                            "'": "&#039;"
                        }[character];
                    });
                }

                function normalizeVehicles(payload) {
                    const source = Array.isArray(payload)
                        ? payload
                        : payload?.veiculos
                            || payload?.vehicles
                            || payload?.data
                            || payload?.results
                            || payload?.items
                            || payload?.records
                            || [];

                    return Array.isArray(source) ? source.filter(Boolean) : [];
                }

                function normalizeVehicle(vehicle, index) {
                    return {
                        id: vehicle?.veiculo_id ?? vehicle?.id ?? index + 1,
                        brand: vehicle?.marca ?? "",
                        model: vehicle?.modelo ?? "",
                        year: vehicle?.ano ?? "",
                        color: vehicle?.cor ?? "",
                        plate: vehicle?.placa ?? "",
                        fuel: vehicle?.combustivel_tipo ?? "",
                        tank: vehicle?.capacidade_tanque_l ?? "",
                        consumption: vehicle?.consumo_km_l ?? "",
                        maxSpeed: vehicle?.velocidade_maxima_kmh ?? "",
                        odometer: vehicle?.odometro_km ?? 0
                    };
                }

                function formatFuel(value) {
                    const labels = {
                        gasolina: "Gasolina", etanol: "Etanol", flex: "Flex",
                        diesel: "Diesel", eletrico: "Elétrico", hibrido: "Híbrido", gnv: "GNV"
                    };
                    return labels[String(value || "").toLowerCase()] || String(value || "—");
                }

                function formatNumber(value, decimals) {
                    const number = Number(value);
                    if (!Number.isFinite(number)) return "—";
                    return number.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
                }

                function renderCategorySummary(vehicles) {
                    if (!categorySummary || !categoryTotal) return;

                    const normalizedVehicles = vehicles.map(function (vehicle, index) {
                        return Object.prototype.hasOwnProperty.call(vehicle, "brand")
                            ? vehicle
                            : normalizeVehicle(vehicle, index);
                    });
                    const total = normalizedVehicles.length;
                    const counts = new Map();
                    const colors = [
                        "#0ab39c", "#299cdb", "#405189", "#f7b84b",
                        "#f06548", "#3577f1", "#6f42c1"
                    ];

                    normalizedVehicles.forEach(function (vehicle) {
                        const brand = String(vehicle.brand || "Sem marca").trim();
                        counts.set(brand, (counts.get(brand) || 0) + 1);
                    });

                    categoryTotal.textContent = `${total} ${total === 1 ? "veículo" : "veículos"}`;
                    const activeCategories = Array.from(counts.entries()).sort(function (first, second) { return second[1] - first[1]; });

                    if (!activeCategories.length) {
                        categorySummary.innerHTML = `
                            <div class="text-center text-muted py-4 grid-column-full">
                                <i class="ri-pie-chart-line fs-2 d-block mb-2"></i>
                                Nenhum veículo cadastrado.
                            </div>
                        `;
                        return;
                    }

                    categorySummary.innerHTML = activeCategories.map(function (categoryEntry, index) {
                        const categoryName = categoryEntry[0];
                        const count = categoryEntry[1];
                        const percentage = total ? count / total * 100 : 0;
                        const formattedPercentage = Number.isInteger(percentage)
                            ? `${percentage}%`
                            : `${percentage.toFixed(1).replace(".", ",")}%`;
                        const color = colors[index % colors.length];

                        return `
                            <div class="student-category-item">
                                <div class="student-category-card card-animate" style="--category-color:${color};--category-progress:${percentage}%">
                                    <svg class="category-card-shape" viewBox="0 0 200 120" width="200" height="120" aria-hidden="true">
                                        <path fill="currentColor" d="m189.5-25.8c0 0 20.1 46.2-26.7 71.4 0 0-60 15.4-62.3 65.3-2.2 49.8-50.6 59.3-57.8 61.5-7.2 2.3-60.8 0-60.8 0l-11.9-199.4z"></path>
                                    </svg>
                                    <div class="card-body position-relative" style="z-index:1">
                                        <div class="d-flex align-items-center">
                                            <div class="flex-grow-1 overflow-hidden">
                                                <p class="text-uppercase fw-medium text-muted text-truncate mb-3">${escapeHtml(categoryName)}</p>
                                                <h4 class="fs-22 fw-semibold ff-secondary mb-0">
                                                    ${count} <span class="fs-13 fw-normal text-muted">${count === 1 ? "veículo" : "veículos"}</span>
                                                </h4>
                                            </div>
                                            <div class="flex-shrink-0">
                                                <div class="student-category-ring" data-percentage="${formattedPercentage}" aria-label="${formattedPercentage} dos veículos"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join("");
                }

                function renderTableMessage(message, type) {
                    const colorClass = type === "error" ? "text-danger" : "text-muted";
                    studentsTableBody.innerHTML = `
                        <tr>
                            <td colspan="8" class="text-center py-5 ${colorClass}">
                                ${escapeHtml(message)}
                            </td>
                        </tr>
                    `;
                }

                function renderStudents(vehicles) {
                    currentStudents = vehicles.map(normalizeVehicle);
                    selectedStudentIndex = null;
                    if (editStudentButton) editStudentButton.disabled = true;
                    renderCategorySummary(currentStudents);

                    if (!currentStudents.length) {
                        renderTableMessage("Nenhum veículo cadastrado.", "empty");
                        return;
                    }

                    studentsTableBody.innerHTML = currentStudents.map(function (vehicle) {
                        return `
                            <tr data-vehicle-id="${escapeHtml(vehicle.id)}">
                                <td>
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="avatar-xs rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center"><i class="ri-car-line"></i></span>
                                        <div><strong class="d-block">${escapeHtml(vehicle.brand || "—")} ${escapeHtml(vehicle.model || "")}</strong><small class="text-muted">${escapeHtml(vehicle.color || "—")}</small></div>
                                    </div>
                                </td>
                                <td><span class="fw-semibold">${escapeHtml(vehicle.plate || "—")}</span></td>
                                <td>${escapeHtml(vehicle.year || "—")}</td>
                                <td><span class="badge bg-info-subtle text-info">${escapeHtml(formatFuel(vehicle.fuel))}</span></td>
                                <td>${formatNumber(vehicle.tank, 1)} L</td>
                                <td>${formatNumber(vehicle.consumption, 1)} km/L</td>
                                <td>${formatNumber(vehicle.maxSpeed, 0)} km/h</td>
                                <td>${formatNumber(vehicle.odometer, 1)} km</td>
                            </tr>
                        `;
                    }).join("");
                }

                function openEditStudentModal() {
                    const student = currentStudents[selectedStudentIndex];
                    if (!student || !editStudentModal) return;

                    editStudentForm.reset();
                    editStudentForm.classList.remove("was-validated");
                    editStudentError.classList.add("d-none");
                    editStudentError.textContent = "";
                    editStudentName.value = student.name;
                    editStudentPosition.value = student.position;
                    editStudentCategory.value = student.category;
                    editStudentSubtitle.textContent = `Editando ${student.name}${student.lastname ? ` ${student.lastname}` : ""}.`;
                    editStudentModal.show();
                }

                function formatApiMessage(value) {
                    if (!value) return "";
                    if (typeof value === "string") return value;
                    if (Array.isArray(value)) {
                        return value.map(formatApiMessage).filter(Boolean).join(" ");
                    }
                    if (typeof value === "object") {
                        return formatApiMessage(value.msg)
                            || formatApiMessage(value.message)
                            || formatApiMessage(value.detail)
                            || formatApiMessage(value.erro)
                            || formatApiMessage(value.error)
                            || Object.entries(value).map(function (entry) {
                                return `${entry[0]}: ${formatApiMessage(entry[1]) || String(entry[1])}`;
                            }).join(" ");
                    }
                    return String(value);
                }

                function getApiErrorMessage(response, payload) {
                    if (response.status === 401 || response.status === 403) {
                        return "Sua sessao expirou. Faca login novamente para continuar.";
                    }

                    if (response.status === 422) {
                        return formatApiMessage(payload?.detail) || "Revise os dados informados. Um ou mais campos nao foram aceitos.";
                    }

                    return formatApiMessage(payload?.detail)
                        || formatApiMessage(payload?.message)
                        || formatApiMessage(payload?.erro)
                        || formatApiMessage(payload?.error)
                        || "Nao foi possivel concluir a operacao.";
                }
                function setPhotoStatus(message, type) {
                    if (!studentPhotoStatus) return;

                    studentPhotoStatus.className = `alert alert-${type || "info"}`;
                    studentPhotoStatus.textContent = message;
                    studentPhotoStatus.classList.toggle("d-none", !message);
                }

                function clamp(value, minimum, maximum) {
                    return Math.min(Math.max(value, minimum), maximum);
                }

                function renderPlayerTransform() {
                    if (!studentPhotoPlayerLayer || !studentPhotoEditor) return;

                    studentPhotoPlayerLayer.style.left = `${playerTransform.x * 100}%`;
                    studentPhotoPlayerLayer.style.top = `${playerTransform.y * 100}%`;
                    studentPhotoPlayerLayer.style.width = `${playerTransform.width * 100}%`;
                }

                function getPlayerTransformPayload() {
                    const editorWidth = studentPhotoEditor?.clientWidth || 1;
                    const editorHeight = studentPhotoEditor?.clientHeight || 1;

                    return {
                        posicao_x: playerTransform.x,
                        posicao_y: playerTransform.y,
                        largura_jogador: (studentPhotoPlayerLayer?.offsetWidth || 0) / editorWidth,
                        altura_jogador: (studentPhotoPlayerLayer?.offsetHeight || 0) / editorHeight
                    };
                }

                function centerPlayer() {
                    if (!studentPhotoEditor || !studentPhotoPlayerLayer) return;

                    renderPlayerTransform();
                    const playerHeightRatio = studentPhotoPlayerLayer.offsetHeight / (studentPhotoEditor.clientHeight || 1);
                    playerTransform.x = (1 - playerTransform.width) / 2;
                    playerTransform.y = Math.max(0, (1 - playerHeightRatio) / 2);
                    renderPlayerTransform();
                }

                function resetPlayerTransform() {
                    playerTransform = { x: 0.225, y: 0.15, width: 0.55 };
                    centerPlayer();
                }

                function resetPhotoModal() {
                    if (photoSuccessCloseTimer) {
                        clearTimeout(photoSuccessCloseTimer);
                        photoSuccessCloseTimer = null;
                    }
                    currentPhotoStudent = null;
                    currentProcessedPlayerPhoto = null;
                    currentPreviewObjectUrls.forEach(function (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                    });
                    currentPreviewObjectUrls = [];
                    if (studentPhotoInput) studentPhotoInput.value = "";
                    playerTransform = { x: 0.225, y: 0.15, width: 0.55 };
                    playerPointerAction = null;
                    if (studentPhotoSubtitle) studentPhotoSubtitle.textContent = "Selecione uma imagem para gerar a previa.";
                    studentPhotoTemplateImage?.removeAttribute("src");
                    studentPhotoPlayerImage?.removeAttribute("src");
                    studentPhotoEditor?.classList.add("d-none");
                    studentPhotoEditorHelp?.classList.add("d-none");
                    studentPhotoCenterButton?.classList.add("d-none");
                    studentPhotoResetButton?.classList.add("d-none");
                    studentPhotoSuccessOverlay?.classList.add("d-none");
                    studentPhotoPreviewEmpty?.classList.remove("d-none");
                    if (studentPhotoConfirmButton) studentPhotoConfirmButton.disabled = true;
                    if (studentPhotoProcessButton) studentPhotoProcessButton.disabled = false;
                    setPhotoStatus("Carregue uma foto e gere uma prévia do template", "danger");
                }

                function getImageDataUrl(imagePayload) {
                    if (!imagePayload) return "";

                    if (imagePayload instanceof Blob) {
                        const objectUrl = URL.createObjectURL(imagePayload);
                        currentPreviewObjectUrls.push(objectUrl);
                        return objectUrl;
                    }

                    if (typeof imagePayload === "string") {
                        const value = imagePayload.trim();
                        if (!value) return "";
                        if (/^(data:image\/|blob:|https?:\/\/)/i.test(value)) return value;
                        if (value.startsWith("/")) return new URL(value, apiBaseUrl).href;

                        const compactValue = value.replace(/\s/g, "");
                        if (/^[A-Za-z0-9+/]+={0,2}$/.test(compactValue) && compactValue.length > 100) {
                            return `data:image/png;base64,${compactValue}`;
                        }

                        return "";
                    }

                    if (typeof imagePayload === "object") {
                        const directUrl = imagePayload.data_url
                            || imagePayload.dataUrl
                            || imagePayload["data-url"]
                            || imagePayload.url
                            || imagePayload.image_url
                            || imagePayload.imageUrl
                            || imagePayload.imagem_url
                            || imagePayload.imagemUrl
                            || "";

                        if (directUrl) return getImageDataUrl(directUrl);

                        const base64Value = imagePayload.base64
                            || imagePayload.data
                            || imagePayload.imagem
                            || imagePayload.image
                            || "";

                        if (base64Value) {
                            const contentType = imagePayload.content_type
                                || imagePayload.contentType
                                || imagePayload["content-type"]
                                || imagePayload.mime_type
                                || imagePayload.mimeType
                                || imagePayload["mime-type"]
                                || "image/png";
                            const compactValue = String(base64Value).replace(/\s/g, "");
                            return `data:${contentType};base64,${compactValue}`;
                        }
                    }

                    return "";
                }

                function imagePayloadToFile(imagePayload, filename) {
                    const dataUrl = imagePayload?.data_url || "";
                    const base64 = imagePayload?.base64 || String(dataUrl).split(",")[1] || "";
                    const contentType = imagePayload?.content_type
                        || dataUrl.match(/data:(.*?);base64/)?.[1]
                        || "image/png";

                    if (!base64) {
                        throw new Error("A foto do veículo sem fundo veio sem base64.");
                    }

                    const binary = atob(String(base64).replace(/\s/g, ""));
                    const bytes = new Uint8Array(binary.length);
                    for (let index = 0; index < binary.length; index += 1) {
                        bytes[index] = binary.charCodeAt(index);
                    }

                    return new File([bytes], filename, { type: contentType });
                }

                function loadEditorImage(image, source) {
                    return new Promise(function (resolve, reject) {
                        image.onload = function () { resolve(); };
                        image.onerror = function () { reject(new Error("O navegador nao conseguiu carregar uma das imagens do editor.")); };
                        image.src = source;
                    });
                }

                async function showPhotoEditor(templateUrl, playerUrl) {
                    await Promise.all([
                        loadEditorImage(studentPhotoTemplateImage, templateUrl),
                        loadEditorImage(studentPhotoPlayerImage, playerUrl)
                    ]);

                    studentPhotoPreviewEmpty?.classList.add("d-none");
                    studentPhotoEditor?.classList.remove("d-none");
                    studentPhotoEditorHelp?.classList.remove("d-none");
                    studentPhotoCenterButton?.classList.remove("d-none");
                    studentPhotoResetButton?.classList.remove("d-none");
                    resetPlayerTransform();
                }

                function beginPlayerPointerAction(event) {
                    if (!studentPhotoEditor || !studentPhotoPlayerLayer) return;

                    event.preventDefault();
                    studentPhotoPlayerLayer.setPointerCapture(event.pointerId);
                    playerPointerAction = {
                        type: event.target === studentPhotoResizeHandle ? "resize" : "drag",
                        pointerId: event.pointerId,
                        clientX: event.clientX,
                        clientY: event.clientY,
                        transform: { ...playerTransform }
                    };
                }

                function movePlayerPointer(event) {
                    if (!playerPointerAction || playerPointerAction.pointerId !== event.pointerId || !studentPhotoEditor) return;

                    event.preventDefault();
                    const editorRect = studentPhotoEditor.getBoundingClientRect();
                    const deltaX = event.clientX - playerPointerAction.clientX;
                    const deltaY = event.clientY - playerPointerAction.clientY;

                    if (playerPointerAction.type === "resize") {
                        const horizontalChange = deltaX / (editorRect.width || 1);
                        const verticalChange = deltaY / (editorRect.height || 1);
                        const sizeChange = Math.abs(horizontalChange) >= Math.abs(verticalChange)
                            ? horizontalChange
                            : verticalChange;
                        playerTransform.width = clamp(playerPointerAction.transform.width + sizeChange, 0.12, 1.5);
                        renderPlayerTransform();
                    } else {
                        const playerHeightRatio = studentPhotoPlayerLayer.offsetHeight / (editorRect.height || 1);
                        const minimumX = -(playerTransform.width * 0.9);
                        const maximumX = 0.9;
                        const minimumY = -(playerHeightRatio * 0.9);
                        const maximumY = 0.9;
                        playerTransform.x = clamp(playerPointerAction.transform.x + (deltaX / (editorRect.width || 1)), minimumX, maximumX);
                        playerTransform.y = clamp(playerPointerAction.transform.y + (deltaY / (editorRect.height || 1)), minimumY, maximumY);
                    }

                    renderPlayerTransform();
                }

                function endPlayerPointerAction(event) {
                    if (!playerPointerAction || playerPointerAction.pointerId !== event.pointerId) return;

                    if (studentPhotoPlayerLayer?.hasPointerCapture(event.pointerId)) {
                        studentPhotoPlayerLayer.releasePointerCapture(event.pointerId);
                    }
                    playerPointerAction = null;
                }

                async function readPhotoProcessResponse(response) {
                    const contentType = response.headers.get("content-type") || "";

                    if (contentType.startsWith("image/")) {
                        await response.blob();
                        return {
                            contentType,
                            payload: {},
                            template: null,
                            playerPhoto: null
                        };
                    }

                    const responseText = await response.text();
                    if (!responseText.trim()) {
                        return {
                            contentType,
                            payload: {},
                            template: null,
                            playerPhoto: null,
                            empty: true
                        };
                    }

                    const payload = JSON.parse(responseText);
                    return {
                        contentType,
                        payload,
                        template: payload.template || payload.template_limpo || payload.preview_template || null,
                        playerPhoto: payload.jogador_sem_fundo || null
                    };
                }

                function openStudentPhotoModal(studentIndex) {
                    const student = currentStudents[Number(studentIndex)];
                    if (!student || !studentPhotoModal) return;

                    resetPhotoModal();
                    currentPhotoStudent = student;

                    if (studentPhotoSubtitle) studentPhotoSubtitle.textContent = "Selecione uma imagem para gerar a previa.";

                    studentPhotoModal.show();
                }

                async function processStudentPhoto() {
                    const token = getAccessToken();
                    const file = studentPhotoInput?.files?.[0];

                    if (!token) {
                        setPhotoStatus("Sua sessao expirou. Faca login novamente.", "danger");
                        return;
                    }

                    if (!currentPhotoStudent?.userId) {
                        setPhotoStatus("Não foi possível identificar o veículo selecionado.", "danger");
                        return;
                    }

                    if (!file) {
                        setPhotoStatus("Selecione uma foto antes de enviar.", "warning");
                        return;
                    }

                    const formData = new FormData();
                    formData.append("file", file);

                    studentPhotoProcessButton.disabled = true;
                    studentPhotoConfirmButton.disabled = true;
                    setPhotoStatus("Removendo o fundo e carregando o editor...", "info");

                    try {
                        const response = await fetch(removeBackgroundEndpoint, {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: formData
                        });
                        const result = await readPhotoProcessResponse(response);
                        const payload = result.payload || {};

                        if (!response.ok) {
                            throw new Error(getApiErrorMessage(response, payload));
                        }

                        if (result.empty) {
                            throw new Error("A API respondeu 200 OK, mas nao retornou imagem nem JSON.");
                        }

                        const templatePayload = result.template;
                        const playerPhotoPayload = result.playerPhoto;
                        const templateUrl = getImageDataUrl(templatePayload);
                        const playerPhotoUrl = getImageDataUrl(playerPhotoPayload);

                        if (!templateUrl) {
                            throw new Error("A API nao retornou o template.");
                        }

                        if (!playerPhotoUrl) {
                            throw new Error("A API não retornou a foto do veículo sem fundo.");
                        }

                        currentProcessedPlayerPhoto = playerPhotoPayload;
                        await showPhotoEditor(templateUrl, playerPhotoUrl);
                        studentPhotoConfirmButton.disabled = false;
                        setPhotoStatus("Arraste e redimensione o veículo. Depois, clique em Gostei.", "success");
                    } catch (error) {
                        setPhotoStatus(error.message || "Nao foi possivel processar a foto.", "danger");
                    } finally {
                        studentPhotoProcessButton.disabled = false;
                    }
                }

                async function confirmStudentPhoto() {
                    const token = getAccessToken();

                    if (!token) {
                        setPhotoStatus("Sua sessao expirou. Faca login novamente.", "danger");
                        return;
                    }

                    if (!currentPhotoStudent?.userId || !currentProcessedPlayerPhoto) {
                        setPhotoStatus("Processe e ajuste a foto antes de confirmar.", "warning");
                        return;
                    }

                    studentPhotoConfirmButton.disabled = true;
                    setPhotoStatus("Enviando foto e ajustes...", "info");

                    try {
                        const transform = getPlayerTransformPayload();
                        const formData = new FormData();
                        formData.append(
                            "file",
                            imagePayloadToFile(currentProcessedPlayerPhoto, `jogador-${currentPhotoStudent.userId}.png`)
                        );
                        formData.append("user_id", String(currentPhotoStudent.userId));
                        formData.append("posicao_x", String(transform.posicao_x));
                        formData.append("posicao_y", String(transform.posicao_y));
                        formData.append("largura_jogador", String(transform.largura_jogador));
                        formData.append("altura_jogador", String(transform.altura_jogador));

                        const response = await fetch(confirmPlayerPhotoEndpoint, {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: formData
                        });
                        const payload = await response.json().catch(function () { return {}; });

                        if (!response.ok) {
                            throw new Error(getApiErrorMessage(response, payload));
                        }

                        setPhotoStatus("Foto e ajustes enviados com sucesso.", "success");
                        studentPhotoSuccessOverlay?.classList.remove("d-none");
                        photoSuccessCloseTimer = setTimeout(function () {
                            studentPhotoModal?.hide();
                        }, 1800);
                    } catch (error) {
                        studentPhotoConfirmButton.disabled = false;
                        setPhotoStatus(error.message || "Nao foi possivel enviar a foto e os ajustes.", "danger");
                    }
                }

                async function loadStudents() {
                    const token = getAccessToken();

                    if (!token) {
                        renderTableMessage("Faça login novamente para listar os veículos.", "error");
                        return;
                    }

                    renderTableMessage("Carregando veículos...", "empty");

                    try {
                        const response = await fetchWithAuthentication(studentsEndpoint, { method: "GET" });
                        const payload = await response.json().catch(function () {
                            return {};
                        });

                        if (!response.ok) {
                            throw new Error(getApiErrorMessage(response, payload));
                        }

                        renderStudents(normalizeVehicles(payload));
                    } catch (error) {
                        renderTableMessage(error.message || "Não foi possível carregar os veículos.", "error");
                    }
                }

                function updateProgress(step) {
                    const width = step === 1 ? 0 : step === 2 ? 50 : 100;
                    progressBar.style.width = `${width}%`;
                    progressBar.setAttribute("aria-valuenow", String(width));

                    [dataTab, reviewTab, successTab].forEach(function (tab, index) {
                        tab.classList.toggle("done", index + 1 < step);
                    });
                }

                function showWizardStep(tabElement, step) {
                    tabElement.disabled = false;
                    bootstrap.Tab.getOrCreateInstance(tabElement).show();
                    updateProgress(step);
                }

                function getVehiclePayload() {
                    return {
                        marca: getSelectedText(vehicleBrandInput),
                        modelo: getSelectedText(vehicleModelInput),
                        ano: Number(vehicleYearInput.value),
                        cor: vehicleColorInput.value.trim(),
                        placa: vehiclePlateInput.value.trim().toUpperCase(),
                        combustivel_tipo: vehicleFuelInput.value,
                        capacidade_tanque_l: Number(vehicleTankInput.value),
                        consumo_km_l: Number(vehicleConsumptionInput.value),
                        velocidade_maxima_kmh: Number(vehicleMaxSpeedInput.value)
                    };
                }

                function fillReview(payload) {
                    document.getElementById("vehicle-review-brand").textContent = payload.marca;
                    document.getElementById("vehicle-review-model").textContent = payload.modelo;
                    document.getElementById("vehicle-review-year").textContent = payload.ano;
                    document.getElementById("vehicle-review-color").textContent = payload.cor;
                    document.getElementById("vehicle-review-plate").textContent = payload.placa;
                    document.getElementById("vehicle-review-fuel").textContent = payload.combustivel_tipo;
                    document.getElementById("vehicle-review-tank").textContent = `${payload.capacidade_tanque_l} L`;
                    document.getElementById("vehicle-review-consumption").textContent = `${payload.consumo_km_l} km/L`;
                    document.getElementById("vehicle-review-max-speed").textContent = `${payload.velocidade_maxima_kmh} km/h`;
                }

                function resetWizard() {
                    studentForm.reset();
                    resetModelSelect();
                    studentForm.classList.remove("was-validated");
                    reviewTab.disabled = true;
                    successTab.disabled = true;
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="ri-car-line label-icon align-middle fs-16 ms-2"></i>Registrar veículo';
                    submitError.classList.add("d-none");
                    submitError.textContent = "";
                    showWizardStep(dataTab, 1);
                }

                reviewButton.addEventListener("click", function () {
                    studentForm.classList.add("was-validated");

                    if (!studentForm.checkValidity()) {
                        return;
                    }

                    fillReview(getVehiclePayload());
                    studentForm.classList.remove("was-validated");
                    showWizardStep(reviewTab, 2);
                });

                backButton.addEventListener("click", function () {
                    showWizardStep(dataTab, 1);
                });

                vehicleBrandInput.addEventListener("change", function () {
                    loadModels(vehicleBrandInput.value);
                });

                studentForm.addEventListener("submit", async function (event) {
                    event.preventDefault();

                    const token = getAccessToken();
                    if (!token) {
                        submitError.textContent = "Sua sessão não foi encontrada. Faça login novamente.";
                        submitError.classList.remove("d-none");
                        return;
                    }

                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando...';
                    submitError.classList.add("d-none");

                    try {
                        const response = await fetchWithAuthentication(createVehicleEndpoint, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(getVehiclePayload())
                        });
                        const payload = await response.json().catch(function () {
                            return {};
                        });

                        if (!response.ok) {
                            throw new Error(getApiErrorMessage(response, payload));
                        }

                        await loadStudents();
                        showWizardStep(successTab, 3);
                    } catch (error) {
                        submitError.textContent = error.message || "Não foi possível cadastrar o veículo.";
                        submitError.classList.remove("d-none");
                    } finally {
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="ri-car-line label-icon align-middle fs-16 ms-2"></i>Registrar veículo';
                    }
                });

                editStudentButton?.addEventListener("click", openEditStudentModal);

                editStudentForm?.addEventListener("submit", async function (event) {
                    event.preventDefault();
                    editStudentForm.classList.add("was-validated");

                    if (!editStudentForm.checkValidity()) return;

                    const student = currentStudents[selectedStudentIndex];
                    const token = getAccessToken();
                    if (!student || !token) {
                        editStudentError.textContent = !student
                            ? "Selecione um veículo novamente."
                            : "Sua sessão não foi encontrada. Faça login novamente.";
                        editStudentError.classList.remove("d-none");
                        return;
                    }

                    editStudentSaveButton.disabled = true;
                    editStudentSaveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando...';
                    editStudentError.classList.add("d-none");

                    try {
                        const response = await fetch(`${updateStudentEndpoint}/${encodeURIComponent(student.userId)}`, {
                            method: "PATCH",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                nome: editStudentName.value.trim(),
                                categoria: editStudentCategory.value,
                                posicao: editStudentPosition.value.trim()
                            })
                        });
                        const payload = await response.json().catch(function () { return {}; });

                        if (!response.ok) {
                            throw new Error(getApiErrorMessage(response, payload));
                        }

                        editStudentModal.hide();
                        await loadStudents();
                    } catch (error) {
                        editStudentError.textContent = error.message || "Não foi possível atualizar o veículo.";
                        editStudentError.classList.remove("d-none");
                    } finally {
                        editStudentSaveButton.disabled = false;
                        editStudentSaveButton.innerHTML = '<i class="ri-save-line me-1"></i>Salvar modificações';
                    }
                });

                studentsTableBody.addEventListener("click", function (event) {
                    const selector = event.target.closest(".student-selector");
                    if (selector) {
                        selectedStudentIndex = Number(selector.value);
                        if (editStudentButton) editStudentButton.disabled = false;
                        return;
                    }

                    const trigger = event.target.closest(".student-photo-trigger");
                    if (!trigger) return;
                    openStudentPhotoModal(trigger.dataset.studentIndex);
                });

                studentPhotoProcessButton?.addEventListener("click", processStudentPhoto);
                studentPhotoConfirmButton?.addEventListener("click", confirmStudentPhoto);
                studentPhotoCenterButton?.addEventListener("click", centerPlayer);
                studentPhotoResetButton?.addEventListener("click", resetPlayerTransform);
                studentPhotoPlayerLayer?.addEventListener("pointerdown", beginPlayerPointerAction);
                studentPhotoPlayerLayer?.addEventListener("pointermove", movePlayerPointer);
                studentPhotoPlayerLayer?.addEventListener("pointerup", endPlayerPointerAction);
                studentPhotoPlayerLayer?.addEventListener("pointercancel", endPlayerPointerAction);
                studentPhotoModalElement?.addEventListener("hidden.bs.modal", resetPhotoModal);
                studentModalElement.addEventListener("hidden.bs.modal", resetWizard);
                studentModalElement.addEventListener("show.bs.modal", loadBrands);
                populateYears();
                renderCategorySummary([]);
                Promise.resolve(window.movexSessionReady).then(function (sessionIsReady) {
                    if (sessionIsReady !== false) loadStudents();
                });
            });

