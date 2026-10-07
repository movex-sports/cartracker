(function () {
    "use strict";

    var apiBaseUrl = "https://cartracker-api.onrender.com";
    var endpoint = apiBaseUrl + "/users/dependentes";

    function getToken() { return sessionStorage.getItem("movex_access_token") || sessionStorage.getItem("access_token") || ""; }
    function escapeHtml(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]; }); }
    function formatCpf(value) { return String(value || "").replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
    function formatCep(value) { return String(value || "").replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); }
    function apiError(data, fallback) { if (typeof data.detail === "string") return data.detail; if (Array.isArray(data.detail)) return data.detail.map(function (x) { return x.msg; }).filter(Boolean).join(" "); return fallback; }

    function logout() {
        ["movex_access_token", "access_token", "movex_token_type", "movex_token_expires_at", "movex_user"].forEach(function (key) { sessionStorage.removeItem(key); localStorage.removeItem(key); });
        window.location.replace("signin.html");
    }

    async function request(url, options) {
        var response = await fetch(url, Object.assign({}, options || {}, { headers: Object.assign({}, (options || {}).headers, { "Accept": "application/json", "Authorization": "Bearer " + getToken() }) }));
        if (response.status === 401) logout();
        return response;
    }

    document.addEventListener("DOMContentLoaded", function () {
        var table = document.getElementById("students-table");
        var body = table && table.querySelector("tbody");
        var modal = document.getElementById("studentWizardModal");
        var form = document.getElementById("student-wizard-form");
        if (!table || !body || !modal || !form) return;

        ["students-primary-column", "students-stats-column"].forEach(function (id) { var el = document.getElementById(id); if (el) el.remove(); });
        var source = document.getElementById("students-table-source");
        if (source) { source.className = "col-12"; }
        var pageHeading = source && source.querySelector(".card-title");
        if (pageHeading) pageHeading.textContent = "Usuários da empresa";
        var openButton = document.getElementById("open-student-wizard-btn");
        if (openButton) openButton.innerHTML = '<i class="ri-user-add-line align-bottom me-1"></i> Criar novo usuário';
        var modalTitle = document.getElementById("studentWizardModalLabel");
        if (modalTitle) modalTitle.textContent = "Criar novo usuário";

        table.querySelector("thead").innerHTML = '<tr><th>Usuário</th><th>CPF</th><th>E-mail</th><th>Contato</th><th>Cidade/UF</th><th>Status</th><th class="text-end">Ações</th></tr>';
        var tableAlert = document.createElement("div");
        tableAlert.className = "alert d-none mx-3 mt-3 mb-0";
        tableAlert.setAttribute("role", "alert");
        table.parentElement.parentElement.insertBefore(tableAlert, table.parentElement);
        document.getElementById("student-data-pane").innerHTML = `
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Nome</label><input id="user-first-name" class="form-control" required maxlength="100"></div>
                <div class="col-md-6"><label class="form-label">Sobrenome</label><input id="user-last-name" class="form-control" required maxlength="150"></div>
                <div class="col-md-6"><label class="form-label">CPF</label><input id="user-cpf" class="form-control" required inputmode="numeric"></div>
                <div class="col-md-6"><label class="form-label">E-mail</label><input id="user-email" type="email" class="form-control" required></div>
                <div class="col-md-8"><label class="form-label">Rua</label><input id="user-street" class="form-control" required></div>
                <div class="col-md-4"><label class="form-label">Número</label><input id="user-number" class="form-control" required></div>
                <div class="col-md-4"><label class="form-label">CEP</label><input id="user-cep" class="form-control" required inputmode="numeric"></div>
                <div class="col-md-8"><label class="form-label">Bairro</label><input id="user-neighborhood" class="form-control" required></div>
                <div class="col-md-8"><label class="form-label">Cidade</label><input id="user-city" class="form-control" required></div>
                <div class="col-md-4"><label class="form-label">Estado</label><input id="user-state" class="form-control text-uppercase" required maxlength="2" pattern="[A-Za-z]{2}"></div>
                <div class="col-md-6"><label class="form-label">Contato</label><input id="user-contact" class="form-control" required maxlength="20"></div>
                <div class="col-md-6"><label class="form-label">Nome de usuário</label><input id="user-username" class="form-control" required minlength="3" pattern="[A-Za-z0-9._-]+"></div>
                <div class="col-12"><label class="form-label">Senha</label><input id="user-password" type="password" class="form-control" required minlength="8" maxlength="72" autocomplete="new-password"><div class="form-text">Use pelo menos 8 caracteres.</div></div>
            </div><div class="d-flex justify-content-end mt-4"><button type="button" class="btn btn-success" id="student-review-btn">Revisar cadastro <i class="ri-arrow-right-line ms-1"></i></button></div>`;
        document.getElementById("student-review-pane").innerHTML = `
            <h5 class="mb-3">Confirme os dados</h5><div class="border rounded p-3 bg-light"><dl class="row mb-0" id="user-review"></dl></div>
            <div class="alert alert-danger mt-3 d-none" id="student-submit-error"></div>
            <div class="d-flex mt-4"><button type="button" class="btn btn-light" id="student-back-btn"><i class="ri-arrow-left-line me-1"></i> Voltar</button><button type="submit" class="btn btn-success ms-auto" id="student-submit-btn">Criar usuário</button></div>`;
        document.getElementById("student-success-pane").innerHTML = '<div class="text-center py-4"><i class="ri-checkbox-circle-fill text-success display-4"></i><h4 class="mt-3">Usuário criado!</h4><p class="text-muted">O novo acesso já pode ser utilizado.</p><button type="button" class="btn btn-success" data-bs-dismiss="modal">Concluir</button></div>';

        var dataTab = document.getElementById("student-data-tab"), reviewTab = document.getElementById("student-review-tab"), successTab = document.getElementById("student-success-tab");
        var cpf = document.getElementById("user-cpf"), cep = document.getElementById("user-cep"), errorBox = document.getElementById("student-submit-error"), submit = document.getElementById("student-submit-btn");
        function value(id) { return document.getElementById(id).value.trim(); }
        function payload() { return { nome:value("user-first-name"), sobrenome:value("user-last-name"), cpf:value("user-cpf"), email:value("user-email"), rua:value("user-street"), numero:value("user-number"), cep:value("user-cep"), bairro:value("user-neighborhood"), cidade:value("user-city"), estado:value("user-state").toUpperCase(), contato:value("user-contact"), username:value("user-username"), senha:value("user-password") }; }
        function step(tab) { tab.disabled = false; bootstrap.Tab.getOrCreateInstance(tab).show(); }
        function message(text, danger) { body.innerHTML = '<tr><td colspan="7" class="text-center py-5 ' + (danger ? "text-danger" : "text-muted") + '">' + escapeHtml(text) + '</td></tr>'; }
        function showTableAlert(text, danger) {
            tableAlert.textContent = text;
            tableAlert.className = "alert mx-3 mt-3 mb-0 " + (danger ? "alert-danger" : "alert-success");
            window.setTimeout(function () { tableAlert.classList.add("d-none"); }, 5000);
        }
        function render(users) { if (!users.length) return message("Nenhum usuário adicional cadastrado.", false); body.innerHTML = users.map(function (user) { var city = [user.cidade, user.estado].filter(Boolean).join("/"); var fullName = user.nome + " " + user.sobrenome; return '<tr><td><strong>' + escapeHtml(fullName) + '</strong><div class="text-muted fs-12">@' + escapeHtml(user.username) + '</div></td><td>' + escapeHtml(formatCpf(user.cpf)) + '</td><td>' + escapeHtml(user.email) + '</td><td>' + escapeHtml(user.contato) + '</td><td>' + escapeHtml(city) + '</td><td><span class="badge ' + (user.status ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger") + '">' + (user.status ? "Ativo" : "Inativo") + '</span></td><td class="text-end"><button type="button" class="btn btn-sm btn-soft-danger user-delete-btn" data-user-id="' + escapeHtml(user.user_id) + '" data-user-name="' + escapeHtml(fullName) + '" title="Excluir usuário" aria-label="Excluir ' + escapeHtml(fullName) + '"><i class="ri-delete-bin-line"></i></button></td></tr>'; }).join(""); }
        async function load() { message("Carregando usuários...", false); try { var response = await request(endpoint, { method:"GET" }); var data = await response.json().catch(function () { return []; }); if (!response.ok) throw new Error(apiError(data, "Não foi possível carregar os usuários.")); render(Array.isArray(data) ? data : []); } catch (error) { message(error.message, true); } }

        body.addEventListener("click", async function (event) {
            var button = event.target.closest(".user-delete-btn");
            if (!button) return;
            var userName = button.dataset.userName || "este usuário";
            if (!window.confirm("Excluir o acesso de " + userName + "? Esta ação não pode ser desfeita.")) return;

            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>';
            try {
                var response = await request(endpoint + "/" + encodeURIComponent(button.dataset.userId), { method: "DELETE" });
                if (!response.ok) {
                    var data = await response.json().catch(function () { return {}; });
                    var fallback = response.status === 403
                        ? "Apenas o usuário principal pode excluir acessos."
                        : response.status === 404
                            ? "Usuário não encontrado ou não pertence à sua empresa."
                            : response.status === 409
                                ? "Este usuário possui registros vinculados e não pode ser excluído."
                                : "Não foi possível excluir o usuário.";
                    throw new Error(apiError(data, fallback));
                }
                await load();
                showTableAlert("Usuário excluído com sucesso.", false);
            } catch (error) {
                showTableAlert(error.message || "Não foi possível excluir o usuário.", true);
                button.disabled = false;
                button.innerHTML = '<i class="ri-delete-bin-line"></i>';
            }
        });

        cpf.addEventListener("input", function () { cpf.value = formatCpf(cpf.value); });
        cep.addEventListener("input", function () { cep.value = formatCep(cep.value); });
        document.getElementById("student-review-btn").addEventListener("click", function () { form.classList.add("was-validated"); if (!form.checkValidity()) return; var p = payload(); document.getElementById("user-review").innerHTML = Object.entries({ Nome:p.nome+" "+p.sobrenome, CPF:p.cpf, "E-mail":p.email, Contato:p.contato, Usuário:p.username, Endereço:p.rua+", "+p.numero+" — "+p.bairro+", "+p.cidade+"/"+p.estado+" — "+p.cep }).map(function (entry) { return '<dt class="col-sm-3">'+escapeHtml(entry[0])+'</dt><dd class="col-sm-9">'+escapeHtml(entry[1])+'</dd>'; }).join(""); step(reviewTab); });
        document.getElementById("student-back-btn").addEventListener("click", function () { step(dataTab); });
        form.addEventListener("submit", async function (event) { event.preventDefault(); submit.disabled = true; errorBox.classList.add("d-none"); try { var response = await request(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload()) }); var data = await response.json().catch(function () { return {}; }); if (!response.ok) throw new Error(apiError(data, response.status === 409 ? "CPF, e-mail ou usuário já cadastrado." : "Não foi possível criar o usuário.")); await load(); step(successTab); } catch (error) { errorBox.textContent = error.message; errorBox.classList.remove("d-none"); } finally { submit.disabled = false; } });
        modal.addEventListener("hidden.bs.modal", function () { form.reset(); form.classList.remove("was-validated"); reviewTab.disabled = true; successTab.disabled = true; step(dataTab); });
        Promise.resolve(window.movexSessionReady).then(function (ready) { if (ready !== false) load(); });
    });
})();
