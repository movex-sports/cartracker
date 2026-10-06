(function () {
            const API_BASE_URL = "https://uwbv2-1.onrender.com";
            const params = new URLSearchParams(window.location.search);
            const reportNumber = params.get("relatorio_number")?.trim() || "";
            const reportId = params.get("relatorio_id")?.trim() || reportNumber;
            const uploadReportNumber = reportNumber || reportId;
            const reportName = params.get("nome")?.trim() || "Relatório";
            const reportDate = params.get("data")?.trim() || "—";
            const reportStart = params.get("inicio")?.trim() || "—";
            const reportEnd = params.get("fim")?.trim() || "—";

            const nameElement = document.getElementById("report-detail-name");
            const breadcrumbElement = document.getElementById("report-detail-breadcrumb");
            const dateElement = document.getElementById("report-detail-date");
            const startElement = document.getElementById("report-detail-start");
            const endElement = document.getElementById("report-detail-end");

            if (nameElement) nameElement.textContent = reportName;
            if (breadcrumbElement) breadcrumbElement.textContent = reportName;
            if (dateElement) dateElement.textContent = reportDate;
            if (startElement) startElement.textContent = reportStart;
            if (endElement) endElement.textContent = reportEnd;

            document.title = `${reportName} | MOVEX-PERFORMANCE`;

            const loadReportTxtButton = document.getElementById("load-report-txt-button");
            const loadReportTxtInput = document.getElementById("load-report-txt-input");

            loadReportTxtButton?.addEventListener("click", function () {
                loadReportTxtInput?.click();
            });

            function showUploadLoadingModal(fileName) {
                if (!window.Swal) return;

                Swal.fire({
                    title: "Enviando arquivo...",
                    html: `
                        <div class="text-muted mb-3">aguarde enquanto o arquivo é carregado</div>
                        <div class="fw-semibold text-truncate">${escapeHtml(fileName || "Arquivo TXT")}</div>
                    `,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: function () {
                        Swal.showLoading();
                    }
                });
            }

            function formatUploadNumber(value) {
                const number = Number(value);
                return Number.isFinite(number) ? number.toLocaleString("pt-BR") : "0";
            }

            function renderUploadProgressHtml(job, fileName) {
                const percent = Math.max(0, Math.min(100, Math.round(Number(job?.percent) || 0)));
                const processedLines = formatUploadNumber(job?.processed_lines);
                const totalLines = formatUploadNumber(job?.total_lines);
                const batchesDone = formatUploadNumber(job?.batches_done);
                const batchesTotal = formatUploadNumber(job?.batches_total);
                const saved = formatUploadNumber(job?.saved);
                const skippedInvalid = formatUploadNumber(job?.skipped_invalid);

                return `
                    <div class="text-muted mb-3">aguarde enquanto o arquivo é carregado</div>
                    <div class="fw-semibold text-truncate mb-3">${escapeHtml(fileName || "Arquivo TXT")}</div>
                    <div class="progress mb-3" style="height: 8px;">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${percent}%;" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="fw-semibold mb-2">${percent}%</div>
                    <div class="small text-muted">
                        ${processedLines} de ${totalLines} linhas processadas
                    </div>
                    <div class="small text-muted">
                        Lotes ${batchesDone}/${batchesTotal} · Salvas: ${saved} · Ignoradas: ${skippedInvalid}
                    </div>
                `;
            }

            function updateUploadProgressModal(job, fileName) {
                if (!window.Swal) return;

                Swal.update({
                    title: "Processando dados...",
                    html: renderUploadProgressHtml(job, fileName),
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });
            }

            function wait(milliseconds) {
                return new Promise(function (resolve) {
                    window.setTimeout(resolve, milliseconds);
                });
            }

            async function fetchUploadJobStatus(jobPayload, fileName) {
                const jobId = jobPayload?.job_id;
                const statusUrl = jobPayload?.status_url || (jobId ? `/dados-crus-upload/jobs/${encodeURIComponent(jobId)}` : "");

                if (!statusUrl) return jobPayload;

                const token = getAccessToken();
                const url = new URL(statusUrl, API_BASE_URL).href;
                let latestJob = jobPayload;

                updateUploadProgressModal(latestJob, fileName);

                while (true) {
                    await wait(900);

                    const response = await fetch(url, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    const payload = await response.json().catch(function () {
                        return null;
                    });

                    if (response.status === 401) {
                        throw new Error("Sua sessao expirou. Faca login novamente.");
                    }

                    if (!response.ok) {
                        const fallback = `Nao foi possivel consultar o progresso (erro ${response.status}).`;
                        throw new Error(formatApiErrorMessage(payload, fallback));
                    }

                    latestJob = payload || latestJob;
                    updateUploadProgressModal(latestJob, fileName);

                    const status = String(latestJob?.status || "").toLowerCase();
                    if (["done", "complete", "completed", "success", "finished"].includes(status)) {
                        return latestJob;
                    }

                    if (["error", "failed", "failure", "canceled", "cancelled"].includes(status)) {
                        throw new Error(latestJob?.message || latestJob?.error || "A API nao conseguiu processar o arquivo TXT.");
                    }
                }
            }

            async function showUploadSuccessModal(fileName) {
                if (!window.Swal) {
                    showReportToast("success", "Upload concluido", "Arquivo TXT enviado com sucesso.");
                    return;
                }

                await Swal.fire({
                    title: "Good job!",
                    text: "arquivo carregado com sucesso",
                    icon: "success",
                    timer: 4000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });
            }

            async function showUploadErrorModal(message) {
                if (!window.Swal) {
                    showReportToast("error", "Falha no upload", message);
                    return;
                }

                await Swal.fire({
                    title: "Erro no upload",
                    text: message,
                    icon: "error",
                    confirmButtonText: "OK",
                    customClass: {
                        confirmButton: "btn btn-primary w-xs mt-2"
                    },
                    buttonsStyling: false,
                    showCloseButton: true
                });
            }

            function showReportToast(type, title, message) {
                let container = document.getElementById("report-toast-container");

                if (!container) {
                    container = document.createElement("div");
                    container.id = "report-toast-container";
                    container.className = "toast-container position-fixed top-0 end-0 p-3";
                    container.style.zIndex = "1080";
                    document.body.appendChild(container);
                }

                const isSuccess = type === "success";
                const toast = document.createElement("div");
                toast.className = "toast border-0 material-shadow";
                toast.setAttribute("role", "alert");
                toast.setAttribute("aria-live", "assertive");
                toast.setAttribute("aria-atomic", "true");
                toast.innerHTML = `
                    <div class="toast-header ${isSuccess ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}">
                        <i class="${isSuccess ? "ri-checkbox-circle-line" : "ri-error-warning-line"} me-2"></i>
                        <strong class="me-auto">${escapeHtml(title)}</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
                    </div>
                    <div class="toast-body">${escapeHtml(message)}</div>
                `;

                container.appendChild(toast);

                if (window.bootstrap?.Toast) {
                    const instance = new bootstrap.Toast(toast, { delay: 4200 });
                    toast.addEventListener("hidden.bs.toast", function () {
                        toast.remove();
                    });
                    instance.show();
                } else {
                    alert(`${title}: ${message}`);
                    toast.remove();
                }
            }

            function formatApiErrorMessage(payload, fallbackMessage) {
                if (!payload) return fallbackMessage;
                if (typeof payload === "string") return payload;

                const detail = payload.detail || payload.message || payload.error;
                const source = Array.isArray(detail) ? detail : detail ? [detail] : Array.isArray(payload) ? payload : [];

                if (source.length) {
                    return source.map(function (item) {
                        if (typeof item === "string") return item;
                        const location = Array.isArray(item?.loc) ? item.loc.join(".") : "";
                        const message = item?.msg || item?.message || JSON.stringify(item);
                        return location ? `${location}: ${message}` : message;
                    }).join(" | ");
                }

                return fallbackMessage;
            }

            function setTxtUploadButtonState(text, isLoading) {
                if (!loadReportTxtButton) return;

                loadReportTxtButton.disabled = Boolean(isLoading);
                loadReportTxtButton.innerHTML = isLoading
                    ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span>${text}</span>`
                    : `<i class="ri-upload-cloud-2-line"></i><span>${text}</span>`;
            }

            function uploadRawDataTxt(file) {
                if (!uploadReportNumber) {
                    throw new Error("Nao foi possivel identificar o relatorio selecionado.");
                }

                const token = getAccessToken();
                if (!token) {
                    throw new Error("Sua sessao expirou. Faca login novamente para enviar o arquivo.");
                }

                const formData = new FormData();
                formData.append("file", file);
                formData.append("arquivo", file);
                formData.append("relatorio_number", uploadReportNumber);

                return new Promise(function (resolve, reject) {
                    const request = new XMLHttpRequest();
                    request.open("POST", `${API_BASE_URL}/dados-crus-upload/ingest`, true);
                    request.setRequestHeader("Authorization", `Bearer ${token}`);

                    request.addEventListener("load", function () {
                        let payload = null;

                        try {
                            payload = request.responseText ? JSON.parse(request.responseText) : null;
                        } catch (error) {
                            payload = request.responseText || null;
                        }

                        if (request.status === 401) {
                            reject(new Error("Sua sessao expirou. Faca login novamente."));
                            return;
                        }

                        if (request.status < 200 || request.status >= 300) {
                            const fallback = `Nao foi possivel enviar o TXT (erro ${request.status}).`;
                            reject(new Error(formatApiErrorMessage(payload, fallback)));
                            return;
                        }

                        resolve(payload);
                    });

                    request.addEventListener("error", function () {
                        reject(new Error("Nao foi possivel conectar com a API para enviar o TXT."));
                    });

                    request.send(formData);
                });
            }

            loadReportTxtInput?.addEventListener("change", async function () {
                const file = this.files?.[0];
                if (!file) return;

                const isTxtFile = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
                if (!isTxtFile) {
                    await showUploadErrorModal("Selecione um arquivo TXT valido.");
                    this.value = "";
                    return;
                }

                try {
                    setTxtUploadButtonState("Enviando...", true);
                    showUploadLoadingModal(file.name);
                    const uploadJob = await uploadRawDataTxt(file);
                    setTxtUploadButtonState("Processando...", true);
                    await fetchUploadJobStatus(uploadJob, file.name);
                    setTxtUploadButtonState("TXT enviado", false);
                    await showUploadSuccessModal(file.name);
                    setTxtUploadButtonState("Carregar TXT", false);
                } catch (error) {
                    setTxtUploadButtonState("Carregar TXT", false);
                    await showUploadErrorModal(error?.message || "Nao foi possivel enviar o arquivo TXT.");
                } finally {
                    this.value = "";
                }
            });

            function captureTokenFromUrl() {
                const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
                const tokenFromUrl = hashParams.get("access_token");

                if (!tokenFromUrl) return "";

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

            const teamMapContainer = document.getElementById("team-map-container");
            const teamMapStatus = document.getElementById("team-map-status");
            const teamMapTitle = document.getElementById("team-map-title");
            const teamMapPlayerName = document.getElementById("team-map-player-name");
            let currentMapObjectUrl = "";
            let mapRequestSequence = 0;
            let sprintsRequestSequence = 0;
            const MAP_REQUESTS_ENABLED = false;
            let mapTemplatePayload = null;
            const templateResizeObservers = {};
            const readyMapTemplates = new Set();
            const reportPlayerPhotos = new Map();
            const playerPhotoImageCache = new Map();
            let selectedReportPlayer = null;
            let heatCoordinatesPayload = null;
            let selectedSprintPayload = null;
            let coordinateRequestSequence = 0;

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

            function setTeamMapStatus(text, type) {
                if (!teamMapStatus) return;

                const statusClasses = {
                    success: "badge bg-success-subtle text-success",
                    error: "badge bg-danger-subtle text-danger",
                    loading: "badge bg-info-subtle text-info"
                };

                teamMapStatus.className = statusClasses[type] || statusClasses.loading;
                teamMapStatus.textContent = type === "error" ? "Favor carregar relatório" : text;
            }

            function renderMapMessage(message, isError) {
                if (!teamMapContainer) return;

                const displayMessage = isError ? "Favor carregar relatório" : message;

                teamMapContainer.innerHTML = `
                    <div class="team-map-empty-state ${isError ? "text-danger" : ""}">
                        <span class="avatar-lg rounded-circle ${isError ? "bg-danger-subtle text-danger" : "bg-info-subtle text-info"} d-inline-flex align-items-center justify-content-center mb-3">
                            <i class="${isError ? "ri-error-warning-line" : "ri-image-line"} fs-28"></i>
                        </span>
                        <h5 class="mb-2">${isError ? escapeHtml(displayMessage) : "Mapa de calor"}</h5>
                        ${isError ? "" : `<p class="text-muted mb-0">${escapeHtml(displayMessage)}</p>`}
                    </div>
                `;
            }

            function normalizedValue(element, key, templateSize) {
                const normalizedRaw = element?.normalizado?.[key];
                if (normalizedRaw !== null && normalizedRaw !== undefined && normalizedRaw !== "") {
                    const normalized = Number(normalizedRaw);
                    if (Number.isFinite(normalized)) return normalized;
                }

                const originalRaw = element?.[key];
                if (originalRaw === null || originalRaw === undefined || originalRaw === "") return null;
                const original = Number(originalRaw);
                return Number.isFinite(original) && templateSize > 0 ? original / templateSize : null;
            }

            function getPlotBounds(element, templateWidth, templateHeight) {
                const configuredLeft = normalizedValue(element, "box_left", templateWidth);
                const configuredRight = normalizedValue(element, "box_right", templateWidth);
                const configuredTop = normalizedValue(element, "box_top", templateHeight);
                const configuredBottom = normalizedValue(element, "box_bottom", templateHeight);
                if (
                    configuredLeft !== null
                    && configuredRight !== null
                    && configuredTop !== null
                    && configuredBottom !== null
                    && configuredRight > configuredLeft
                    && configuredBottom > configuredTop
                ) {
                    return {
                        left: configuredLeft,
                        right: configuredRight,
                        top: configuredTop,
                        bottom: configuredBottom
                    };
                }

                // Calibração proporcional já utilizada pelo antigo mapa de sprints
                // (área 94,228 até 791,1192 em uma template 1254x1254).
                return {
                    left: 94 / 1254,
                    right: 791 / 1254,
                    top: 228 / 1254,
                    bottom: 1192 / 1254
                };
            }

            function getConfiguredElementText(element, playerName) {
                const type = String(element?.tipo_elemento || "").toLowerCase();
                if (type === "plotagem" || type === "jogador" || type === "foto_jogador") return "";
                if (type === "texto_jogador" || type === "nome_jogador") {
                    return playerName ? `${playerName} v ${reportName}`.toUpperCase() : `EQUIPE v ${reportName}`.toUpperCase();
                }
                if (type === "nome_relatorio" || type === "texto_relatorio") return reportName;
                return String(element?.texto_padrao ?? "");
            }

            function fitConfiguredTemplateText(root, templateWidth) {
                if (!root || !templateWidth) return;
                const scale = root.clientWidth / templateWidth;

                root.querySelectorAll(".configured-map-element").forEach(function (item) {
                    const baseSize = Number(item.dataset.fontSize) || 40;
                    const minimumSize = Math.min(8, baseSize) * scale;
                    const maximumSize = baseSize * scale;
                    let displayedSize = maximumSize;
                    item.style.fontSize = `${maximumSize}px`;

                    if (item.dataset.fitBox !== "true") return;
                    if (item.scrollWidth <= item.clientWidth && item.scrollHeight <= item.clientHeight) return;

                    let lowerSize = minimumSize;
                    let upperSize = maximumSize;
                    for (let attempt = 0; attempt < 8; attempt += 1) {
                        displayedSize = (lowerSize + upperSize) / 2;
                        item.style.fontSize = `${displayedSize}px`;
                        if (item.scrollWidth <= item.clientWidth && item.scrollHeight <= item.clientHeight) {
                            lowerSize = displayedSize;
                        } else {
                            upperSize = displayedSize;
                        }
                    }
                    item.style.fontSize = `${lowerSize}px`;
                });
            }

            function updateConfiguredTemplateText(groupName, playerName) {
                const target = groupName === "mapa_calor"
                    ? teamMapContainer
                    : document.getElementById("sprints-map-stage");
                const root = target?.querySelector(".configured-map-template");
                const elements = mapTemplatePayload?.grupos?.[groupName]?.elementos;
                const templateWidth = Number(mapTemplatePayload?.template?.largura) || 0;
                if (!root || !Array.isArray(elements)) return false;

                root.querySelectorAll("[data-element-index]").forEach(function (item) {
                    const element = elements[Number(item.dataset.elementIndex)];
                    if (element) item.textContent = getConfiguredElementText(element, playerName);
                });
                fitConfiguredTemplateText(root, templateWidth);
                return true;
            }

            function getPlayerId(player) {
                return player?.aluno_user_id ?? player?.user_id ?? player?.aluno_id ?? player?.id ?? null;
            }

            function getConfiguredPhotoRecord(player) {
                const playerId = getPlayerId(player);
                return playerId === null ? null : reportPlayerPhotos.get(String(playerId)) || null;
            }

            function applySelectedPlayerPhoto(player) {
                selectedReportPlayer = player || null;
                const photoRecord = getConfiguredPhotoRecord(player);
                const configuration = photoRecord?.configuracao;
                const photoUrl = photoRecord?.foto?.url;
                const values = [
                    configuration?.posicao_x,
                    configuration?.posicao_y,
                    configuration?.largura,
                    configuration?.altura
                ].map(Number);
                const hasValidConfiguration = photoRecord?.foto_configurada
                    && photoUrl
                    && values.every(Number.isFinite)
                    && values[2] > 0
                    && values[3] > 0;

                ["mapa_calor", "mapa_sprints"].forEach(function (groupName) {
                    const target = groupName === "mapa_calor"
                        ? teamMapContainer
                        : document.getElementById("sprints-map-stage");
                    const root = target?.querySelector(".configured-map-template");
                    if (!root || !readyMapTemplates.has(groupName)) return;

                    root.querySelector(".configured-player-photo")?.remove();
                    if (!hasValidConfiguration) return;

                    const cachedImage = playerPhotoImageCache.get(String(getPlayerId(player)));
                    const image = document.createElement("img");
                    image.className = "configured-player-photo";
                    image.alt = `Foto de ${getPlayerName(player, 0)}`;
                    image.src = cachedImage?.src || photoUrl;
                    image.style.left = `${values[0] * 100}%`;
                    image.style.top = `${values[1] * 100}%`;
                    image.style.width = `${values[2] * 100}%`;
                    image.style.height = `${values[3] * 100}%`;
                    image.addEventListener("load", function () {
                        requestAnimationFrame(function () { image.classList.add("is-visible"); });
                    }, { once: true });
                    if (image.complete) image.classList.add("is-visible");

                    const firstText = root.querySelector(".configured-map-element");
                    root.insertBefore(image, firstText || null);
                });
            }

            function preloadPlayerPhoto(record) {
                const playerId = record?.aluno_user_id;
                const photoUrl = record?.foto?.url;
                if (playerId === null || playerId === undefined || !photoUrl) return;

                const image = new Image();
                image.decoding = "async";
                image.src = photoUrl;
                playerPhotoImageCache.set(String(playerId), image);
                image.decode?.().catch(function () {});
            }

            function getPlotLayer(groupName) {
                const target = groupName === "mapa_calor"
                    ? teamMapContainer
                    : document.getElementById("sprints-map-stage");
                return target?.querySelector('.configured-map-asset-layer[data-element-type="plotagem"]') || null;
            }

            function createPlotCanvas(groupName, width, height) {
                const layer = getPlotLayer(groupName);
                if (!layer) return null;
                layer.innerHTML = "";
                const canvas = document.createElement("canvas");
                canvas.className = "configured-map-plot-canvas";
                canvas.width = Math.max(1, Math.round(width));
                canvas.height = Math.max(1, Math.round(height));
                canvas.setAttribute("aria-hidden", "true");
                layer.appendChild(canvas);
                return canvas;
            }

            function mapFieldPoint(x, y, limitX, limitY, width, height) {
                return {
                    x: Math.max(0, Math.min(width - 1, (y / limitY) * (width - 1))),
                    y: Math.max(0, Math.min(height - 1, (x / limitX) * (height - 1)))
                };
            }

            function gaussianKernel(sigma) {
                const radius = Math.max(1, Math.ceil(sigma * 3));
                const kernel = new Float32Array(radius * 2 + 1);
                let total = 0;
                for (let index = -radius; index <= radius; index += 1) {
                    const value = Math.exp(-(index * index) / (2 * sigma * sigma));
                    kernel[index + radius] = value;
                    total += value;
                }
                for (let index = 0; index < kernel.length; index += 1) kernel[index] /= total;
                return { kernel: kernel, radius: radius };
            }

            function blurDensity(source, width, height, sigma) {
                const setup = gaussianKernel(sigma);
                const horizontal = new Float32Array(source.length);
                const output = new Float32Array(source.length);

                for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                        let value = 0;
                        for (let offset = -setup.radius; offset <= setup.radius; offset += 1) {
                            const sampleX = Math.max(0, Math.min(width - 1, x + offset));
                            value += source[y * width + sampleX] * setup.kernel[offset + setup.radius];
                        }
                        horizontal[y * width + x] = value;
                    }
                }
                for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                        let value = 0;
                        for (let offset = -setup.radius; offset <= setup.radius; offset += 1) {
                            const sampleY = Math.max(0, Math.min(height - 1, y + offset));
                            value += horizontal[sampleY * width + x] * setup.kernel[offset + setup.radius];
                        }
                        output[y * width + x] = value;
                    }
                }
                return output;
            }

            function heatColor(value) {
                const stops = [
                    [0, [255, 255, 0, 0]],
                    [0.18, [237, 255, 56, 122]],
                    [0.42, [255, 242, 51, 184]],
                    [0.70, [255, 161, 31, 224]],
                    [1, [230, 46, 46, 252]]
                ];
                for (let index = 0; index < stops.length - 1; index += 1) {
                    if (value > stops[index + 1][0]) continue;
                    const start = stops[index];
                    const end = stops[index + 1];
                    const ratio = (value - start[0]) / (end[0] - start[0]);
                    return start[1].map(function (channel, channelIndex) {
                        return Math.round(channel + ratio * (end[1][channelIndex] - channel));
                    });
                }
                return stops[stops.length - 1][1];
            }

            function updateMapNumbers(groupName, values) {
                const target = groupName === "mapa_calor"
                    ? teamMapContainer
                    : document.getElementById("sprints-map-stage");
                const numberElements = Array.from(target?.querySelectorAll('[data-element-type="numero"]') || []);
                numberElements.forEach(function (element, index) {
                    element.textContent = values[index] ?? values[values.length - 1] ?? "";
                });
                const root = target?.querySelector(".configured-map-template");
                const templateWidth = Number(mapTemplatePayload?.template?.largura) || 0;
                fitConfiguredTemplateText(root, templateWidth);
            }

            function renderHeatCoordinates(player) {
                if (!heatCoordinatesPayload || !mapTemplatePayload) return;
                if (!readyMapTemplates.has("mapa_calor")) return false;
                const playerId = getPlayerId(player);
                const limitX = Number(heatCoordinatesPayload.limite_x);
                const limitY = Number(heatCoordinatesPayload.limite_y);
                if (!(limitX > 0 && limitY > 0)) return;

                const allCoordinates = Array.isArray(heatCoordinatesPayload.coordenadas)
                    ? heatCoordinatesPayload.coordenadas
                    : [];
                const coordinates = playerId === null
                    ? allCoordinates
                    : allCoordinates.filter(function (point) { return String(point?.aluno_user_id) === String(playerId); });
                const maxDimension = 260;
                const plotElement = mapTemplatePayload.grupos?.mapa_calor?.elementos?.find(function (element) {
                    return element?.tipo_elemento === "plotagem";
                });
                if (!plotElement) return;
                const templateWidth = Number(mapTemplatePayload.template?.largura) || 1;
                const templateHeight = Number(mapTemplatePayload.template?.altura) || 1;
                const plotBounds = getPlotBounds(plotElement, templateWidth, templateHeight);
                const boxWidth = Math.max(1, (plotBounds.right - plotBounds.left) * templateWidth);
                const boxHeight = Math.max(1, (plotBounds.bottom - plotBounds.top) * templateHeight);
                const ratio = Math.min(1, maxDimension / Math.max(boxWidth, boxHeight));
                const width = Math.max(40, Math.round(boxWidth * ratio));
                const height = Math.max(40, Math.round(boxHeight * ratio));
                const canvas = createPlotCanvas("mapa_calor", width, height);
                const context = canvas?.getContext("2d");
                if (!context || !coordinates.length) {
                    updateMapNumbers("mapa_calor", ["0.00KM"]);
                    return;
                }

                const occurrences = new Float32Array(width * height);
                coordinates.forEach(function (point) {
                    const x = Number(point?.x_ajustado ?? point?.x);
                    const y = Number(point?.y_ajustado ?? point?.y);
                    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
                    const mapped = mapFieldPoint(x, y, limitX, limitY, width, height);
                    occurrences[Math.round(mapped.y) * width + Math.round(mapped.x)] += 1;
                });
                const density = blurDensity(occurrences, width, height, Math.max(2, Math.min(width, height) * 0.025));
                let peak = 0;
                density.forEach(function (value) { if (value > peak) peak = value; });
                const imageData = context.createImageData(width, height);
                density.forEach(function (value, index) {
                    const normalized = peak > 0 ? value / peak : 0;
                    const color = normalized < 0.03 ? [0, 0, 0, 0] : heatColor(normalized);
                    const pixel = index * 4;
                    imageData.data[pixel] = color[0];
                    imageData.data[pixel + 1] = color[1];
                    imageData.data[pixel + 2] = color[2];
                    imageData.data[pixel + 3] = color[3];
                });
                context.putImageData(imageData, 0, 0);

                const playerMetrics = playerId === null
                    ? null
                    : (Array.isArray(heatCoordinatesPayload.jogadores)
                        ? heatCoordinatesPayload.jogadores.find(function (item) {
                            return String(item?.aluno_user_id) === String(playerId);
                        })
                        : null);
                const totalDistanceKm = Number(heatCoordinatesPayload.distancia_total_km);
                const distanceText = playerMetrics?.distancia_texto
                    || (Number.isFinite(Number(playerMetrics?.distancia_percorrida_km))
                        ? `${Number(playerMetrics.distancia_percorrida_km).toFixed(2)}KM`
                        : null)
                    || (Number.isFinite(totalDistanceKm) ? `${totalDistanceKm.toFixed(2)}KM` : "0.00KM");
                updateMapNumbers("mapa_calor", [distanceText]);
                setTeamMapStatus("Mapa plotado", "success");
            }

            function drawSprintArrow(context, start, end, label) {
                const angle = Math.atan2(end.y - start.y, end.x - start.x);
                const head = 10;
                context.strokeStyle = "#ff2d2d";
                context.fillStyle = "#ff2d2d";
                context.lineWidth = 3;
                context.lineCap = "round";
                context.beginPath();
                context.moveTo(start.x, start.y);
                context.lineTo(end.x, end.y);
                context.stroke();
                context.beginPath();
                context.moveTo(end.x, end.y);
                context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
                context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
                context.closePath();
                context.fill();
                context.fillStyle = "#ffffff";
                context.font = "bold 12px Arial";
                context.fillText(String(label), end.x + 5, end.y - 5);
            }

            function renderSprintCoordinates(payload) {
                if (!payload) return false;
                selectedSprintPayload = payload;
                if (!mapTemplatePayload) return null;
                if (!readyMapTemplates.has("mapa_sprints")) return null;
                const limitX = Number(payload.limite_x);
                const limitY = Number(payload.limite_y);
                const coordinates = Array.isArray(payload.coordenadas) ? payload.coordenadas : [];
                if (!(limitX > 0 && limitY > 0)) return false;

                const plotElement = mapTemplatePayload.grupos?.mapa_sprints?.elementos?.find(function (element) {
                    return element?.tipo_elemento === "plotagem";
                });
                if (!plotElement) return false;
                const templateWidth = Number(mapTemplatePayload.template?.largura) || 1;
                const templateHeight = Number(mapTemplatePayload.template?.altura) || 1;
                const plotBounds = getPlotBounds(plotElement, templateWidth, templateHeight);
                const width = Math.max(1, Math.round((plotBounds.right - plotBounds.left) * templateWidth));
                const height = Math.max(1, Math.round((plotBounds.bottom - plotBounds.top) * templateHeight));
                const canvas = createPlotCanvas("mapa_sprints", width, height);
                const context = canvas?.getContext("2d");
                if (!context) return false;

                const mappedCoordinates = coordinates.map(function (point) {
                    const x = Number(point?.x);
                    const y = Number(point?.y);
                    return Number.isFinite(x) && Number.isFinite(y)
                        ? mapFieldPoint(x, y, limitX, limitY, width, height)
                        : null;
                }).filter(Boolean);

                for (let index = 1; index < mappedCoordinates.length; index += 1) {
                    drawSprintArrow(context, mappedCoordinates[index - 1], mappedCoordinates[index], index);
                }
                mappedCoordinates.forEach(function (point, index) {
                    context.beginPath();
                    context.arc(point.x, point.y, index === mappedCoordinates.length - 1 ? 6 : 4.5, 0, Math.PI * 2);
                    context.fillStyle = index === 0 ? "#ffe45c" : "#ff2d2d";
                    context.fill();
                    context.strokeStyle = "#111111";
                    context.lineWidth = 1.25;
                    context.stroke();
                });
                const distance = coordinates.reduce(function (total, point) {
                    return total + (Number(point?.distancia_percorrida) || 0);
                }, 0);
                const sprintNumberCount = document.querySelectorAll('#sprints-map-stage [data-element-type="numero"]').length;
                const sprintCount = String(payload.sprints_realizados ?? payload.total_sprints ?? mappedCoordinates.length);
                updateMapNumbers(
                    "mapa_sprints",
                    sprintNumberCount > 1
                        ? [`${(distance / 1000).toFixed(2)}KM`, sprintCount]
                        : [sprintCount]
                );
                const sprintStatus = document.getElementById("sprints-map-status");
                const sprintDescription = document.getElementById("sprints-map-description");
                if (sprintStatus) {
                    sprintStatus.className = "badge bg-success-subtle text-success";
                    sprintStatus.textContent = coordinates.length ? "Mapa plotado" : "Sem sprints";
                }
                if (sprintDescription) {
                    sprintDescription.textContent = mappedCoordinates.length
                        ? `${mappedCoordinates.length} pontos de sprint plotados.`
                        : "Nenhum sprint encontrado para o jogador selecionado.";
                }
                const sprintNote = document.getElementById("sprints-map-note");
                if (sprintNote) sprintNote.hidden = mappedCoordinates.length > 0;
                return true;
            }

            async function loadHeatCoordinates() {
                if (!reportNumber) return;
                const token = getAccessToken();
                if (!token) return;
                try {
                    const query = new URLSearchParams({ relatorio_number: reportNumber });
                    const response = await fetch(`${API_BASE_URL}/mapa-calor/coordenadas-filtradas?${query}`, {
                        method: "GET",
                        headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
                    });
                    const payload = await response.json().catch(function () { return null; });
                    if (!response.ok) throw new Error(formatApiErrorMessage(payload, `Erro ${response.status} ao carregar o mapa de calor.`));
                    heatCoordinatesPayload = payload;
                    renderHeatCoordinates(selectedReportPlayer);
                } catch (error) {
                    setTeamMapStatus("Erro na plotagem", "error");
                }
            }

            async function loadSelectedPlayerSprints(player) {
                const playerId = getPlayerId(player);
                if (!reportNumber || playerId === null) return;
                const token = getAccessToken();
                if (!token) return;
                const requestSequence = ++coordinateRequestSequence;
                const sprintStatus = document.getElementById("sprints-map-status");
                const sprintDescription = document.getElementById("sprints-map-description");
                if (sprintStatus) {
                    sprintStatus.className = "badge bg-info-subtle text-info";
                    sprintStatus.textContent = "Carregando sprints";
                }
                if (sprintDescription) sprintDescription.textContent = "Buscando coordenadas do jogador selecionado...";
                try {
                    const query = new URLSearchParams({
                        relatorio_number: reportNumber,
                        aluno_user_id: String(playerId)
                    });
                    const response = await fetch(`${API_BASE_URL}/mapa-calor/coordenadas-sprints?${query}`, {
                        method: "GET",
                        headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
                    });
                    const payload = await response.json().catch(function () { return null; });
                    if (!response.ok) throw new Error(formatApiErrorMessage(payload, `Erro ${response.status} ao carregar os sprints.`));
                    if (requestSequence !== coordinateRequestSequence) return;
                    selectedSprintPayload = payload;
                    const rendered = renderSprintCoordinates(payload);
                    if (rendered === null) {
                        if (sprintStatus) sprintStatus.textContent = "Aguardando template";
                        return;
                    }
                    if (!rendered) throw new Error("A área de plotagem de sprints não está configurada na template.");
                } catch (error) {
                    if (requestSequence !== coordinateRequestSequence) return;
                    if (sprintStatus) {
                        sprintStatus.className = "badge bg-danger-subtle text-danger";
                        sprintStatus.textContent = "Erro na plotagem";
                    }
                    if (sprintDescription) sprintDescription.textContent = error?.message || "Não foi possível carregar os sprints.";
                }
            }

            async function loadReportPlayerPhotos() {
                if (!reportNumber) return;
                const token = getAccessToken();
                if (!token) return;

                try {
                    const query = new URLSearchParams({ relatorio_number: reportNumber });
                    const response = await fetch(`${API_BASE_URL}/mapa-calor/jogadores-fotos?${query}`, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    const payload = await response.json().catch(function () { return null; });
                    if (!response.ok) {
                        throw new Error(payload?.detail || payload?.message || `Não foi possível carregar as fotos (erro ${response.status}).`);
                    }

                    const players = Array.isArray(payload?.jogadores) ? payload.jogadores : [];
                    players.forEach(function (record) {
                        if (record?.aluno_user_id === null || record?.aluno_user_id === undefined) return;
                        reportPlayerPhotos.set(String(record.aluno_user_id), record);
                        preloadPlayerPhoto(record);
                    });
                    if (selectedReportPlayer) applySelectedPlayerPhoto(selectedReportPlayer);
                } catch (error) {
                    console.warn("Não foi possível carregar as fotos dos jogadores.", error);
                }
            }

            function renderConfiguredTemplate(groupName, playerName) {
                const template = mapTemplatePayload?.template;
                const elements = mapTemplatePayload?.grupos?.[groupName]?.elementos;
                const target = groupName === "mapa_calor"
                    ? teamMapContainer
                    : document.getElementById("sprints-map-stage");

                if (!target || !template?.url || !Array.isArray(elements)) return false;

                const existingRoot = target.querySelector(".configured-map-template");
                if (existingRoot?.dataset?.templateUrl === template.url) {
                    return updateConfiguredTemplateText(groupName, playerName);
                }

                readyMapTemplates.delete(groupName);

                const templateWidth = Number(template.largura) || 1;
                const templateHeight = Number(template.altura) || 1;
                const layerHtml = elements.map(function (element, elementIndex) {
                    const text = getConfiguredElementText(element, playerName);
                    const elementType = String(element?.tipo_elemento || "").toLowerCase();
                    const isAssetLayer = elementType === "plotagem" || elementType === "jogador" || elementType === "foto_jogador";
                    const isDynamicText = elementType === "numero";
                    if (!text && !isAssetLayer && !isDynamicText) return "";

                    let left = normalizedValue(element, "box_left", templateWidth)
                        ?? normalizedValue(element, "x", templateWidth)
                        ?? 0;
                    let top = normalizedValue(element, "box_top", templateHeight)
                        ?? normalizedValue(element, "y", templateHeight)
                        ?? 0;
                    let right = normalizedValue(element, "box_right", templateWidth);
                    let bottom = normalizedValue(element, "box_bottom", templateHeight);
                    const elementWidth = normalizedValue(element, "largura", templateWidth);
                    const elementHeight = normalizedValue(element, "altura", templateHeight);
                    if (elementType === "plotagem") {
                        const plotBounds = getPlotBounds(element, templateWidth, templateHeight);
                        left = plotBounds.left;
                        right = plotBounds.right;
                        top = plotBounds.top;
                        bottom = plotBounds.bottom;
                    }
                    const width = right !== null ? right - left : elementWidth;
                    const height = bottom !== null ? bottom - top : elementHeight;
                    const configuredFontSize = Number(element?.fonte_tamanho)
                        || ((normalizedValue(element, "fonte_tamanho", templateHeight) ?? 0.02) * templateHeight);
                    const hasBox = right !== null && bottom !== null;
                    const style = [
                        `left:${left * 100}%`,
                        `top:${top * 100}%`,
                        width !== null ? `width:${Math.max(0, width) * 100}%` : "width:auto",
                        height !== null ? `height:${Math.max(0, height) * 100}%` : "height:auto",
                        `color:${escapeHtml(element?.cor || "#FFFFFF")}`
                    ].join(";");

                    if (isAssetLayer) {
                        return `<div class="configured-map-asset-layer" data-element-index="${elementIndex}" data-element-type="${escapeHtml(elementType)}" style="${style}"></div>`;
                    }
                    return `<div class="configured-map-element" data-element-index="${elementIndex}" data-element-type="${escapeHtml(elementType)}" data-font-size="${configuredFontSize}" data-fit-box="${hasBox}" style="${style}">${escapeHtml(text)}</div>`;
                }).join("");

                target.setAttribute("aria-busy", "true");
                target.innerHTML = `
                    <div class="configured-map-template is-loading" data-template-url="${escapeHtml(template.url)}" style="aspect-ratio:${templateWidth}/${templateHeight}">
                        <img class="configured-template-background" src="${escapeHtml(template.url)}" alt="Template de ${groupName === "mapa_calor" ? "mapa de calor" : "mapa de sprints"}" decoding="async" loading="${groupName === "mapa_sprints" ? "lazy" : "eager"}">
                        ${layerHtml}
                        <div class="configured-map-loading" role="status">
                            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                            <span>Carregando ${groupName === "mapa_calor" ? "mapa de calor" : "mapa de sprints"}...</span>
                        </div>
                    </div>
                `;

                const root = target.querySelector(".configured-map-template");
                const image = root?.querySelector(".configured-template-background");
                let fitFrame = 0;
                const fitText = function () {
                    cancelAnimationFrame(fitFrame);
                    fitFrame = requestAnimationFrame(function () {
                        fitConfiguredTemplateText(root, templateWidth);
                    });
                };
                const revealImage = function () {
                    if (readyMapTemplates.has(groupName)) return;
                    readyMapTemplates.add(groupName);
                    root?.classList.remove("is-loading");
                    target.removeAttribute("aria-busy");
                    fitText();
                    if (selectedReportPlayer) applySelectedPlayerPhoto(selectedReportPlayer);
                    if (groupName === "mapa_calor" && heatCoordinatesPayload) {
                        renderHeatCoordinates(selectedReportPlayer);
                    } else if (groupName === "mapa_calor") {
                        setTeamMapStatus("Campo carregado", "success");
                    }
                    if (groupName === "mapa_sprints" && selectedSprintPayload) {
                        renderSprintCoordinates(selectedSprintPayload);
                    } else if (groupName === "mapa_sprints") {
                        const sprintStatus = document.getElementById("sprints-map-status");
                        if (sprintStatus) {
                            sprintStatus.className = "badge bg-secondary-subtle text-secondary";
                            sprintStatus.textContent = "Aguardando jogador";
                        }
                    }
                };
                image?.addEventListener("load", revealImage, { once: true });
                image?.addEventListener("error", function () {
                    readyMapTemplates.delete(groupName);
                    root?.classList.remove("is-loading");
                    target.removeAttribute("aria-busy");
                }, { once: true });
                if (image?.complete && image.naturalWidth > 0) revealImage();
                document.fonts?.ready.then(fitText);
                fitText();

                templateResizeObservers[groupName]?.disconnect();
                if (root && window.ResizeObserver) {
                    templateResizeObservers[groupName] = new ResizeObserver(fitText);
                    templateResizeObservers[groupName].observe(root);
                }
                return true;
            }

            async function loadMapTemplate() {
                const token = getAccessToken();
                if (!token) return;

                setTeamMapStatus("Carregando template", "loading");
                try {
                    const response = await fetch(`${API_BASE_URL}/mapa-calor/template`, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    const payload = await response.json().catch(function () { return null; });
                    if (!response.ok) {
                        throw new Error(payload?.detail || payload?.message || `Não foi possível carregar a template (erro ${response.status}).`);
                    }
                    if (!payload?.template?.url) throw new Error("A API não retornou a imagem da template.");

                    mapTemplatePayload = payload;
                    renderConfiguredTemplate("mapa_calor", "");
                    renderConfiguredTemplate("mapa_sprints", "");
                    if (selectedReportPlayer) applySelectedPlayerPhoto(selectedReportPlayer);
                    if (heatCoordinatesPayload) renderHeatCoordinates(selectedReportPlayer);
                    if (selectedSprintPayload) renderSprintCoordinates(selectedSprintPayload);
                } catch (error) {
                    renderMapMessage(error?.message || "Não foi possível carregar a template.", true);
                    setTeamMapStatus("Erro na template", "error");
                }
            }

            function renderMapImage(imageUrl, playerName) {
                if (!teamMapContainer || !imageUrl) return;
                teamMapContainer.innerHTML = `
                    <img
                        src="${escapeHtml(imageUrl)}"
                        alt="Mapa de calor de ${escapeHtml(playerName)}"
                        class="team-map-image"
                        id="team-map-image"
                    >
                    <div class="team-map-image-loading" id="team-map-image-loading">
                        <span class="spinner-border spinner-border-sm text-info me-2" aria-hidden="true"></span>
                        Carregando imagem...
                    </div>
                `;

                const image = document.getElementById("team-map-image");
                const loading = document.getElementById("team-map-image-loading");

                image?.addEventListener("load", function () {
                    loading?.remove();
                    setTeamMapStatus("Mapa carregado", "success");
                }, { once: true });

                image?.addEventListener("error", function () {
                    renderMapMessage("A imagem retornada pela API não pôde ser exibida.", true);
                    setTeamMapStatus("Falha na imagem", "error");
                }, { once: true });
            }

            function findMapImage(payload) {
                const imageKeys = new Set([
                    "imagem", "imagem_url", "image", "image_url", "url",
                    "mapa", "mapa_url", "base64", "imagem_base64"
                ]);
                let result = "";

                function visit(value, key) {
                    if (result || value == null) return;

                    if (typeof value === "string") {
                        const text = value.trim();
                        if (!text) return;

                        if (/^data:image\//i.test(text) || /^https?:\/\//i.test(text)) {
                            result = text;
                        } else if (imageKeys.has(key) && /^[A-Za-z0-9+/=\r\n]+$/.test(text)) {
                            result = `data:image/png;base64,${text.replace(/\s/g, "")}`;
                        } else if (imageKeys.has(key) && text.startsWith("/")) {
                            result = new URL(text, API_BASE_URL).href;
                        }
                        return;
                    }

                    if (Array.isArray(value)) {
                        value.forEach(function (item) { visit(item, key); });
                        return;
                    }

                    if (typeof value === "object") {
                        Object.entries(value).forEach(function (entry) {
                            visit(entry[1], entry[0].toLowerCase());
                        });
                    }
                }

                visit(payload, "");
                return result;
            }

            async function getMapImageUrl(response) {
                if (currentMapObjectUrl) {
                    URL.revokeObjectURL(currentMapObjectUrl);
                    currentMapObjectUrl = "";
                }

                const contentType = response.headers.get("content-type") || "";

                if (contentType.startsWith("image/")) {
                    currentMapObjectUrl = URL.createObjectURL(await response.blob());
                    return currentMapObjectUrl;
                }

                return findMapImage(await response.json());
            }

            async function loadTeamHeatMap() {
                const requestSequence = ++mapRequestSequence;

                if (!MAP_REQUESTS_ENABLED) {
                    if (!mapTemplatePayload) {
                        setTeamMapStatus("Carregando template", "loading");
                    }
                    return;
                }

                document.querySelectorAll("#report-players-list .list-group-item-action").forEach(function (item) {
                    item.classList.remove("active");
                });

                if (teamMapTitle) teamMapTitle.textContent = "Mapa de atuação do time";
                if (teamMapPlayerName) teamMapPlayerName.textContent = "Visão geral de todos os jogadores do relatório.";

                if (!reportNumber) {
                    renderMapMessage("Não foi possível identificar o relatório.", true);
                    setTeamMapStatus("Dados incompletos", "error");
                    return;
                }

                const token = getAccessToken();
                if (!token) {
                    renderMapMessage("Sua sessão expirou. Faça login novamente.", true);
                    setTeamMapStatus("Não autenticado", "error");
                    return;
                }

                renderMapMessage("Gerando mapa geral da equipe...", false);
                setTeamMapStatus("Gerando mapa", "loading");

                try {
                    const query = new URLSearchParams({ relatorio_number: reportNumber });
                    const response = await fetch(`${API_BASE_URL}/mapa-calor/gerar-imagem-time?${query}`, {
                        method: "GET",
                        headers: {
                            "Accept": "image/*, application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (response.status === 401 || response.status === 403) {
                        throw new Error("Sua sessão expirou. Faça login novamente.");
                    }

                    if (!response.ok) {
                        let message = `Não foi possível gerar o mapa da equipe (erro ${response.status}).`;
                        try {
                            const errorPayload = await response.json();
                            message = errorPayload?.detail || errorPayload?.message || message;
                        } catch (error) {}
                        throw new Error(message);
                    }

                    if (requestSequence !== mapRequestSequence) return;
                    const imageUrl = await getMapImageUrl(response);
                    if (requestSequence !== mapRequestSequence) return;
                    if (!imageUrl) throw new Error("A API não retornou uma imagem válida.");

                    renderMapImage(imageUrl, "todos os jogadores");
                } catch (error) {
                    if (requestSequence !== mapRequestSequence) return;
                    renderMapMessage(error?.message || "A API está indisponível no momento.", true);
                    setTeamMapStatus("Erro no mapa", "error");
                }
            }

            async function loadPlayerHeatMap(player, index) {
                const requestSequence = ++mapRequestSequence;
                const playerId = player?.aluno_user_id ?? player?.user_id ?? player?.aluno_id ?? player?.id;
                const playerName = getPlayerName(player, index);

                document.querySelectorAll("#report-players-list .list-group-item-action").forEach(function (item) {
                    item.classList.toggle("active", item.dataset.playerIndex === String(index));
                });

                if (teamMapTitle) teamMapTitle.textContent = "Mapa de calor do jogador";
                if (teamMapPlayerName) teamMapPlayerName.textContent = playerName;

                if (!MAP_REQUESTS_ENABLED) {
                    renderConfiguredTemplate("mapa_calor", playerName);
                    setTeamMapStatus(
                        readyMapTemplates.has("mapa_calor") ? "Campo carregado" : "Carregando campo",
                        "loading"
                    );
                    return;
                }

                if (!reportNumber || !playerId) {
                    renderMapMessage("Não foi possível identificar o relatório ou o jogador.", true);
                    setTeamMapStatus("Dados incompletos", "error");
                    return;
                }

                const token = getAccessToken();
                if (!token) {
                    renderMapMessage("Sua sessão expirou. Faça login novamente.", true);
                    setTeamMapStatus("Não autenticado", "error");
                    return;
                }

                renderMapMessage("Gerando imagem do mapa de calor...", false);
                setTeamMapStatus("Gerando mapa", "loading");

                try {
                    const query = new URLSearchParams({
                        relatorio_number: reportNumber,
                        aluno_user_id: String(playerId)
                    });
                    const response = await fetch(`${API_BASE_URL}/mapa-calor/gerar-imagem?${query}`, {
                        method: "GET",
                        headers: {
                            "Accept": "image/*, application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (response.status === 401 || response.status === 403) {
                        throw new Error("Sua sessão expirou. Faça login novamente.");
                    }

                    if (!response.ok) {
                        let message = `Não foi possível gerar o mapa (erro ${response.status}).`;
                        try {
                            const errorPayload = await response.json();
                            message = errorPayload?.detail || errorPayload?.message || message;
                        } catch (error) {}
                        throw new Error(message);
                    }

                    if (requestSequence !== mapRequestSequence) return;
                    const imageUrl = await getMapImageUrl(response);
                    if (requestSequence !== mapRequestSequence) return;
                    if (!imageUrl) {
                        throw new Error("A API não retornou uma imagem válida.");
                    }

                    renderMapImage(imageUrl, playerName);
                } catch (error) {
                    if (requestSequence !== mapRequestSequence) return;
                    renderMapMessage(error?.message || "A API está indisponível no momento.", true);
                    setTeamMapStatus("Erro no mapa", "error");
                }
            }

            function normalizePlayers(payload) {
                const source = Array.isArray(payload)
                    ? payload
                    : payload?.alunos
                        || payload?.jogadores
                        || payload?.players
                        || payload?.students
                        || payload?.data
                        || payload?.results
                        || payload?.items
                        || payload?.records
                        || [];

                return Array.isArray(source)
                    ? source.map(function (item) {
                        return item?.aluno || item?.jogador || item?.player || item?.student || item;
                    }).filter(Boolean)
                    : [];
            }

            function getPlayerName(player, index) {
                const firstName = player?.aluno_nome || player?.nome || player?.name || "";
                const lastName = player?.aluno_sobrenome || player?.sobrenome || player?.last_name || player?.lastname || "";
                const fullName = `${firstName} ${lastName}`.trim();
                return fullName || `Jogador ${String(index + 1).padStart(2, "0")}`;
            }

            function getPlayerDetails(player) {
                const position = player?.posicao
                    || player?.["posição"]
                    || player?.["posi\u00c3\u00a7\u00c3\u00a3o"]
                    || player?.position
                    || "";
                const category = player?.categoria || player?.category || "";
                return [position, category].filter(Boolean).join(" • ") || "Dados do atleta";
            }

            function renderPlayers(players) {
                const list = document.getElementById("report-players-list");
                if (!list) return;

                if (!players.length) {
                    list.innerHTML = `
                        <li class="list-group-item py-4 text-center text-muted">
                            <i class="ri-user-unfollow-line fs-24 d-block mb-2"></i>
                            Nenhum jogador foi encontrado neste relatório.
                        </li>
                    `;
                    return;
                }

                list.innerHTML = players.map(function (player, index) {
                    const playerName = getPlayerName(player, index);

                    return `
                        <li class="list-group-item list-group-item-action"
                            data-player-index="${index}"
                            role="button"
                            tabindex="0"
                            aria-label="Exibir mapa de calor de ${escapeHtml(playerName)}">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/users/user-dummy-img.jpg"
                                     alt="${escapeHtml(playerName)}"
                                     class="avatar-xs object-fit-cover rounded-circle">
                                <div class="ms-3 flex-grow-1">
                                    <h6 class="fs-14 mb-1">${escapeHtml(playerName)}</h6>
                                    <p class="mb-0 text-muted">${escapeHtml(getPlayerDetails(player))}</p>
                                </div>
                            </div>
                        </li>
                    `;
                }).join("");
            }

            function renderPlayersError(message) {
                const list = document.getElementById("report-players-list");
                if (!list) return;

                list.innerHTML = `
                    <li class="list-group-item py-4 text-center text-danger">
                        <i class="ri-error-warning-line fs-24 d-block mb-2"></i>
                        ${escapeHtml(message)}
                    </li>
                `;
            }

            const playersList = document.getElementById("report-players-list");
            let reportPlayers = [];

            function selectPlayerFromElement(element) {
                const index = Number(element?.dataset?.playerIndex);
                if (!Number.isInteger(index) || !reportPlayers[index]) return;
                applySelectedPlayerPhoto(reportPlayers[index]);
                loadPlayerHeatMap(reportPlayers[index], index);
                renderConfiguredTemplate("mapa_sprints", getPlayerName(reportPlayers[index], index));
                loadSelectedPlayerSprints(reportPlayers[index]);
                try {
                    renderHeatCoordinates(reportPlayers[index]);
                } catch (error) {
                    setTeamMapStatus("Erro na plotagem", "error");
                }
            }

            playersList?.addEventListener("click", function (event) {
                selectPlayerFromElement(event.target.closest("[data-player-index]"));
            });

            playersList?.addEventListener("keydown", function (event) {
                if (event.key !== "Enter" && event.key !== " ") return;
                const item = event.target.closest("[data-player-index]");
                if (!item) return;
                event.preventDefault();
                selectPlayerFromElement(item);
            });

            async function loadReportPlayers() {
                if (!reportNumber) {
                    renderPlayersError("Não foi possível identificar o relatório selecionado.");
                    return;
                }

                const token = getAccessToken();
                if (!token) {
                    renderPlayersError("Sua sessão expirou. Faça login novamente para visualizar os jogadores.");
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/alunos/por-relatorio/${encodeURIComponent(reportNumber)}`, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (response.status === 401) {
                        throw new Error("Sua sessão expirou. Faça login novamente.");
                    }

                    if (!response.ok) {
                        let errorMessage = `Não foi possível carregar os jogadores (erro ${response.status}).`;

                        try {
                            const errorPayload = await response.json();
                            errorMessage = errorPayload?.detail || errorPayload?.message || errorMessage;
                        } catch (error) {
                            // Mantém a mensagem padrão quando a API não retorna JSON.
                        }

                        throw new Error(errorMessage);
                    }

                    reportPlayers = normalizePlayers(await response.json());
                    renderPlayers(reportPlayers);

                    if (!reportPlayers.length) {
                        renderMapMessage("Nenhum jogador disponível para gerar o mapa.", false);
                        setTeamMapStatus("Sem jogadores", "loading");
                    }
                } catch (error) {
                    renderPlayersError(error?.message || "A API está indisponível no momento.");
                    renderMapMessage(error?.message || "Não foi possível carregar os jogadores.", true);
                    setTeamMapStatus("Erro no mapa", "error");
                }
            }

            loadTeamHeatMap();
            loadMapTemplate();
            loadReportPlayerPhotos();
            loadHeatCoordinates();
            loadReportPlayers();
            window.addEventListener("pagehide", function () {
                if (currentMapObjectUrl) URL.revokeObjectURL(currentMapObjectUrl);
            });
        })();

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

