(function () {
    "use strict";

    var initialCoordinates = [
        { latitude: -23.521278, longitude: -46.854028 },
        { latitude: -23.521111, longitude: -46.854556 },
        { latitude: -23.520778, longitude: -46.855222 },
        { latitude: -23.520389, longitude: -46.855833 },
        { latitude: -23.520056, longitude: -46.856361 }
    ];

    var sampleInput = "23\u00b031'16.6\"S 46\u00b051'14.5\"W\n23\u00b031'16.0\"S 46\u00b051'16.4\"W\n23\u00b031'14.8\"S 46\u00b051'18.8\"W\n23\u00b031'13.4\"S 46\u00b051'21.0\"W";
    var map;
    var routeLayer;

    function toRadians(degrees) { return degrees * Math.PI / 180; }

    function distanceKm(first, second) {
        var radius = 6371;
        var latitudeDistance = toRadians(second.latitude - first.latitude);
        var longitudeDistance = toRadians(second.longitude - first.longitude);
        var firstLatitude = toRadians(first.latitude);
        var secondLatitude = toRadians(second.latitude);
        var value = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDistance / 2) ** 2;
        return 2 * radius * Math.asin(Math.sqrt(value));
    }

    function formatCoordinates(point) { return point.latitude.toFixed(5) + ", " + point.longitude.toFixed(5); }

    function updateSummary(route) {
        var distance = route.slice(1).reduce(function (total, point, index) { return total + distanceKm(route[index], point); }, 0);
        document.getElementById("movex-route-distance").textContent = distance.toFixed(2) + " km";
        document.getElementById("movex-route-point-count").textContent = route.length;
        document.getElementById("movex-route-start-label").textContent = "Ponto 1";
        document.getElementById("movex-route-end-label").textContent = "Ponto " + route.length;
        document.getElementById("movex-route-start-coords").textContent = formatCoordinates(route[0]);
        document.getElementById("movex-route-end-coords").textContent = formatCoordinates(route[route.length - 1]);
    }

    function markerIcon(kind) {
        return L.divIcon({
            className: "",
            html: '<div class="movex-route-marker ' + kind + '"><span></span></div>',
            iconSize: [26, 26],
            iconAnchor: [13, 24]
        });
    }

    function renderMap(route) {
        var error = document.getElementById("movex-route-map-error");
        if (!window.L) { error.hidden = false; return; }

        if (!map) {
            map = L.map("movex-route-map", { zoomControl: false });
            L.control.zoom({ position: "bottomright" }).addTo(map);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);
        }

        if (routeLayer) { routeLayer.remove(); }
        routeLayer = L.layerGroup().addTo(map);
        var points = route.map(function (point) { return [point.latitude, point.longitude]; });

        L.polyline(points, { color: "#405189", weight: 6, opacity: .92, lineJoin: "round" }).addTo(routeLayer);
        route.slice(1, -1).forEach(function (point, index) {
            L.circleMarker([point.latitude, point.longitude], { radius: 4, color: "#fff", weight: 2, fillColor: "#405189", fillOpacity: 1 })
                .bindTooltip("Ponto " + (index + 2)).addTo(routeLayer);
        });
        L.marker(points[0], { icon: markerIcon("is-start") }).bindPopup("<strong>In\u00edcio</strong><br>Ponto 1").addTo(routeLayer);
        L.marker(points[points.length - 1], { icon: markerIcon("is-end") }).bindPopup("<strong>Fim</strong><br>Ponto " + route.length).addTo(routeLayer);
        map.fitBounds(points, { padding: [55, 55] });
        setTimeout(function () { map.invalidateSize(); }, 100);
    }

    function dmsToDecimal(degrees, minutes, seconds, hemisphere) {
        var value = degrees + minutes / 60 + seconds / 3600;
        return hemisphere === "S" || hemisphere === "W" ? -value : value;
    }

    function parseCoordinateLine(line) {
        var normalized = line.trim().replaceAll(",", ".");
        var expression = /(\d{1,3})\s*[\u00b0\u00ba]\s*(\d{1,2})\s*['\u2019\u2032]\s*(\d+(?:\.\d+)?)\s*["\u201d\u2033]?\s*([NSEW])/gi;
        var matches = Array.from(normalized.matchAll(expression));

        if (matches.length === 2) {
            var values = matches.map(function (match) {
                return { value: dmsToDecimal(Number(match[1]), Number(match[2]), Number(match[3]), match[4].toUpperCase()), hemisphere: match[4].toUpperCase() };
            });
            var latitudeItem = values.find(function (item) { return item.hemisphere === "N" || item.hemisphere === "S"; });
            var longitudeItem = values.find(function (item) { return item.hemisphere === "E" || item.hemisphere === "W"; });
            if (latitudeItem && longitudeItem && Math.abs(latitudeItem.value) <= 90 && Math.abs(longitudeItem.value) <= 180) {
                return { latitude: latitudeItem.value, longitude: longitudeItem.value };
            }
        }

        var decimalMatch = normalized.match(/^\s*(-?\d+(?:\.\d+)?)\s*[;,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (decimalMatch) {
            var latitude = Number(decimalMatch[1]);
            var longitude = Number(decimalMatch[2]);
            if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) { return { latitude: latitude, longitude: longitude }; }
        }
        return null;
    }

    function plotInputRoute() {
        var textarea = document.getElementById("movex-route-coordinates");
        var feedback = document.getElementById("movex-route-feedback");
        var lines = textarea.value.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        var parsed = lines.map(function (line, index) { return { point: parseCoordinateLine(line), line: index + 1 }; });
        var invalid = parsed.filter(function (item) { return !item.point; }).map(function (item) { return item.line; });

        feedback.className = "";
        if (lines.length < 2) {
            feedback.textContent = "Insira pelo menos duas coordenadas para formar um percurso.";
            feedback.className = "is-error";
            return;
        }
        if (invalid.length) {
            feedback.textContent = "N\u00e3o foi poss\u00edvel interpretar " + (invalid.length === 1 ? "a linha " : "as linhas ") + invalid.join(", ") + ".";
            feedback.className = "is-error";
            return;
        }

        var route = parsed.map(function (item) { return item.point; });
        updateSummary(route);
        renderMap(route);
        feedback.textContent = route.length + " coordenadas plotadas com sucesso.";
        feedback.className = "is-success";
    }

    function initialize() {
        var textarea = document.getElementById("movex-route-coordinates");
        var button = document.getElementById("movex-route-plot");
        if (!textarea || !button) { return; }
        textarea.value = sampleInput;
        updateSummary(initialCoordinates);
        renderMap(initialCoordinates);
        button.addEventListener("click", plotInputRoute);
    }

    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", initialize); }
    else { initialize(); }
})();
