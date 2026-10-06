(function () {
  const reportsTableBody = document.getElementById("reports-table-body");
  const refreshReportsButton = document.getElementById("refresh-reports-btn");
  const apiBaseUrl = "https://uwbv2-1.onrender.com";
  const reportsEndpoint = `${apiBaseUrl}/suporte-mapas/relatorios`;
  const rankingEndpoints = {
    distance: `${apiBaseUrl}/ranking/distancia-percorrida`,
  };
  const reportsDateFilter = document.getElementById("reports-date-filter");
  const distanceRankingTableBody = document.getElementById(
    "distance-ranking-table-body",
  );
  let allReports = [];
  let currentReports = [];
  let selectedDateRange = [];
  function getDefaultReportsDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 60);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return [startDate, endDate];
  }
  function captureTokenFromUrl() {
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const tokenFromUrl = hashParams.get("access_token");

    if (!tokenFromUrl) return "";

    localStorage.setItem("movex_access_token", tokenFromUrl);
    localStorage.setItem("movex_token_type", "bearer");
    localStorage.setItem("access_token", tokenFromUrl);

    if (window.history?.replaceState) {
      window.history.replaceState(
        null,
        document.title,
        window.location.href.split("#")[0],
      );
    }

    return tokenFromUrl;
  }

  function getAuthToken() {
    return (
      captureTokenFromUrl() ||
      localStorage.getItem("movex_access_token") ||
      sessionStorage.getItem("movex_access_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      ""
    );
  }

  function normalizeReports(payload) {
    if (Array.isArray(payload)) return payload;

    const containers = [
      payload,
      payload?.data,
      payload?.result,
      payload?.resultado,
    ];
    for (const container of containers) {
      if (Array.isArray(container)) return container;
      if (Array.isArray(container?.relatorios)) return container.relatorios;
      if (Array.isArray(container?.reports)) return container.reports;
      if (Array.isArray(container?.items)) return container.items;
    }

    return [];
  }

  function getReportName(report, index) {
    const reportName =
      report?.nome ||
      report?.nome_relatorio ||
      report?.titulo ||
      report?.name ||
      report?.relatorio_nome ||
      "";

    return String(reportName).trim();
  }

  function getReportNumber(report, index) {
    return (
      report?.relatorio_number ||
      report?.relatorio_numero ||
      report?.id ||
      index + 1
    );
  }

  function getReportDraftKey(report, index) {
    return String(getReportNumber(report, index));
  }

  function isReportUnnamed(report, index) {
    return !getReportName(report, index);
  }

  async function updateReportName(reportNumber, name) {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const response = await fetch(
      `${reportsEndpoint}/${encodeURIComponent(reportNumber)}/adicionar-nome`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: name }),
      },
    );

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(
        errorPayload.detail ||
          `Erro ${response.status} ao atualizar o relatório.`,
      );
    }

    return response.json().catch(() => ({}));
  }

  function getReportDateTimeValue(report) {
    return (
      report?.inicio_do_relatorio ||
      report?.inicio_relatorio ||
      report?.data_hora ||
      report?.datetime ||
      report?.timestamp ||
      report?.created_at ||
      report?.criado_em ||
      report?.data_criacao ||
      report?.createdAt ||
      ""
    );
  }

  function getReportEndDateTimeValue(report) {
    return (
      report?.fim_do_relatorio ||
      report?.fim_relatorio ||
      report?.data_hora_fim ||
      report?.end_datetime ||
      report?.ended_at ||
      report?.finalizado_em ||
      ""
    );
  }

  function parseReportDate(value) {
    if (!value) return null;

    const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      return new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      );
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getReportDate(report) {
    const dateValue =
      report?.data_inicio ||
      report?.data_do_relatorio ||
      report?.data_relatorio ||
      report?.report_date ||
      report?.data ||
      report?.date ||
      getReportDateTimeValue(report);

    if (!dateValue) return "—";

    const isoDateMatch = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`;
    }

    const brazilianDateMatch = String(dateValue).match(
      /^(\d{2})\/(\d{2})\/(\d{4})/,
    );
    if (brazilianDateMatch) {
      return brazilianDateMatch[0];
    }

    const date = parseReportDate(dateValue);
    if (!date) return "—";

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function getReportFilterDate(report) {
    const dateValue =
      report?.data_inicio ||
      report?.data_do_relatorio ||
      report?.data_relatorio ||
      report?.report_date ||
      report?.data ||
      report?.date ||
      getReportDateTimeValue(report);

    return parseReportDate(dateValue);
  }

  function applyDateFilter() {
    if (selectedDateRange.length !== 2) {
      renderReports(allReports);
      return;
    }

    const startDate = new Date(selectedDateRange[0]);
    const endDate = new Date(selectedDateRange[1]);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const filteredReports = allReports.filter((report) => {
      const reportDate = getReportFilterDate(report);
      return !reportDate || (reportDate >= startDate && reportDate <= endDate);
    });

    renderReports(filteredReports);
  }

  function formatReportTime(value) {
    if (!value) return "—";

    const normalizedTime = String(value).match(/\d{2}:\d{2}(?::\d{2})?/);
    if (normalizedTime) {
      return normalizedTime[0].slice(0, 5);
    }

    const date = parseReportDate(value);
    if (!date) return "—";

    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getReportStartTime(report) {
    return formatReportTime(
      report?.hora_inicio ||
        report?.inicio ||
        report?.start_time ||
        report?.hora ||
        report?.time ||
        report?.horario ||
        getReportDateTimeValue(report),
    );
  }

  function getReportEndTime(report) {
    return formatReportTime(
      report?.hora_fim ||
        report?.fim ||
        report?.end_time ||
        getReportEndDateTimeValue(report),
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeRankingPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.ranking)) return payload.ranking;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.usuarios)) return payload.usuarios;
    if (Array.isArray(payload?.jogadores)) return payload.jogadores;
    return [];
  }

  function getRankingPlayerName(item) {
    return (
      item?.nome ||
      item?.nome_usuario ||
      item?.usuario_nome ||
      item?.nome_aluno ||
      item?.aluno_nome ||
      item?.nome_jogador ||
      item?.jogador_nome ||
      item?.name ||
      item?.player_name ||
      (typeof item?.usuario === "string" ? item.usuario : "") ||
      (typeof item?.aluno === "string" ? item.aluno : "") ||
      (typeof item?.jogador === "string" ? item.jogador : "") ||
      item?.usuario?.nome ||
      item?.aluno?.nome ||
      item?.jogador?.nome ||
      "Sem nome"
    );
  }

  function getRankingPlayerPosition(item) {
    return (
      item?.posicao ||
      item?.posicao_jogador ||
      item?.posicao_aluno ||
      item?.position ||
      item?.categoria ||
      item?.usuario?.posicao ||
      item?.aluno?.posicao ||
      item?.jogador?.posicao ||
      "Jogador"
    );
  }

  function getRankingMetricValue(item, metricKeys) {
    for (const key of metricKeys) {
      if (item?.[key] !== undefined && item?.[key] !== null) {
        return item[key];
      }
    }

    return 0;
  }

  function parseRankingMetric(value) {
    const numericValue = Number(String(value).replace(",", "."));

    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  function formatRankingMetric(value, unit, decimals = 1) {
    const numericValue = parseRankingMetric(value);

    return `${numericValue.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} ${unit}`.trim();
  }

  function setRankingTableState(tableBody, message, type = "muted") {
    if (!tableBody) return;

    tableBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-${type} py-4">${escapeHtml(message)}</td>
                    </tr>
                `;
  }

  function renderRankingTable(config, items) {
    if (!config.tableBody) return;

    if (!items.length) {
      setRankingTableState(config.tableBody, "Nenhum ranking encontrado.");
      return;
    }

    const rankedItems = [...items].sort((firstItem, secondItem) => {
      const firstValue = getRankingMetricValue(firstItem, config.metricKeys);
      const secondValue = getRankingMetricValue(secondItem, config.metricKeys);

      return parseRankingMetric(secondValue) - parseRankingMetric(firstValue);
    });

    config.tableBody.innerHTML = rankedItems
      .map((item, index) => {
        const rankingPosition = index + 1;
        const metricValue = getRankingMetricValue(item, config.metricKeys);

        return `
                        <tr>
                            <td><span class="fw-semibold text-primary">${escapeHtml(rankingPosition)}</span></td>
                            <td>
                                <h5 class="fs-14 my-1">${escapeHtml(getRankingPlayerName(item))}</h5>
                                <span class="text-muted">${escapeHtml(getRankingPlayerPosition(item))}</span>
                            </td>
                            <td class="text-end">
                                <h5 class="fs-14 my-1">${escapeHtml(formatRankingMetric(metricValue, config.unit, config.decimals))}</h5>
                                <span class="text-muted">${config.label}</span>
                            </td>
                        </tr>
                    `;
      })
      .join("");
  }

  async function loadRankingTable(config) {
    const token = getAuthToken();
    setRankingTableState(config.tableBody, "Carregando ranking...");

    try {
      const headers = { Accept: "application/json" };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(config.endpoint, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const payload = await response.json();
      renderRankingTable(config, normalizeRankingPayload(payload));
    } catch (error) {
      console.error(`Erro ao carregar ${config.logName}:`, error);
      setRankingTableState(
        config.tableBody,
        "Não foi possível carregar o ranking agora.",
        "danger",
      );
    }
  }

  const rankingTableConfigs = [
    {
      logName: "ranking por distância",
      endpoint: rankingEndpoints.distance,
      tableBody: distanceRankingTableBody,
      metricKeys: [
        "distancia_km",
        "distancia_em_km",
        "distancia_percorrida_km",
        "distance_km",
        "total_distancia_km",
        "distancia_total_km",
        "total_km",
        "km",
        "distancia",
        "distancia_percorrida",
        "total_distancia",
        "distancia_total",
        "total",
        "distance",
      ],
      label: "Dist&acirc;ncia",
      unit: "km",
      decimals: 1,
    },
  ];

  function buildUnnamedReportsForm(unnamedReports) {
    const rows = unnamedReports
      .map(
        ({ report, index }) => `
                    <div class="unnamed-reports-grid unnamed-report-row">
                        <strong>${index + 1}</strong>
                        <input
                            type="text"
                            class="form-control unnamed-report-name"
                            data-report-key="${escapeHtml(getReportDraftKey(report, index))}"
                            placeholder="Digite o nome do relatório"
                            maxlength="100"
                        >
                        <span class="unnamed-report-meta">${escapeHtml(getReportDate(report))}</span>
                        <span class="unnamed-report-meta">${escapeHtml(getReportStartTime(report))}</span>
                        <span class="unnamed-report-meta">${escapeHtml(getReportEndTime(report))}</span>
                    </div>
                `,
      )
      .join("");

    return `
                    <div class="unnamed-reports-form">
                        <div class="unnamed-reports-grid header">
                            <span>Nº</span>
                            <span>Nome</span>
                            <span>Data</span>
                            <span>In&iacute;cio</span>
                            <span>Fim</span>
                        </div>
                        <div class="mt-2">${rows}</div>
                        <div id="report-names-save-status" class="small mt-3" role="alert"></div>
                        <div class="d-grid mt-4">
                            <button type="button" id="save-report-names-btn" class="btn btn-primary" disabled>
                                Adicionar nomes aos relatórios
                            </button>
                        </div>
                    </div>
                `;
  }

  function openUnnamedReportsModal() {
    const reportsToValidate = allReports.length ? allReports : currentReports;
    const unnamedReports = reportsToValidate
      .map((report, index) => ({ report, index }))
      .filter(({ report, index }) => isReportUnnamed(report, index));

    if (!unnamedReports.length) return;
    if (Swal.isVisible()) return;

    Swal.fire({
      title: "Oops...",
      text: "Existem relatórios sem nome",
      icon: "error",
      footer: buildUnnamedReportsForm(unnamedReports),
      showConfirmButton: false,
      showCloseButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        popup: "reports-name-alert",
      },
      didOpen: () => {
        const saveButton = document.getElementById("save-report-names-btn");
        const inputs = Array.from(
          document.querySelectorAll(".unnamed-report-name"),
        );
        const saveStatus = document.getElementById("report-names-save-status");

        const updateSaveButtonState = () => {
          const allNamesFilled = inputs.every((input) => input.value.trim());
          saveButton.disabled = !allNamesFilled;
        };

        saveButton?.addEventListener("click", async () => {
          const emptyInput = inputs.find((input) => !input.value.trim());

          if (emptyInput) {
            emptyInput.classList.add("is-invalid");
            emptyInput.focus();
            return;
          }

          const originalButtonContent = saveButton.innerHTML;
          saveButton.disabled = true;
          saveButton.innerHTML = `
                                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Salvando nomes...
                            `;
          saveStatus.className = "small mt-3 text-muted";
          saveStatus.textContent = "Atualizando os relatórios...";

          try {
            for (const input of inputs) {
              await updateReportName(
                input.dataset.reportKey,
                input.value.trim(),
              );
            }

            localStorage.removeItem("movex_report_name_drafts");
            saveStatus.className = "small mt-3 text-success";
            saveStatus.textContent = "Nomes atualizados com sucesso.";
            Swal.close();
            await loadReports();
          } catch (error) {
            console.error("Erro ao atualizar nomes dos relatórios:", error);
            saveStatus.className = "small mt-3 text-danger";
            saveStatus.textContent =
              error.message || "Não foi possível atualizar os nomes.";
            saveButton.innerHTML = originalButtonContent;
            updateSaveButtonState();
          }
        });

        document.querySelectorAll(".unnamed-report-name").forEach((input) => {
          input.addEventListener("input", () => {
            input.classList.remove("is-invalid");
            updateSaveButtonState();
          });
        });

        updateSaveButtonState();
      },
    });
  }

  function setReportsTableState(message, type = "muted") {
    if (!reportsTableBody) return;

    reportsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-${type} py-4">${message}</td>
                    </tr>
                `;
  }

  function renderReports(reports) {
    if (!reportsTableBody) return;

    currentReports = reports;

    if (!reports.length) {
      setReportsTableState(
        selectedDateRange.length === 2
          ? "Nenhum relatório encontrado neste período."
          : "Nenhum relatório encontrado.",
      );
      return;
    }

    reportsTableBody.innerHTML = reports
      .map((report, index) => {
        const reportName = getReportName(report, index);
        const reportNumber = getReportNumber(report, index);
        const reportParams = new URLSearchParams({
          relatorio_number: reportNumber,
          nome: reportName,
          data: getReportDate(report),
          inicio: getReportStartTime(report),
          fim: getReportEndTime(report),
        });
        const reportUrl = `page-relatorio-2.html?${reportParams.toString()}`;
        const reportNameContent = reportName
          ? `<h6 class="fs-14 mb-0">${escapeHtml(reportName)}</h6>`
          : `
                            <div class="fw-semibold text-warning">Relatório sem nome</div>
                        `;

        return `
                    <tr>
                        <td>
                            <span class="fw-semibold text-primary">${index + 1}</span>
                        </td>
                        <td>
                            <a href="${escapeHtml(reportUrl)}" class="d-flex align-items-center text-reset">
                                <div class="avatar-xs flex-shrink-0 me-2">
                                    <span class="avatar-title rounded-circle bg-primary-subtle text-primary">
                                        <i class="ri-file-chart-line"></i>
                                    </span>
                                </div>
                                <div class="flex-grow-1">
                                    ${reportNameContent}
                                </div>
                            </a>
                        </td>
                        <td class="text-muted">${escapeHtml(getReportDate(report))}</td>
                        <td class="text-muted">${escapeHtml(getReportStartTime(report))}</td>
                        <td class="text-muted">${escapeHtml(getReportEndTime(report))}</td>
                    </tr>
                `;
      })
      .join("");

    if (allReports.some((report, index) => isReportUnnamed(report, index))) {
      window.setTimeout(openUnnamedReportsModal, 0);
    }
  }

  async function loadReports() {
    const token = getAuthToken();

    if (!token) {
      setReportsTableState(
        "Faça login novamente para listar seus relatórios.",
        "warning",
      );
      return;
    }

    setReportsTableState("Carregando relatórios...");

    try {
      const response = await fetch(reportsEndpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const payload = await response.json();
      allReports = normalizeReports(payload);
      applyDateFilter();
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      setReportsTableState(
        "Não foi possível carregar os relatórios agora.",
        "danger",
      );
    }
  }

  refreshReportsButton?.addEventListener("click", loadReports);
  document.addEventListener("DOMContentLoaded", function () {
    selectedDateRange = getDefaultReportsDateRange();

    if (reportsDateFilter && typeof flatpickr === "function") {
      flatpickr(reportsDateFilter, {
        mode: "range",
        dateFormat: "d/m/Y",
        conjunction: " até ",
        allowInput: false,
        defaultDate: selectedDateRange,
        locale: {
          firstDayOfWeek: 0,
          weekdays: {
            shorthand: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
            longhand: [
              "Domingo",
              "Segunda-feira",
              "Terça-feira",
              "Quarta-feira",
              "Quinta-feira",
              "Sexta-feira",
              "Sábado",
            ],
          },
          months: {
            shorthand: [
              "Jan",
              "Fev",
              "Mar",
              "Abr",
              "Mai",
              "Jun",
              "Jul",
              "Ago",
              "Set",
              "Out",
              "Nov",
              "Dez",
            ],
            longhand: [
              "Janeiro",
              "Fevereiro",
              "Março",
              "Abril",
              "Maio",
              "Junho",
              "Julho",
              "Agosto",
              "Setembro",
              "Outubro",
              "Novembro",
              "Dezembro",
            ],
          },
          rangeSeparator: " até ",
        },
        onChange: function (selectedDates) {
          selectedDateRange = selectedDates;

          if (selectedDates.length === 2 || selectedDates.length === 0) {
            applyDateFilter();
          }
        },
      });
    }

    loadReports();
    rankingTableConfigs.forEach(loadRankingTable);
  });

  document.addEventListener("DOMContentLoaded", function () {
    document
      .querySelectorAll(".offcanvas-backdrop")
      .forEach((backdrop) => backdrop.remove());
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  });
})();

if (window.location.protocol === "file:" && window.Blob && window.URL) {
  const emptyLanguageFile = URL.createObjectURL(
    new Blob(["{}"], { type: "application/json" }),
  );
  const originalXhrOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    if (typeof url === "string" && url.startsWith("assets/lang/")) {
      return originalXhrOpen.call(this, method, emptyLanguageFile, ...args);
    }

    return originalXhrOpen.call(this, method, url, ...args);
  };
}

(function () {
  if (window.Swiper && document.querySelector(".vertical-swiper")) {
    new Swiper(".vertical-swiper", {
      slidesPerView: 2,
      spaceBetween: 10,
      mousewheel: true,
      loop: true,
      direction: "vertical",
      autoplay: {
        delay: 2500,
        disableOnInteraction: false,
      },
    });
  }

  const rightSideColumn = document.querySelector(".layout-rightside-col");
  const rightSideButtons = document.querySelectorAll(".layout-rightside-btn");
  const overlay = document.querySelector(".overlay");

  if (!rightSideColumn || !rightSideButtons.length) {
    return;
  }

  rightSideButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const isOpen = rightSideColumn.classList.contains("d-block");
      rightSideColumn.classList.toggle("d-block", !isOpen);
      rightSideColumn.classList.toggle("d-none", isOpen);
    });
  });

  function syncRightSideColumn() {
    if (window.outerWidth < 1699 || window.outerWidth > 3440) {
      rightSideColumn.classList.remove("d-block");
      return;
    }

    rightSideColumn.classList.add("d-block");

    if (document.documentElement.getAttribute("data-layout") === "semibox") {
      rightSideColumn.classList.remove("d-block");
      rightSideColumn.classList.add("d-none");
    }
  }

  overlay?.addEventListener("click", function () {
    rightSideColumn.classList.remove("d-block");
  });

  window.addEventListener("resize", syncRightSideColumn);
  window.addEventListener("load", syncRightSideColumn);
})();

document.addEventListener("click", function (event) {
  const link = event.target.closest("a[href]");
  if (!link) return;

  const rawHref = link.getAttribute("href") || "";
  if (
    !rawHref ||
    rawHref.startsWith("#") ||
    /^(https?:|mailto:|tel:|javascript:)/i.test(rawHref)
  )
    return;

  const token =
    localStorage.getItem("movex_access_token") ||
    sessionStorage.getItem("movex_access_token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");

  if (!token) return;

  const destination = new URL(rawHref, window.location.href);
  if (!destination.pathname.toLowerCase().endsWith(".html")) return;

  destination.hash = `access_token=${encodeURIComponent(token)}`;
  link.href = destination.href;
});
