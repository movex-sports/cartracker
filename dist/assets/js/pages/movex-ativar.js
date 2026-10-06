document.addEventListener("DOMContentLoaded", function () {
            const apiBaseUrl = "https://uwbv2-1.onrender.com";
            const studentsEndpoint = `${apiBaseUrl}/alunos/`;
            const gpsEndpoint = `${apiBaseUrl}/relacionar-gps/`;
            const openReportEndpoint = `${apiBaseUrl}/suporte-mapas/relatorios/abrir`;
            const form = document.getElementById("report-wizard-form");
            const reportNameInput = document.getElementById("new-report-name");
            const studentSelect = document.getElementById("report-student-select");
            const studentsStatus = document.getElementById("report-students-status");
            const cameraSelect = document.getElementById("report-camera-select");
            const cameraButton = document.getElementById("report-camera-button");
            const cameraStartButton = document.getElementById("report-camera-start-button");
            const cameraModalElement = document.getElementById("report-camera-modal");
            const cameraModal = bootstrap.Modal.getOrCreateInstance(cameraModalElement);
            const cameraShell = document.getElementById("report-qr-shell");
            const cameraTitle = document.getElementById("report-camera-title");
            const cameraText = document.getElementById("report-camera-text");
            const cameraError = document.getElementById("report-camera-error");
            const qrTokenInput = document.getElementById("report-qr-token");
            const activateButton = document.getElementById("activate-player-button");
            const playersList = document.getElementById("activated-players-list");
            const activatedCount = document.getElementById("activated-count");
            const activationSuccess = document.getElementById("player-activation-success");
            const activationError = document.getElementById("player-activation-error");
            const reviewButton = document.getElementById("review-report-button");
            const reportSuccess = document.getElementById("report-start-success");
            const startReportButton = document.getElementById("start-report-button");
            const progressBar = document.querySelector("#report-progress-bar .progress-bar");
            const tabs = [
                document.getElementById("report-name-tab"),
                document.getElementById("report-players-tab"),
                document.getElementById("report-start-tab")
            ];

            let students = [];
            let gpsTokens = new Set();
            let gpsLoaded = false;
            let activatedPlayers = [];
            let qrScanner = null;
            let scannerRunning = false;
            let qrLocked = false;
            let availableCameras = [];

            function captureTokenFromUrl() {
                const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
                const token = hashParams.get("access_token");
                if (!token) return "";
                localStorage.setItem("movex_access_token", token);
                localStorage.setItem("movex_token_type", "bearer");
                localStorage.setItem("access_token", token);
                window.history?.replaceState(null, document.title, window.location.pathname + window.location.search);
                return token;
            }

            function getAccessToken() {
                return captureTokenFromUrl()
                    || localStorage.getItem("movex_access_token")
                    || sessionStorage.getItem("movex_access_token")
                    || localStorage.getItem("access_token")
                    || sessionStorage.getItem("access_token")
                    || "";
            }

            function normalizeStudents(payload) {
                const list = Array.isArray(payload) ? payload
                    : Array.isArray(payload?.alunos) ? payload.alunos
                    : Array.isArray(payload?.data) ? payload.data
                    : [];

                return list.map(function (student, index) {
                    return {
                        id: student?.aluno_user_id ?? student?.user_id ?? student?.aluno_id ?? student?.id ?? index + 1,
                        name: student?.aluno_nome ?? student?.nome ?? "",
                        lastname: student?.aluno_sobrenome ?? student?.sobrenome ?? "",
                        category: student?.categoria ?? ""
                    };
                });
            }

            function normalizeGpsTokens(payload) {
                const tokens = new Set();
                const tokenFields = new Set([
                    "qr_token",
                    "qrtoken",
                    "gps_token",
                    "gpstoken",
                    "token_qr",
                    "tokenqr"
                ]);

                function visit(value, parentKey) {
                    if (value == null) return;

                    if (typeof value === "string") {
                        if (tokenFields.has(parentKey)) {
                            const token = normalizeGpsToken(value);
                            if (token) tokens.add(token);
                        }
                        return;
                    }

                    if (Array.isArray(value)) {
                        value.forEach(function (item) {
                            if (typeof item === "string") {
                                const token = normalizeGpsToken(item);
                                if (token) tokens.add(token);
                                return;
                            }
                            visit(item, parentKey);
                        });
                        return;
                    }

                    if (typeof value === "object") {
                        Object.entries(value).forEach(function (entry) {
                            const key = entry[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
                            visit(entry[1], key);
                        });
                    }
                }

                visit(payload, "");
                return Array.from(tokens);
            }

            function normalizeGpsToken(value) {
                return String(value || "").trim().toLowerCase();
            }

            function showStep(index) {
                tabs[index].disabled = false;
                bootstrap.Tab.getOrCreateInstance(tabs[index]).show();
                const width = index * 50;
                progressBar.style.width = `${width}%`;
                progressBar.setAttribute("aria-valuenow", String(width));
                tabs.forEach(function (tab, tabIndex) {
                    tab.classList.toggle("done", tabIndex < index);
                });
            }

            async function loadStudents() {
                const token = getAccessToken();
                if (!token) {
                    studentSelect.innerHTML = '<option value="">Sessão não encontrada</option>';
                    studentsStatus.textContent = "Faça login novamente para carregar os alunos.";
                    studentsStatus.className = "form-text text-danger";
                    return;
                }

                try {
                    const response = await fetch(studentsEndpoint, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    const payload = await response.json().catch(function () { return {}; });
                    if (response.status === 401) {
                        throw new Error("Sessão inválida ou expirada. Faça login novamente.");
                    }
                    if (!response.ok) throw new Error(payload?.detail || "Não foi possível carregar os alunos.");

                    students = normalizeStudents(payload);
                    studentSelect.innerHTML = '<option value="">Selecione um aluno</option>';
                    students.forEach(function (student) {
                        const option = document.createElement("option");
                        option.value = student.id;
                        option.textContent = `${student.name} ${student.lastname} — ${student.category || "Sem categoria"}`;
                        studentSelect.appendChild(option);
                    });
                    studentSelect.disabled = !students.length;
                    studentsStatus.textContent = students.length ? `${students.length} aluno(s) disponível(is).` : "Nenhum aluno cadastrado.";
                } catch (error) {
                    studentSelect.innerHTML = '<option value="">Falha ao carregar</option>';
                    studentsStatus.textContent = error.message;
                    studentsStatus.className = "form-text text-danger";
                }
            }

            async function loadGpsTokens() {
                const token = getAccessToken();
                gpsLoaded = false;
                gpsTokens.clear();
                updateActivateButton();

                if (!token) return;

                try {
                    const response = await fetch(gpsEndpoint, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    const payload = await response.json().catch(function () { return {}; });

                    if (response.status === 401 || response.status === 403) {
                        throw new Error("Sessão inválida ou expirada. Faça login novamente.");
                    }
                    if (!response.ok) {
                        throw new Error(payload?.detail || "Não foi possível carregar os GPS disponíveis.");
                    }

                    gpsTokens = new Set(normalizeGpsTokens(payload));
                    gpsLoaded = true;
                    updateActivateButton();
                } catch (error) {
                    activationError.textContent = error.message;
                    activationError.classList.remove("d-none");
                    updateActivateButton();
                }
            }

            function isGpsAvailable(qrToken) {
                return gpsLoaded && gpsTokens.has(normalizeGpsToken(qrToken));
            }

            function validateGpsToken(qrToken) {
                activationError.classList.add("d-none");

                if (!gpsLoaded) {
                    activationError.textContent = "A lista de GPS ainda não foi carregada.";
                    activationError.classList.remove("d-none");
                    return false;
                }

                if (!isGpsAvailable(qrToken)) {
                    activationError.textContent = "Este GPS não pertence ao usuário autenticado.";
                    activationError.classList.remove("d-none");
                    return false;
                }

                return true;
            }

            function updateActivateButton() {
                activateButton.disabled = !(
                    studentSelect.value
                    && qrTokenInput.value.trim()
                    && isGpsAvailable(qrTokenInput.value)
                );
            }

            async function stopCamera() {
                if (!qrScanner || !scannerRunning) return;
                try {
                    await qrScanner.stop();
                } catch (error) {
                    console.warn(error);
                } finally {
                    scannerRunning = false;
                    cameraShell.classList.remove("scanner-active");
                }
            }

            function populateCameras(cameras) {
                cameraSelect.innerHTML = "";
                cameras.forEach(function (camera, index) {
                    const option = document.createElement("option");
                    option.value = camera.id;
                    option.textContent = camera.label || `Câmera ${index + 1}`;
                    cameraSelect.appendChild(option);
                });
                cameraSelect.disabled = cameras.length < 2;
            }

            function onQrRead(decodedText) {
                if (qrLocked || !decodedText) return;
                qrLocked = true;
                qrTokenInput.value = decodedText.trim();
                validateGpsToken(qrTokenInput.value);
                updateActivateButton();
                stopCamera().finally(function () {
                    cameraModal.hide();
                    qrTokenInput.focus();
                });
            }

            async function startCamera() {
                cameraError.classList.add("d-none");
                cameraStartButton.disabled = true;
                cameraStartButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Abrindo...';
                cameraTitle.textContent = "Preparando câmera";
                cameraText.textContent = "Aguarde enquanto o leitor é iniciado.";
                qrLocked = false;

                try {
                    if (!window.isSecureContext && window.location.protocol !== "file:") {
                        throw new Error("A câmera exige HTTPS ou localhost.");
                    }
                    if (!navigator.mediaDevices?.getUserMedia) {
                        throw new Error("Este navegador não disponibilizou acesso à câmera.");
                    }
                    if (!availableCameras.length) {
                        availableCameras = await Html5Qrcode.getCameras();
                        if (!availableCameras.length) throw new Error("Nenhuma câmera encontrada.");
                        populateCameras(availableCameras);
                    }

                    await stopCamera();
                    qrScanner = qrScanner || new Html5Qrcode("report-qr-reader");
                    await qrScanner.start(
                        cameraSelect.value || availableCameras[0].id,
                        {
                            fps: 10,
                            qrbox: function (width, height) {
                                const size = Math.floor(Math.min(width, height) * 0.7);
                                return { width: size, height: size };
                            }
                        },
                        onQrRead,
                        function () {}
                    );
                    scannerRunning = true;
                    cameraShell.classList.add("scanner-active");
                    cameraStartButton.innerHTML = '<i class="ri-refresh-line me-1"></i>Reiniciar câmera';
                } catch (error) {
                    cameraError.textContent = error.message || "Não foi possível abrir a câmera.";
                    cameraError.classList.remove("d-none");
                    cameraTitle.textContent = "Câmera indisponível";
                    cameraText.textContent = "Verifique a permissão do navegador.";
                    cameraStartButton.innerHTML = '<i class="ri-camera-line me-1"></i>Tentar novamente';
                } finally {
                    cameraStartButton.disabled = false;
                }
            }

            function renderActivatedPlayers() {
                activatedCount.textContent = String(activatedPlayers.length);
                reviewButton.disabled = activatedPlayers.length === 0;

                if (!activatedPlayers.length) {
                    playersList.innerHTML = '<div class="text-center text-muted py-5"><i class="ri-user-add-line fs-1 d-block mb-2"></i>Ative o primeiro jogador para iniciar a lista.</div>';
                    return;
                }

                playersList.innerHTML = activatedPlayers.map(function (player, index) {
                    return `
                        <div class="activated-player d-flex align-items-center gap-3 mb-2">
                            <div class="avatar-sm flex-shrink-0">
                                <span class="avatar-title rounded-circle bg-primary-subtle text-primary">${index + 1}</span>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${player.name} ${player.lastname}</h6>
                                <span class="text-muted small">${player.category || "Sem categoria"} · GPS ${player.qrToken}</span>
                            </div>
                            <button type="button" class="btn btn-sm btn-soft-danger remove-player" data-index="${index}" aria-label="Remover jogador">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    `;
                }).join("");
            }

            function renderReview() {
                document.getElementById("review-report-name").textContent = reportNameInput.value.trim();
                document.getElementById("review-players-list").innerHTML = activatedPlayers.map(function (player, index) {
                    return `<div class="d-flex justify-content-between border-bottom py-2"><span>${index + 1}. ${player.name} ${player.lastname}</span><span class="text-muted">${player.category || "Sem categoria"}</span></div>`;
                }).join("");
            }

            document.getElementById("go-to-players-button").addEventListener("click", function () {
                reportNameInput.classList.toggle("is-invalid", !reportNameInput.value.trim());
                if (!reportNameInput.value.trim()) return;
                showStep(1);
            });

            document.getElementById("back-to-name-button").addEventListener("click", function () {
                stopCamera();
                showStep(0);
            });

            document.getElementById("back-to-players-button").addEventListener("click", function () {
                showStep(1);
            });

            reviewButton.addEventListener("click", function () {
                if (!activatedPlayers.length) return;
                stopCamera();
                renderReview();
                showStep(2);
            });

            cameraButton.addEventListener("click", function () {
                cameraModal.show();
            });
            cameraModalElement.addEventListener("shown.bs.modal", startCamera);
            cameraModalElement.addEventListener("hidden.bs.modal", stopCamera);
            cameraStartButton.addEventListener("click", startCamera);
            cameraSelect.addEventListener("change", startCamera);
            studentSelect.addEventListener("change", updateActivateButton);
            qrTokenInput.addEventListener("input", function () {
                qrLocked = false;
                if (qrTokenInput.value.trim()) {
                    validateGpsToken(qrTokenInput.value);
                } else {
                    activationError.classList.add("d-none");
                }
                updateActivateButton();
            });

            activateButton.addEventListener("click", function () {
                const selectedStudent = students.find(function (student) {
                    return String(student.id) === studentSelect.value;
                });
                const qrToken = qrTokenInput.value.trim();
                activationError.classList.add("d-none");

                if (!selectedStudent || !qrToken) return;
                if (!validateGpsToken(qrToken)) return;
                if (activatedPlayers.some(function (player) { return String(player.id) === String(selectedStudent.id); })) {
                    activationError.textContent = "Este jogador já foi ativado neste relatório.";
                    activationError.classList.remove("d-none");
                    return;
                }
                if (activatedPlayers.some(function (player) { return player.qrToken === qrToken; })) {
                    activationError.textContent = "Este GPS já está relacionado a outro jogador.";
                    activationError.classList.remove("d-none");
                    return;
                }

                activatedPlayers.push({ ...selectedStudent, qrToken: qrToken });
                activationSuccess.textContent = `${selectedStudent.name} ${selectedStudent.lastname} foi adicionado ao relatório.`;
                activationSuccess.classList.remove("d-none");
                studentSelect.value = "";
                qrTokenInput.value = "";
                qrLocked = false;
                updateActivateButton();
                renderActivatedPlayers();
            });

            loadGpsTokens();

            playersList.addEventListener("click", function (event) {
                const button = event.target.closest(".remove-player");
                if (!button) return;
                activatedPlayers.splice(Number(button.dataset.index), 1);
                renderActivatedPlayers();
            });

            form.addEventListener("submit", async function (event) {
                event.preventDefault();
                if (!reportNameInput.value.trim() || !activatedPlayers.length) return;

                const token = getAccessToken();
                if (!token) {
                    reportSuccess.className = "alert alert-danger";
                    reportSuccess.textContent = "Sua sessão não foi encontrada. Faça login novamente.";
                    reportSuccess.classList.remove("d-none");
                    return;
                }

                const requestPayload = {
                    nome: reportNameInput.value.trim(),
                    jogadores: activatedPlayers.map(function (player) {
                        return {
                            aluno_user_id: Number(player.id) || player.id,
                            qr_token: player.qrToken
                        };
                    })
                };

                startReportButton.disabled = true;
                startReportButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Iniciando...';
                reportSuccess.classList.add("d-none");

                try {
                    const response = await fetch(openReportEndpoint, {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(requestPayload)
                    });
                    const responsePayload = await response.json().catch(function () {
                        return {};
                    });

                    if (!response.ok) {
                        if (response.status === 401 || response.status === 403) {
                            throw new Error("Sua sessão expirou. Faça login novamente.");
                        }
                        if (response.status === 422) {
                            const validationDetail = Array.isArray(responsePayload?.detail)
                                ? responsePayload.detail.map(function (item) {
                                    const field = Array.isArray(item?.loc) ? item.loc.slice(1).join(".") : "";
                                    return `${field ? `${field}: ` : ""}${item?.msg || "valor inválido"}`;
                                }).join(" ")
                                : "";
                            throw new Error(validationDetail || "Os dados do relatório não foram aceitos. Revise os jogadores e GPS relacionados.");
                        }
                        const apiError = new Error(responsePayload?.detail || responsePayload?.message || "Não foi possível iniciar o relatório.");
                        apiError.status = response.status;
                        throw apiError;
                    }

                    await Swal.fire({
                        title: "Good job!",
                        text: `Relatório “${requestPayload.nome}” iniciado com sucesso`,
                        icon: "success",
                        timer: 4000,
                        timerProgressBar: true,
                        showConfirmButton: false,
                        allowOutsideClick: false,
                        allowEscapeKey: false
                    });

                    window.location.href = "painel.html";
                } catch (error) {
                    if (error?.status === 409) {
                        reportSuccess.classList.add("d-none");
                        await Swal.fire({
                            title: "Erro",
                            text: error.message || "Já existe um relatório aberto.",
                            icon: "error",
                            confirmButtonText: "OK",
                            customClass: {
                                confirmButton: "btn btn-primary w-xs mt-2"
                            },
                            buttonsStyling: false,
                            footer: '<span class="text-muted">Finalize o relatório atual antes de iniciar um novo.</span>',
                            showCloseButton: true
                        });
                    } else {
                        reportSuccess.className = "alert alert-danger";
                        reportSuccess.textContent = error.message || "Não foi possível iniciar o relatório.";
                        reportSuccess.classList.remove("d-none");
                    }
                    startReportButton.disabled = false;
                } finally {
                    startReportButton.innerHTML = '<i class="ri-play-circle-line me-1 align-bottom"></i>Iniciar relatório';
                }
            });

            window.addEventListener("pagehide", stopCamera);
            loadStudents();
            renderActivatedPlayers();
        });

