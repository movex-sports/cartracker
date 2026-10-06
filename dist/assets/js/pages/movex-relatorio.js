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

            async function loadPlayerSprintMap(player, index) {
                const requestSequence = ++sprintsRequestSequence;
                const playerId = player?.aluno_user_id ?? player?.user_id ?? player?.aluno_id ?? player?.id;
                const playerName = getPlayerName(player, index);
                const sprintMap = window.MovexSprintMap;

                if (!sprintMap) return;
                sprintMap.clear();

                if (!reportNumber || !playerId) {
                    sprintMap.setState(
                        "Dados incompletos",
                        "error",
                        "Nao foi possivel identificar o relatorio ou o jogador."
                    );
                    return;
                }

                const token = getAccessToken();
                if (!token) {
                    sprintMap.setState(
                        "Nao autenticado",
                        "error",
                        "Sua sessao expirou. Faca login novamente."
                    );
                    return;
                }

                sprintMap.setState(
                    "Carregando...",
                    "waiting",
                    `Buscando coordenadas de sprints de ${playerName}...`
                );

                try {
                    const query = new URLSearchParams({
                        relatorio_number: reportNumber,
                        aluno_user_id: String(playerId)
                    });
                    const response = await fetch(`${API_BASE_URL}/mapa-calor/coordenadas-sprints?${query}`, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    const payload = await response.json().catch(function () { return null; });

                    if (response.status === 401 || response.status === 403) {
                        throw new Error("Sua sessao expirou. Faca login novamente.");
                    }

                    if (!response.ok) {
                        const fallback = `Nao foi possivel carregar as coordenadas (erro ${response.status}).`;
                        throw new Error(formatApiErrorMessage(payload, fallback));
                    }

                    if (requestSequence !== sprintsRequestSequence) return;
                    if (!sprintMap.render(payload || {})) {
                        throw new Error("A API nao retornou dimensoes validas para o campo.");
                    }
                } catch (error) {
                    if (requestSequence !== sprintsRequestSequence) return;
                    sprintMap.clear();
                    sprintMap.setState(
                        "Erro no mapa",
                        "error",
                        error?.message || "Nao foi possivel carregar o mapa de sprints."
                    );
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
                    const playerId = player?.aluno_user_id ?? player?.user_id ?? player?.aluno_id ?? player?.id ?? index + 1;
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
                                <div>
                                    <span class="badge bg-primary-subtle text-primary">ID ${escapeHtml(playerId)}</span>
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
                loadPlayerHeatMap(reportPlayers[index], index);
                loadPlayerSprintMap(reportPlayers[index], index);
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

