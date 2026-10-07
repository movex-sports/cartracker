(function () {
    "use strict";

    var apiBaseUrl = "https://cartracker-api.onrender.com";
    var rentersEndpoint = apiBaseUrl + "/locatarios";
    var vehiclesEndpoint = apiBaseUrl + "/veiculos";
    var vehicles = [];
    var renters = [];

    function getAccessToken() {
        return sessionStorage.getItem("movex_access_token") || sessionStorage.getItem("access_token") || "";
    }

    function clearSessionAndRedirect() {
        ["movex_access_token", "access_token", "movex_token_type", "movex_token_expires_at", "movex_user"].forEach(function (key) {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
        window.location.replace("signin.html");
    }

    async function fetchWithAuthentication(url, options) {
        var token = getAccessToken();
        if (!token) {
            clearSessionAndRedirect();
            throw new Error("Sessão não encontrada.");
        }

        var requestOptions = options || {};
        requestOptions.headers = Object.assign({}, requestOptions.headers, {
            "Accept": "application/json",
            "Authorization": "Bearer " + token
        });
        var response = await fetch(url, requestOptions);
        if (response.status === 401) {
            clearSessionAndRedirect();
            throw new Error("Sessão expirada.");
        }
        return response;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character];
        });
    }

    function apiError(data, fallback) {
        if (typeof data?.detail === "string") return data.detail;
        if (Array.isArray(data?.detail)) return data.detail.map(function (item) { return item.msg || item.message; }).filter(Boolean).join(" ");
        return data?.message || fallback;
    }

    function formatCpf(value) {
        var digits = String(value || "").replace(/\D/g, "").slice(0, 11);
        return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    function formatZip(value) {
        var digits = String(value || "").replace(/\D/g, "").slice(0, 8);
        return digits.replace(/(\d{5})(\d)/, "$1-$2");
    }

    function vehicleLabel(vehicle) {
        return [vehicle.marca, vehicle.modelo].filter(Boolean).join(" ") + (vehicle.placa ? " — " + vehicle.placa : "");
    }

    document.addEventListener("DOMContentLoaded", function () {
        var table = document.getElementById("students-table");
        var tableBody = table?.querySelector("tbody");
        var tableSource = document.getElementById("students-table-source");
        var primaryColumn = document.getElementById("students-primary-column");
        var statsColumn = document.getElementById("students-stats-column");
        var modalElement = document.getElementById("studentWizardModal");
        var form = document.getElementById("student-wizard-form");
        var vehicleSelect = document.getElementById("tenant-vehicle-input");
        var cpfInput = document.getElementById("tenant-cpf-input");
        var zipInput = document.getElementById("tenant-zip-input");
        var reviewButton = document.getElementById("student-review-btn");
        var backButton = document.getElementById("student-back-btn");
        var submitButton = document.getElementById("student-submit-btn");
        var submitError = document.getElementById("student-submit-error");
        var dataTab = document.getElementById("student-data-tab");
        var reviewTab = document.getElementById("student-review-tab");
        var successTab = document.getElementById("student-success-tab");
        var progressBar = document.querySelector("#student-progress-bar .progress-bar");

        if (!table || !tableBody || !form || !modalElement) return;

        if (primaryColumn) primaryColumn.style.display = "none";
        if (statsColumn) statsColumn.style.display = "none";
        if (tableSource) {
            tableSource.classList.remove("col-xxl-8");
            tableSource.classList.add("col-12");
        }

        var headerActions = document.getElementById("open-student-wizard-btn")?.parentElement;
        var inactiveFilter = document.createElement("div");
        inactiveFilter.className = "form-check form-switch d-flex align-items-center gap-2 mb-0 me-2";
        inactiveFilter.innerHTML = `
            <input class="form-check-input mt-0" type="checkbox" role="switch" id="show-inactive-renters">
            <label class="form-check-label text-nowrap mb-0" for="show-inactive-renters">Mostrar inativos</label>`;
        if (headerActions) {
            headerActions.classList.add("align-items-center", "flex-wrap", "justify-content-end");
            headerActions.insertBefore(inactiveFilter, headerActions.firstChild);
        }
        var inactiveToggle = document.getElementById("show-inactive-renters");

        table.querySelector("thead").innerHTML = `
            <tr>
                <th scope="col">Locatário</th>
                <th scope="col">CPF</th>
                <th scope="col">Veículo</th>
                <th scope="col">Endereço</th>
                <th scope="col">Cidade/UF</th>
                <th scope="col">CEP</th>
                <th scope="col">Status</th>
                <th scope="col" class="text-end">Ações</th>
            </tr>`;

        var tableAlert = document.createElement("div");
        tableAlert.className = "alert d-none mx-3 mt-3 mb-0";
        tableAlert.setAttribute("role", "alert");
        table.parentElement.parentElement.insertBefore(tableAlert, table.parentElement);

        function renderMessage(message, error) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5 ${error ? "text-danger" : "text-muted"}">${escapeHtml(message)}</td></tr>`;
        }

        function showTableAlert(message, error) {
            tableAlert.textContent = message;
            tableAlert.className = "alert mx-3 mt-3 mb-0 " + (error ? "alert-danger" : "alert-success");
            window.setTimeout(function () { tableAlert.classList.add("d-none"); }, 6000);
        }

        function populateVehicleSelect() {
            vehicleSelect.innerHTML = "";
            vehicleSelect.append(new Option(vehicles.length ? "Selecione o veículo" : "Nenhum veículo cadastrado", ""));
            vehicles.forEach(function (vehicle) {
                vehicleSelect.append(new Option(vehicleLabel(vehicle), String(vehicle.veiculo_id)));
            });
            vehicleSelect.disabled = !vehicles.length;
        }

        function getVehicleById(id) {
            return vehicles.find(function (vehicle) { return String(vehicle.veiculo_id) === String(id); });
        }

        function renderRenters(renters) {
            if (!renters.length) {
                renderMessage(inactiveToggle.checked ? "Nenhum locatário cadastrado." : "Nenhum locatário ativo.", false);
                return;
            }

            tableBody.innerHTML = renters.map(function (renter) {
                var vehicle = getVehicleById(renter.veiculo_id);
                var address = [renter.locatario_rua, renter.locatario_numero, renter.locatario_bairro].filter(Boolean).join(", ");
                var city = [renter.locatario_cidade, renter.locatario_estado].filter(Boolean).join("/");
                var isActive = renter.status !== false;
                var fullName = [renter.locatario_nome, renter.locatario_sobrenome].filter(Boolean).join(" ");
                return `<tr>
                    <td><div class="d-flex align-items-center gap-2"><span class="avatar-xs rounded-circle ${isActive ? "bg-primary-subtle text-primary" : "bg-light text-muted"} d-inline-flex align-items-center justify-content-center"><i class="ri-user-line"></i></span><strong>${escapeHtml(fullName)}</strong></div></td>
                    <td>${escapeHtml(formatCpf(renter.locatario_cpf))}</td>
                    <td>${escapeHtml(isActive ? (vehicle ? vehicleLabel(vehicle) : (renter.veiculo_id ? "Veículo #" + renter.veiculo_id : "Sem veículo")) : "Veículo liberado")}</td>
                    <td class="text-wrap">${escapeHtml(address || "—")}</td>
                    <td>${escapeHtml(city || "—")}</td>
                    <td>${escapeHtml(formatZip(renter.locatario_cep))}</td>
                    <td><span class="badge ${isActive ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}">${isActive ? "Ativo" : "Inativo"}</span></td>
                    <td class="text-end">${isActive ? `<button type="button" class="btn btn-sm btn-soft-danger renter-deactivate-btn" data-renter-id="${escapeHtml(renter.locatario_id)}" data-renter-name="${escapeHtml(fullName)}" title="Desativar locatário" aria-label="Desativar ${escapeHtml(fullName)}"><i class="ri-user-unfollow-line me-1"></i>Desativar</button>` : '<span class="text-muted fs-12">Desativado</span>'}</td>
                </tr>`;
            }).join("");
        }

        function applyStatusFilter() {
            var visibleRenters = inactiveToggle.checked
                ? renters
                : renters.filter(function (renter) { return renter.status !== false; });
            renderRenters(visibleRenters);
        }

        inactiveToggle.addEventListener("change", applyStatusFilter);

        tableBody.addEventListener("click", async function (event) {
            var button = event.target.closest(".renter-deactivate-btn");
            if (!button) return;

            var renterName = button.dataset.renterName || "este locatário";
            var confirmed = window.confirm(
                "Desativar " + renterName + "?\n\nO veículo vinculado deixará de ser responsabilidade deste locatário e ficará livre para uma nova atribuição."
            );
            if (!confirmed) return;

            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Desativando...';

            try {
                var response = await fetchWithAuthentication(
                    rentersEndpoint + "/" + encodeURIComponent(button.dataset.renterId) + "/desativar",
                    { method: "PATCH" }
                );
                var data = await response.json().catch(function () { return {}; });
                if (!response.ok) {
                    var fallback = response.status === 404
                        ? "Locatário não encontrado ou não pertence à sua empresa."
                        : "Não foi possível desativar o locatário.";
                    throw new Error(apiError(data, fallback));
                }
                await loadData();
                showTableAlert("Locatário desativado e veículo liberado com sucesso.", false);
            } catch (error) {
                showTableAlert(error.message || "Não foi possível desativar o locatário.", true);
                button.disabled = false;
                button.innerHTML = '<i class="ri-user-unfollow-line me-1"></i>Desativar';
            }
        });

        async function loadData() {
            renderMessage("Carregando locatários...", false);
            try {
                var responses = await Promise.all([
                    fetchWithAuthentication(vehiclesEndpoint, { method: "GET" }),
                    fetchWithAuthentication(rentersEndpoint, { method: "GET" })
                ]);
                var vehicleData = await responses[0].json().catch(function () { return []; });
                var renterData = await responses[1].json().catch(function () { return []; });
                if (!responses[0].ok) throw new Error(apiError(vehicleData, "Não foi possível carregar os veículos."));
                if (!responses[1].ok) throw new Error(apiError(renterData, "Não foi possível carregar os locatários."));
                vehicles = Array.isArray(vehicleData) ? vehicleData : [];
                populateVehicleSelect();
                renters = Array.isArray(renterData) ? renterData : [];
                applyStatusFilter();
            } catch (error) {
                renderMessage(error.message || "Não foi possível carregar os locatários.", true);
            }
        }

        function getPayload() {
            return {
                locatario_nome: document.getElementById("tenant-first-name-input").value.trim(),
                locatario_sobrenome: document.getElementById("tenant-last-name-input").value.trim(),
                locatario_cpf: cpfInput.value.trim(),
                locatario_rua: document.getElementById("tenant-street-input").value.trim(),
                locatario_numero: document.getElementById("tenant-number-input").value.trim(),
                locatario_cep: zipInput.value.trim(),
                locatario_bairro: document.getElementById("tenant-neighborhood-input").value.trim(),
                locatario_cidade: document.getElementById("tenant-city-input").value.trim(),
                locatario_estado: document.getElementById("tenant-state-input").value.trim().toUpperCase()
            };
        }

        function setStep(tab, step) {
            tab.disabled = false;
            bootstrap.Tab.getOrCreateInstance(tab).show();
            var width = step === 1 ? 0 : step === 2 ? 50 : 100;
            progressBar.style.width = width + "%";
            progressBar.setAttribute("aria-valuenow", String(width));
        }

        function fillReview(payload) {
            document.getElementById("tenant-review-vehicle").textContent = vehicleSelect.options[vehicleSelect.selectedIndex]?.text || "—";
            document.getElementById("tenant-review-name").textContent = payload.locatario_nome + " " + payload.locatario_sobrenome;
            document.getElementById("tenant-review-cpf").textContent = payload.locatario_cpf;
            document.getElementById("tenant-review-address").textContent = payload.locatario_rua + ", " + payload.locatario_numero;
            document.getElementById("tenant-review-neighborhood").textContent = payload.locatario_bairro;
            document.getElementById("tenant-review-city").textContent = payload.locatario_cidade + "/" + payload.locatario_estado;
            document.getElementById("tenant-review-zip").textContent = payload.locatario_cep;
        }

        function resetForm() {
            form.reset();
            form.classList.remove("was-validated");
            reviewTab.disabled = true;
            successTab.disabled = true;
            submitError.classList.add("d-none");
            submitError.textContent = "";
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="ri-user-add-line label-icon align-middle fs-16 ms-2"></i>Registrar locatário';
            setStep(dataTab, 1);
        }

        cpfInput.addEventListener("input", function () { cpfInput.value = formatCpf(cpfInput.value); });
        zipInput.addEventListener("input", function () { zipInput.value = formatZip(zipInput.value); });

        reviewButton.addEventListener("click", function () {
            form.classList.add("was-validated");
            if (!form.checkValidity()) return;
            fillReview(getPayload());
            form.classList.remove("was-validated");
            setStep(reviewTab, 2);
        });

        backButton.addEventListener("click", function () { setStep(dataTab, 1); });

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            if (!form.checkValidity() || !vehicleSelect.value) return;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
            submitError.classList.add("d-none");

            try {
                var endpoint = apiBaseUrl + "/veiculos/" + encodeURIComponent(vehicleSelect.value) + "/locatarios";
                var response = await fetchWithAuthentication(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(getPayload())
                });
                var data = await response.json().catch(function () { return {}; });
                if (!response.ok) throw new Error(apiError(data, "Não foi possível cadastrar o locatário."));
                await loadData();
                setStep(successTab, 3);
            } catch (error) {
                submitError.textContent = error.message || "Não foi possível cadastrar o locatário.";
                submitError.classList.remove("d-none");
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="ri-user-add-line label-icon align-middle fs-16 ms-2"></i>Registrar locatário';
            }
        });

        modalElement.addEventListener("hidden.bs.modal", resetForm);
        Promise.resolve(window.movexSessionReady).then(function (ready) {
            if (ready !== false) loadData();
        });
    });
})();
