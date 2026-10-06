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

(function () {
    const STUDENTS_ENDPOINT = "https://uwbv2-1.onrender.com/alunos/";
    const input = document.getElementById("athlete-search-input");
    const results = document.getElementById("athlete-search-results");
    const clearButton = document.getElementById("athlete-search-clear");
    const help = document.getElementById("athlete-search-help");
    const speedChartStatus = document.getElementById("athlete-speed-chart-status");
    const speedChartDescription = document.getElementById("athlete-speed-chart-description");
    const sprintsChartStatus = document.getElementById("athlete-sprints-chart-status");
    const sprintsChartDescription = document.getElementById("athlete-sprints-chart-description");
    if (!input || !results || !clearButton || !help) return;

    let athletes = [];
    let filteredAthletes = [];
    let activeIndex = -1;
    let selectedAthlete = null;
    let loadingMessage = "";
    let speedRequestId = 0;
    let sprintsRequestId = 0;

    function getAccessToken() {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const tokenFromUrl = hashParams.get("access_token") || "";

        if (tokenFromUrl) {
            localStorage.setItem("movex_access_token", tokenFromUrl);
            localStorage.setItem("movex_token_type", "bearer");
            localStorage.setItem("access_token", tokenFromUrl);
            if (window.history?.replaceState) {
                window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
            }
        }

        return tokenFromUrl
            || localStorage.getItem("movex_access_token")
            || sessionStorage.getItem("movex_access_token")
            || localStorage.getItem("access_token")
            || sessionStorage.getItem("access_token")
            || "";
    }

    function normalizeAthlete(item, index) {
        const athlete = item?.aluno || item?.jogador || item?.athlete || item?.player || item || {};
        const firstName = athlete.aluno_nome ?? athlete.nome ?? athlete.name ?? athlete.first_name ?? "";
        const lastName = athlete.aluno_sobrenome ?? athlete.sobrenome ?? athlete.lastname ?? athlete.last_name ?? "";
        return {
            id: athlete.aluno_user_id ?? athlete.user_id ?? athlete.aluno_id ?? athlete.jogador_id ?? athlete.id ?? index,
            name: `${firstName} ${lastName}`.trim(),
            subtitle: athlete.posicao ?? athlete.position ?? athlete.categoria ?? athlete.category ?? "",
            raw: item
        };
    }

    function closeResults() {
        results.classList.add("d-none");
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        activeIndex = -1;
    }

    function renderResults() {
        const query = input.value.trim().toLocaleLowerCase("pt-BR");
        filteredAthletes = athletes.filter(function (athlete) {
            return !query || athlete.name.toLocaleLowerCase("pt-BR").includes(query);
        }).slice(0, 20);

        if (loadingMessage) {
            results.innerHTML = `<div class="px-3 py-3 text-muted">${loadingMessage}</div>`;
        } else if (!athletes.length) {
            results.innerHTML = '<div class="px-3 py-3 text-muted"><i class="ri-information-line me-1"></i>Nenhum jogador cadastrado.</div>';
        } else if (!filteredAthletes.length) {
            results.innerHTML = '<div class="px-3 py-3 text-muted">Nenhum jogador encontrado.</div>';
        } else {
            results.innerHTML = filteredAthletes.map(function (athlete, index) {
                const subtitle = athlete.subtitle ? `<small class="text-muted d-block">${escapeHtml(athlete.subtitle)}</small>` : "";
                return `<button type="button" class="athlete-search-option" id="athlete-search-option-${index}" role="option" data-index="${index}" aria-selected="false"><i class="ri-user-3-line fs-18"></i><span><span class="fw-medium">${escapeHtml(athlete.name)}</span>${subtitle}</span></button>`;
            }).join("");
        }

        results.classList.remove("d-none");
        input.setAttribute("aria-expanded", "true");
    }

    function escapeHtml(value) {
        const element = document.createElement("span");
        element.textContent = String(value ?? "");
        return element.innerHTML;
    }

    function selectAthlete(athlete) {
        selectedAthlete = athlete;
        input.value = athlete.name;
        clearButton.classList.remove("d-none");
        help.textContent = athlete.subtitle ? `Selecionado: ${athlete.name} · ${athlete.subtitle}` : `Selecionado: ${athlete.name}`;
        closeResults();
        input.dispatchEvent(new CustomEvent("athlete:selected", {
            bubbles: true,
            detail: { id: athlete.id, name: athlete.name, athlete: athlete.raw }
        }));
        loadAthleteSpeeds(athlete.raw);
        loadAthleteSprints(athlete.raw);
    }

    function setSpeedChartStatus(message, type) {
        if (!speedChartStatus) return;
        speedChartStatus.textContent = message;
        speedChartStatus.className = `badge bg-${type}-subtle text-${type}`;
    }

    function setSprintsChartStatus(message, type) {
        if (!sprintsChartStatus) return;
        sprintsChartStatus.textContent = message;
        sprintsChartStatus.className = `badge bg-${type}-subtle text-${type}`;
    }

    function getSprintsHistory(payload) {
        const candidates = [payload?.historico, payload?.historico_por_relatorio, payload?.relatorios,
            payload?.jogos, payload?.dados, payload?.results, payload?.items, payload?.data];
        return candidates.find(Array.isArray) || [];
    }

    function getSprintZoneValue(item, key) {
        const values = item?.sprints || item?.zonas || item?.totais || item || {};
        const aliases = {
            "0_40_referencia": ["0_40_referencia", "sprints_realizados_0_40_referencia"],
            "41_60_referencia": ["41_60_referencia", "sprints_realizados_41_60_referencia"],
            "61_80_referencia": ["61_80_referencia", "sprints_realizados_61_80_referencia"],
            "81_90_referencia": ["81_90_referencia", "sprints_realizados_81_90_referencia"],
            "90_100_referencia": ["90_100_referencia", "91_100_referencia", "sprints_realizados_90_100_referencia"]
        };
        const matchedKey = aliases[key].find(function (alias) { return values[alias] !== undefined && values[alias] !== null; });
        const number = Number(matchedKey ? values[matchedKey] : 0);
        return Number.isFinite(number) ? number : 0;
    }

    async function loadAthleteSprints(rawAthlete) {
        const requestId = ++sprintsRequestId;
        const athlete = rawAthlete?.aluno || rawAthlete?.jogador || rawAthlete?.athlete || rawAthlete?.player || rawAthlete || {};
        const userId = athlete.aluno_user_id ?? athlete.user_id ?? rawAthlete?.aluno_user_id ?? rawAthlete?.user_id;

        if (!userId) {
            setSprintsChartStatus("ID indisponível", "danger");
            if (sprintsChartDescription) sprintsChartDescription.textContent = "O jogador selecionado não possui aluno_user_id.";
            return;
        }

        setSprintsChartStatus("Carregando...", "warning");
        if (sprintsChartDescription) sprintsChartDescription.textContent = "Buscando os sprints por zona do jogador...";

        try {
            const response = await fetch(`https://uwbv2-1.onrender.com/alunos/${encodeURIComponent(userId)}/sprints-zonas`, {
                method: "GET",
                headers: { "Accept": "application/json", "Authorization": `Bearer ${getAccessToken()}` }
            });
            const payload = await response.json().catch(function () { return {}; });
            if (!response.ok) {
                const detail = payload?.detail || payload?.message;
                throw new Error(typeof detail === "string" ? detail : `Não foi possível carregar os sprints (erro ${response.status}).`);
            }
            if (requestId !== sprintsRequestId) return;

            const apiHistory = getSprintsHistory(payload);
            const history = apiHistory.length ? apiHistory : payload?.totais ? [{ nome: "Total", sprints: payload.totais }] : [];
            const zones = [
                { name: "0-40%", key: "0_40_referencia" },
                { name: "41-60%", key: "41_60_referencia" },
                { name: "61-80%", key: "61_80_referencia" },
                { name: "81-90%", key: "81_90_referencia" },
                { name: "91-100%", key: "90_100_referencia" }
            ];
            const series = zones.map(function (zone) {
                return {
                    name: zone.name,
                    data: history.map(function (item) { return getSprintZoneValue(item, zone.key); })
                };
            });
            const totalsValues = Object.values(payload?.totais || {});
            const totalSprints = totalsValues.length
                ? totalsValues.reduce(function (total, value) {
                    const number = Number(value);
                    return total + (Number.isFinite(number) ? number : 0);
                }, 0)
                : series.reduce(function (total, zone) {
                    return total + zone.data.reduce(function (subtotal, value) { return subtotal + value; }, 0);
                }, 0);

            await window.athleteIntensityZonesChart?.updateOptions({
                xaxis: { categories: history.map(function (item, index) { return getReportDescriptionLabel(item, index); }) },
                series: series,
                noData: { text: "Nenhum sprint encontrado para este jogador." }
            });

            setSprintsChartStatus(history.length ? "Atualizado" : "Sem dados", history.length ? "success" : "secondary");
            if (sprintsChartDescription) {
                const apiReportCount = Number(payload?.total_relatorios);
                const reportCount = Number.isFinite(apiReportCount) ? apiReportCount : apiHistory.length || (history.length ? 1 : 0);
                sprintsChartDescription.textContent = history.length
                    ? `${reportCount} ${reportCount === 1 ? "relatório encontrado" : "relatórios encontrados"} · ${totalSprints.toLocaleString("pt-BR")} sprints no total.`
                    : "Nenhum sprint foi encontrado para este jogador.";
            }
        } catch (error) {
            if (requestId !== sprintsRequestId) return;
            setSprintsChartStatus("Erro ao carregar", "danger");
            if (sprintsChartDescription) sprintsChartDescription.textContent = error.message || "Não foi possível carregar os sprints.";
        }
    }

    function getSpeedHistory(payload) {
        const candidates = [payload?.historico, payload?.velocidades, payload?.jogos, payload?.relatorios,
            payload?.dados, payload?.results, payload?.items, payload?.data, payload];
        const history = candidates.find(Array.isArray);
        return history || (getMaximumSpeed(payload) !== null ? [payload] : []);
    }

    function getMaximumSpeed(item) {
        const value = item?.velocidade_maxima ?? item?.max_velocidade ?? item?.velocidadeMaxima
            ?? item?.maximum_speed ?? item?.max_speed ?? item?.valor;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function getSpeedLabel(item, index) {
        const report = item?.relatorio || item?.report || {};
        const name = item?.relatorio_nome ?? item?.nome_relatorio ?? item?.jogo_nome ?? item?.nome_jogo
            ?? item?.nome ?? item?.name ?? report?.nome ?? report?.name;
        const rawDate = item?.inicio_do_relatorio ?? item?.data_relatorio ?? item?.relatorio_data
            ?? item?.data ?? item?.date ?? report?.inicio_do_relatorio ?? report?.data ?? report?.date;
        let date = "";
        if (rawDate) {
            const parsedDate = new Date(rawDate);
            date = Number.isNaN(parsedDate.getTime()) ? String(rawDate) : parsedDate.toLocaleDateString("pt-BR");
        }
        return name && date ? `${name} · ${date}` : name || date || `Jogo ${index + 1}`;
    }

    function getReportDescriptionLabel(item, index) {
        const report = item?.relatorio || item?.report || {};
        const label = item?.relatorio_nome ?? item?.nome_relatorio ?? item?.jogo_nome ?? item?.nome_jogo
            ?? item?.nome ?? item?.name ?? report?.nome ?? report?.name ?? `Relatório ${index + 1}`;
        return String(label)
            .replace(/\s*[·\-–—]\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/g, "")
            .replace(/\s*\d{4}-\d{2}-\d{2}\s*$/g, "")
            .trim() || `Relatório ${index + 1}`;
    }

    async function loadAthleteSpeeds(rawAthlete) {
        const requestId = ++speedRequestId;
        const athlete = rawAthlete?.aluno || rawAthlete?.jogador || rawAthlete?.athlete || rawAthlete?.player || rawAthlete || {};
        const userId = athlete.aluno_user_id ?? athlete.user_id ?? rawAthlete?.aluno_user_id ?? rawAthlete?.user_id;

        if (!userId) {
            setSpeedChartStatus("ID indisponível", "danger");
            if (speedChartDescription) speedChartDescription.textContent = "O jogador selecionado não possui aluno_user_id.";
            return;
        }

        setSpeedChartStatus("Carregando...", "warning");
        if (speedChartDescription) speedChartDescription.textContent = "Buscando o histórico de velocidade do jogador...";

        try {
            const response = await fetch(`https://uwbv2-1.onrender.com/alunos/${encodeURIComponent(userId)}/velocidades`, {
                method: "GET",
                headers: { "Accept": "application/json", "Authorization": `Bearer ${getAccessToken()}` }
            });
            const payload = await response.json().catch(function () { return {}; });
            if (!response.ok) {
                const detail = payload?.detail || payload?.message;
                throw new Error(typeof detail === "string" ? detail : `Não foi possível carregar as velocidades (erro ${response.status}).`);
            }
            if (requestId !== speedRequestId) return;

            const history = getSpeedHistory(payload).map(function (item, index) {
                return {
                    speed: getMaximumSpeed(item),
                    label: getReportDescriptionLabel(item, index)
                };
            }).filter(function (item) { return item.speed !== null; });
            const maximumSpeeds = history.map(function (item) { return item.speed; });
            const lastHistoryItem = getSpeedHistory(payload).at(-1) || {};
            const responseAverage = Number(payload?.media_velocidade_maxima ?? payload?.media_maxima ?? payload?.average_max_speed
                ?? lastHistoryItem?.media_velocidade_maxima ?? lastHistoryItem?.media_maxima ?? lastHistoryItem?.average_max_speed);
            const average = Number.isFinite(responseAverage) ? responseAverage
                : maximumSpeeds.length ? maximumSpeeds.reduce(function (total, value) { return total + value; }, 0) / maximumSpeeds.length : null;

            await window.athleteSpeedHistoryChart?.updateOptions({
                xaxis: {
                    categories: history.map(function (item) { return item.label; }),
                    labels: {
                        show: true,
                        rotate: -45,
                        trim: true,
                        hideOverlappingLabels: true,
                        style: { fontSize: "11px" }
                    },
                    tooltip: { enabled: false },
                    title: { text: "" }
                },
                series: [
                    { name: "Velocidade máxima por jogo", data: maximumSpeeds },
                    { name: "Média das máximas", data: maximumSpeeds.map(function () { return average; }) }
                ],
                noData: { text: "Nenhuma velocidade encontrada para este jogador." }
            });

            setSpeedChartStatus(history.length ? "Atualizado" : "Sem dados", history.length ? "success" : "secondary");
            if (speedChartDescription) {
                speedChartDescription.textContent = history.length
                    ? `${history.length} ${history.length === 1 ? "jogo encontrado" : "jogos encontrados"}${average !== null ? ` · Média máxima: ${average.toFixed(2)} km/h` : ""}.`
                    : "Nenhuma velocidade foi encontrada para este jogador.";
            }
        } catch (error) {
            if (requestId !== speedRequestId) return;
            setSpeedChartStatus("Erro ao carregar", "danger");
            if (speedChartDescription) speedChartDescription.textContent = error.message || "Não foi possível carregar as velocidades.";
        }
    }

    function setActiveOption(index) {
        const options = results.querySelectorAll(".athlete-search-option");
        if (!options.length) return;
        activeIndex = (index + options.length) % options.length;
        options.forEach(function (option, optionIndex) {
            const isActive = optionIndex === activeIndex;
            option.classList.toggle("is-active", isActive);
            option.setAttribute("aria-selected", String(isActive));
        });
        input.setAttribute("aria-activedescendant", options[activeIndex].id);
        options[activeIndex].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", function () {
        selectedAthlete = null;
        clearButton.classList.toggle("d-none", !input.value);
        help.textContent = "Digite para localizar e selecionar um jogador.";
        renderResults();
    });
    input.addEventListener("focus", renderResults);
    input.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (results.classList.contains("d-none")) renderResults();
            setActiveOption(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            selectAthlete(filteredAthletes[activeIndex]);
        } else if (event.key === "Escape") {
            closeResults();
        }
    });
    results.addEventListener("click", function (event) {
        const option = event.target.closest(".athlete-search-option");
        if (option) selectAthlete(filteredAthletes[Number(option.dataset.index)]);
    });
    clearButton.addEventListener("click", function () {
        speedRequestId += 1;
        sprintsRequestId += 1;
        selectedAthlete = null;
        input.value = "";
        clearButton.classList.add("d-none");
        help.textContent = "Digite para localizar e selecionar um jogador.";
        window.athleteSpeedHistoryChart?.updateOptions({
            xaxis: {
                categories: [],
                labels: {
                    show: true,
                    rotate: -45,
                    trim: true,
                    hideOverlappingLabels: true,
                    style: { fontSize: "11px" }
                },
                tooltip: { enabled: false },
                title: { text: "" }
            },
            series: [
                { name: "Velocidade máxima por jogo", data: [] },
                { name: "Média das máximas", data: [] }
            ]
        });
        setSpeedChartStatus("Aguardando jogador", "primary");
        if (speedChartDescription) speedChartDescription.textContent = "Selecione um jogador para visualizar a velocidade máxima de cada jogo.";
        window.athleteIntensityZonesChart?.updateOptions({
            xaxis: { categories: [] },
            series: [
                { name: "0-40%", data: [] },
                { name: "41-60%", data: [] },
                { name: "61-80%", data: [] },
                { name: "81-90%", data: [] },
                { name: "91-100%", data: [] }
            ]
        });
        setSprintsChartStatus("Aguardando jogador", "primary");
        if (sprintsChartDescription) sprintsChartDescription.textContent = "Selecione um jogador para visualizar os sprints por zona.";
        input.focus();
        renderResults();
    });
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".athlete-search-field")) closeResults();
    });

    window.setAthleteSearchOptions = function (payload) {
        const candidates = [payload, payload?.alunos, payload?.jogadores, payload?.athletes, payload?.players, payload?.results, payload?.data];
        const list = candidates.find(Array.isArray) || [];
        athletes = list.map(normalizeAthlete).filter(function (athlete) { return athlete.name; });
        if (document.activeElement === input) renderResults();
        return athletes.length;
    };
    window.getSelectedAthlete = function () { return selectedAthlete?.raw || null; };

    async function loadAthletes() {
        const token = getAccessToken();
        if (!token) {
            loadingMessage = '<i class="ri-error-warning-line me-1"></i>Faça login novamente para carregar os jogadores.';
            help.textContent = "Não foi possível carregar os jogadores sem uma sessão válida.";
            return;
        }

        loadingMessage = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Carregando jogadores...';
        help.textContent = "Carregando jogadores...";
        input.disabled = true;

        try {
            const response = await fetch(STUDENTS_ENDPOINT, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            const payload = await response.json().catch(function () { return {}; });

            if (!response.ok) {
                const detail = payload?.detail || payload?.message;
                throw new Error(typeof detail === "string" ? detail : `Não foi possível carregar os jogadores (erro ${response.status}).`);
            }

            loadingMessage = "";
            const total = window.setAthleteSearchOptions(payload);
            help.textContent = total
                ? `${total} ${total === 1 ? "jogador disponível" : "jogadores disponíveis"}. Digite para pesquisar.`
                : "Nenhum jogador cadastrado.";
        } catch (error) {
            loadingMessage = `<i class="ri-error-warning-line me-1"></i>${escapeHtml(error.message || "Não foi possível carregar os jogadores.")}`;
            help.textContent = error.message || "Não foi possível carregar os jogadores.";
        } finally {
            input.disabled = false;
        }
    }

    window.setAthleteSearchOptions(window.MOVEX_ATHLETES || []);
    loadAthletes();
}());

