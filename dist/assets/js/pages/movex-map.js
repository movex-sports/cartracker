(function () {
    "use strict";

    var apiBaseUrl = "https://cartracker-api.onrender.com";
    var map;

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

    function formatFuel(value) {
        var labels = { gasolina: "Gasolina", etanol: "Etanol", flex: "Flex", diesel: "Diesel", eletrico: "Elétrico", hibrido: "Híbrido", gnv: "GNV" };
        return labels[String(value || "").toLowerCase()] || value || "—";
    }

    function renterAddress(renter) {
        return [renter.locatario_rua, renter.locatario_numero, renter.locatario_bairro, renter.locatario_cidade, renter.locatario_estado]
            .filter(Boolean).join(", ");
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
        map.fitWorld();
        setTimeout(function () { map.invalidateSize(); }, 100);
    }

    function selectVehicle(card, vehicle, renter) {
        document.querySelectorAll(".movex-rented-card").forEach(function (item) { item.classList.remove("is-selected"); });
        card.classList.add("is-selected");
        document.getElementById("map-vehicle-label").textContent = vehicle.placa || "VEÍCULO";
        document.getElementById("map-vehicle-status").textContent = [vehicle.marca, vehicle.modelo, renter.locatario_nome].filter(Boolean).join(" · ") + " — sem coordenadas";
    }

    function renderRentedVehicles(vehicles, renters) {
        var list = document.getElementById("rented-vehicle-list");
        var count = document.getElementById("rented-vehicle-count");
        var vehicleById = new Map(vehicles.map(function (vehicle) { return [String(vehicle.veiculo_id), vehicle]; }));
        var rented = renters.map(function (renter) {
            return { renter: renter, vehicle: vehicleById.get(String(renter.veiculo_id)) };
        }).filter(function (item) { return Boolean(item.vehicle); });

        count.textContent = String(rented.length);
        if (!rented.length) {
            list.innerHTML = '<div class="movex-rented-empty"><i class="ri-car-line fs-2 d-block mb-2"></i>Nenhum veículo alugado no momento.</div>';
            return;
        }

        list.innerHTML = rented.map(function (item, index) {
            var vehicle = item.vehicle;
            var renter = item.renter;
            return `<article class="movex-rented-card" tabindex="0" role="button" data-rented-index="${index}">
                <div class="movex-rented-card-header">
                    <span class="movex-rented-icon">${vehicle.foto_thumb_url ? `<img src="${escapeHtml(vehicle.foto_thumb_url)}" alt="Foto de ${escapeHtml(vehicle.marca || "veículo")}" onerror="this.remove();this.nextElementSibling.classList.remove('d-none')"><i class="ri-car-line d-none"></i>` : '<i class="ri-car-line"></i>'}</span>
                    <div class="movex-rented-title">
                        <strong>${escapeHtml(vehicle.placa || "Sem placa")}</strong>
                        <span>${escapeHtml([vehicle.marca, vehicle.modelo, vehicle.ano, vehicle.cor].filter(Boolean).join(" · "))}</span>
                    </div>
                </div>
                <div class="movex-rented-details">
                    <span><i class="ri-user-3-line"></i><b>${escapeHtml(renter.locatario_nome)} ${escapeHtml(renter.locatario_sobrenome)}</b></span>
                    <span><i class="ri-map-pin-line"></i><b>${escapeHtml(renterAddress(renter) || "Endereço não informado")}</b></span>
                </div>
                <div class="movex-rented-meta"><span>${escapeHtml(formatFuel(vehicle.combustivel_tipo))}</span><span>Aguardando telemetria</span></div>
            </article>`;
        }).join("");

        list.querySelectorAll(".movex-rented-card").forEach(function (card) {
            function activate() {
                var item = rented[Number(card.dataset.rentedIndex)];
                selectVehicle(card, item.vehicle, item.renter);
            }
            card.addEventListener("click", activate);
            card.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); }
            });
        });
    }

    async function loadRentedVehicles() {
        var list = document.getElementById("rented-vehicle-list");
        try {
            var responses = await Promise.all([fetchWithAuthentication("/veiculos"), fetchWithAuthentication("/locatarios")]);
            var vehicles = await responses[0].json().catch(function () { return []; });
            var renters = await responses[1].json().catch(function () { return []; });
            if (!responses[0].ok) throw new Error(apiError(vehicles, "Não foi possível carregar os veículos."));
            if (!responses[1].ok) throw new Error(apiError(renters, "Não foi possível carregar os locatários."));
            renderRentedVehicles(Array.isArray(vehicles) ? vehicles : [], Array.isArray(renters) ? renters : []);
        } catch (error) {
            list.innerHTML = '<div class="movex-rented-empty text-danger"><i class="ri-error-warning-line fs-2 d-block mb-2"></i>' + escapeHtml(error.message || "Não foi possível carregar a frota.") + '</div>';
        }
    }

    function initialize() {
        initializeMap();
        Promise.resolve(window.movexSessionReady).then(function (ready) {
            if (ready !== false) loadRentedVehicles();
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();
})();
