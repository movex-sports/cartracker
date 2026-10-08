(function () {
    "use strict";

    var apiBaseUrl = "https://cartracker-api.onrender.com";
    var map;
    var telemetryLayer;
    var refreshTimer = null;
    var requestInProgress = false;
    var hasFittedTelemetry = false;
    var selectedVehicleId = null;
    var refreshIntervalMs = 10000;
    var latestVehicles = [];
    var searchTerm = "";

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

    async function fetchWithAuthentication(path) {
        var expiresAt = Number(sessionStorage.getItem("movex_token_expires_at")) || 0;
        if (expiresAt && expiresAt - Date.now() < 60000 && typeof window.movexRenewSession === "function") {
            await window.movexRenewSession();
        }
        var token = getAccessToken();
        if (!token) {
            clearSessionAndRedirect();
            throw new Error("Sessão não encontrada.");
        }

        var response = await fetch(apiBaseUrl + path, {
            method: "GET",
            headers: { "Accept": "application/json", "Authorization": "Bearer " + token },
            cache: "no-store"
        });
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

    function hasCoordinates(vehicle) {
        return vehicle.latitude != null && vehicle.longitude != null && Number.isFinite(Number(vehicle.latitude)) && Number.isFinite(Number(vehicle.longitude));
    }

    function formatNumber(value, decimals) {
        if (value == null || value === "") return "—";
        var number = Number(value);
        return Number.isFinite(number) ? number.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : "—";
    }

    function formatTelemetryDate(value) {
        if (!value) return "Sem telemetria";
        var date = new Date(value);
        return Number.isNaN(date.getTime()) ? "Sem telemetria" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
    }

    function renterName(vehicle) {
        return [vehicle.locatario_nome, vehicle.locatario_sobrenome].filter(Boolean).join(" ");
    }

    function normalizeSearch(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    function applyFleetFilter() {
        var query = normalizeSearch(searchTerm);
        var filtered = query ? latestVehicles.filter(function (vehicle) {
            return normalizeSearch([renterName(vehicle), vehicle.placa, vehicle.modelo, vehicle.marca].filter(Boolean).join(" ")).includes(query);
        }) : latestVehicles;
        renderRentedVehicles(filtered);
    }

    function initializeMap() {
        var error = document.getElementById("movex-route-map-error");
        if (!window.L) {
            error.hidden = false;
            return;
        }

        map = L.map("movex-route-map", { zoomControl: false });
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        telemetryLayer = L.layerGroup().addTo(map);
        map.fitWorld();
        setTimeout(function () { map.invalidateSize(); }, 100);
    }

    function selectVehicle(card, vehicle) {
        document.querySelectorAll(".movex-rented-card").forEach(function (item) { item.classList.remove("is-selected"); });
        card.classList.add("is-selected");
        selectedVehicleId = String(vehicle.veiculo_id);
        if (hasCoordinates(vehicle)) map.setView([Number(vehicle.latitude), Number(vehicle.longitude)], 16, { animate: true });
    }

    function renderRentedVehicles(vehicles) {
        var list = document.getElementById("rented-vehicle-list");
        var count = document.getElementById("rented-vehicle-count");
        count.textContent = String(vehicles.length);
        if (!vehicles.length) {
            list.innerHTML = searchTerm
                ? '<div class="movex-rented-empty"><i class="ri-search-line fs-2 d-block mb-2"></i>Nenhum veículo ou locatário encontrado.</div>'
                : '<div class="movex-rented-empty"><i class="ri-car-line fs-2 d-block mb-2"></i>Nenhum veículo alugado no momento.</div>';
            if (telemetryLayer) telemetryLayer.clearLayers();
            return;
        }

        list.innerHTML = vehicles.map(function (vehicle, index) {
            var ignitionClass = vehicle.ignicao == null ? "is-ignition-unknown" : vehicle.ignicao ? "is-ignition-on" : "is-ignition-off";
            var ignitionLabel = vehicle.ignicao == null ? "Sem informação" : vehicle.ignicao ? "Ligada" : "Desligada";
            return `<article class="movex-rented-card ${ignitionClass}" tabindex="0" role="button" data-rented-index="${index}">
                <div class="movex-rented-card-header">
                    <span class="movex-rented-icon">${vehicle.foto_thumb_url ? `<img src="${escapeHtml(vehicle.foto_thumb_url)}" alt="Foto de ${escapeHtml(vehicle.marca || "veículo")} ${escapeHtml(vehicle.modelo || "")}"><i class="ri-car-line d-none"></i>` : '<i class="ri-car-line"></i>'}</span>
                    <div class="movex-rented-title">
                        <strong>${escapeHtml(vehicle.placa || "Sem placa")}</strong>
                        <span>${escapeHtml([vehicle.marca, vehicle.modelo].filter(Boolean).join(" · "))}</span>
                        <span class="movex-renter-name"><i class="ri-user-3-line"></i>${escapeHtml(renterName(vehicle) || "Locatário não informado")}</span>
                    </div>
                    <span class="movex-telemetry-dot ${ignitionClass}" title="Ignição ${escapeHtml(ignitionLabel.toLowerCase())}"></span>
                </div>
                <div class="movex-telemetry-grid">
                    <span><small>Ignição</small><b class="movex-ignition-value ${ignitionClass}"><i class="ri-shut-down-line"></i>${escapeHtml(ignitionLabel)}</b></span>
                    <span><small>Bateria</small><b>${formatNumber(vehicle.bateria, 1)}${vehicle.bateria == null ? "" : " V"}</b></span>
                    <span><small>Velocidade</small><b>${formatNumber(vehicle.velocidade, 0)}${vehicle.velocidade == null ? "" : " km/h"}</b></span>
                </div>
                <div class="movex-rented-meta"><span><i class="ri-map-pin-line me-1"></i>${hasCoordinates(vehicle) ? escapeHtml(vehicle.coordenadas || (formatNumber(vehicle.latitude, 5) + ", " + formatNumber(vehicle.longitude, 5))) : "Sem coordenadas"}</span><span>${escapeHtml(formatTelemetryDate(vehicle.registrado_em))}</span></div>
            </article>`;
        }).join("");

        list.querySelectorAll(".movex-rented-icon img").forEach(function (image) {
            image.addEventListener("error", function () {
                var fallback = image.nextElementSibling;
                image.remove();
                fallback?.classList.remove("d-none");
            }, { once: true });
        });

        if (selectedVehicleId) {
            var selectedIndex = vehicles.findIndex(function (vehicle) { return String(vehicle.veiculo_id) === selectedVehicleId; });
            var selectedCard = selectedIndex >= 0 ? list.querySelector('[data-rented-index="' + selectedIndex + '"]') : null;
            if (selectedCard) {
                selectedCard.classList.add("is-selected");
            }
            else selectedVehicleId = null;
        }

        if (telemetryLayer) {
            telemetryLayer.clearLayers();
            var bounds = [];
            vehicles.forEach(function (vehicle, index) {
                if (!hasCoordinates(vehicle)) return;
                var point = [Number(vehicle.latitude), Number(vehicle.longitude)];
                bounds.push(point);
                var carIcon = L.divIcon({
                    className: "movex-car-map-marker-wrapper",
                    html: '<div class="movex-car-map-marker ' + (vehicle.ignicao == null ? "is-ignition-unknown" : vehicle.ignicao ? "is-ignition-on" : "is-ignition-off") + '"><i class="ri-car-fill"></i><span></span></div>',
                    iconSize: [42, 48],
                    iconAnchor: [21, 44],
                    tooltipAnchor: [0, -38]
                });
                var marker = L.marker(point, { icon: carIcon, keyboard: true, title: vehicle.placa || "Veículo" }).addTo(telemetryLayer);
                marker.bindTooltip(escapeHtml(vehicle.placa || "Veículo"));
                marker.on("click", function () {
                    var card = list.querySelector('[data-rented-index="' + index + '"]');
                    if (card) selectVehicle(card, vehicle);
                });
            });
            if (!hasFittedTelemetry) {
                if (bounds.length) map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
                else map.fitWorld();
                hasFittedTelemetry = true;
            }
        }

        list.querySelectorAll(".movex-rented-card").forEach(function (card) {
            function activate() {
                selectVehicle(card, vehicles[Number(card.dataset.rentedIndex)]);
            }
            card.addEventListener("click", activate);
            card.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); }
            });
        });
    }

    async function loadRentedVehicles() {
        var list = document.getElementById("rented-vehicle-list");
        if (requestInProgress || document.hidden) return;
        requestInProgress = true;
        try {
            var response = await fetchWithAuthentication("/dados-crus/veiculos-alugados");
            var vehicles = await response.json().catch(function () { return []; });
            if (!response.ok) throw new Error(apiError(vehicles, "Não foi possível carregar os veículos alugados."));
            latestVehicles = Array.isArray(vehicles) ? vehicles : [];
            applyFleetFilter();
        } catch (error) {
            list.innerHTML = '<div class="movex-rented-empty text-danger"><i class="ri-error-warning-line fs-2 d-block mb-2"></i>' + escapeHtml(error.message || "Não foi possível carregar a frota.") + '</div>';
        } finally {
            requestInProgress = false;
        }
    }

    function scheduleRefresh() {
        window.clearInterval(refreshTimer);
        refreshTimer = window.setInterval(loadRentedVehicles, refreshIntervalMs);
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            window.clearInterval(refreshTimer);
            refreshTimer = null;
            return;
        }
        loadRentedVehicles();
        scheduleRefresh();
    }

    function initialize() {
        initializeMap();
        var searchInput = document.getElementById("rented-vehicle-search");
        searchInput?.addEventListener("input", function () {
            searchTerm = searchInput.value;
            applyFleetFilter();
        });
        Promise.resolve(window.movexSessionReady).then(function (ready) {
            if (ready !== false) {
                loadRentedVehicles();
                scheduleRefresh();
            }
        });
        document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();
})();
