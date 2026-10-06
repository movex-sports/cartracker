(function () {
    "use strict";

    const canvas = document.getElementById("sprints-map-canvas");
    const template = document.getElementById("sprints-map-template");
    const status = document.getElementById("sprints-map-status");
    const description = document.getElementById("sprints-map-description");
    const note = document.getElementById("sprints-map-note");

    if (!canvas || !template) return;

    const context = canvas.getContext("2d");
    const PLOT_AREA = {
        left: 94,
        right: 791,
        top: 228,
        bottom: 1192
    };

    function finiteNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function normalizeField(payload) {
        const field = payload?.field || payload?.campo || {};
        const width = finiteNumber(field.width ?? field.largura ?? payload?.field_x ?? payload?.kx ?? payload?.limite_x);
        const height = finiteNumber(field.height ?? field.altura ?? payload?.field_y ?? payload?.ky ?? payload?.limite_y);

        if (!width || !height || width <= 0 || height <= 0) return null;
        return { width: width, height: height };
    }

    function normalizeSprints(payload) {
        const source = Array.isArray(payload)
            ? payload
            : payload?.sprints || payload?.segmentos || payload?.data || payload?.coordenadas || [];

        if (!Array.isArray(source)) return [];

        const containsCoordinates = source.length > 0 && source.every(function (item) {
            return finiteNumber(item?.x) !== null
                && finiteNumber(item?.y) !== null
                && item?.start_x == null
                && item?.inicio_x == null
                && item?.start == null
                && item?.inicio == null;
        });

        if (containsCoordinates) {
            return source.slice(1).map(function (point, index) {
                const previous = source[index];
                return {
                    id: index + 1,
                    startX: finiteNumber(previous.x),
                    startY: finiteNumber(previous.y),
                    endX: finiteNumber(point.x),
                    endY: finiteNumber(point.y)
                };
            });
        }

        return source.map(function (item, index) {
            const start = item?.start || item?.inicio || {};
            const end = item?.end || item?.fim || {};
            const sprint = {
                id: item?.id ?? item?.numero ?? index + 1,
                startX: finiteNumber(item?.start_x ?? item?.inicio_x ?? start.x),
                startY: finiteNumber(item?.start_y ?? item?.inicio_y ?? start.y),
                endX: finiteNumber(item?.end_x ?? item?.fim_x ?? end.x),
                endY: finiteNumber(item?.end_y ?? item?.fim_y ?? end.y)
            };

            return Object.values(sprint).slice(1).every(function (value) { return value !== null; })
                ? sprint
                : null;
        }).filter(Boolean);
    }

    function fieldToImage(fieldX, fieldY, field) {
        const plotWidth = PLOT_AREA.right - PLOT_AREA.left;
        const plotHeight = PLOT_AREA.bottom - PLOT_AREA.top;
        const scaleX = plotHeight / field.width;
        const scaleY = plotWidth / field.height;

        return {
            x: PLOT_AREA.left + (fieldY * scaleY),
            y: PLOT_AREA.top + (fieldX * scaleX)
        };
    }

    function drawArrow(start, end) {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLength = 18;

        context.save();
        context.strokeStyle = "#ff2d2d";
        context.fillStyle = "#ff2d2d";
        context.lineWidth = 4;
        context.lineCap = "round";
        context.lineJoin = "round";

        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();

        context.beginPath();
        context.moveTo(end.x, end.y);
        context.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        context.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        context.closePath();
        context.fill();
        context.restore();
    }

    function drawPoint(point, color, radius) {
        context.save();
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
        context.strokeStyle = "#111111";
        context.lineWidth = 1.5;
        context.stroke();
        context.restore();
    }

    function drawLabel(point, label) {
        const text = String(label);
        const labelY = point.y - 18;

        context.save();
        context.font = "bold 15px Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        const width = Math.max(25, context.measureText(text).width + 14);

        context.fillStyle = "rgba(21, 21, 21, 0.88)";
        context.beginPath();
        context.roundRect(point.x - width / 2, labelY - 13, width, 26, 13);
        context.fill();

        context.fillStyle = "#ffffff";
        context.fillText(text, point.x, labelY);
        context.restore();
    }

    function clear() {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    function setStatus(text, type) {
        if (!status) return;
        const classes = {
            success: "badge bg-success-subtle text-success",
            error: "badge bg-danger-subtle text-danger",
            waiting: "badge bg-secondary-subtle text-secondary"
        };
        status.className = classes[type] || classes.waiting;
        status.textContent = text;
    }

    function setState(text, type, message) {
        setStatus(text, type);
        if (description && message) description.textContent = message;
        if (note) note.hidden = false;
    }

    function render(payload) {
        clear();
        const field = normalizeField(payload);
        const sprints = normalizeSprints(payload);

        if (!field) {
            setStatus("Dados incompletos", "error");
            if (note) note.lastChild.textContent = " Informe as dimensões do campo para posicionar os trajetos.";
            return false;
        }

        sprints.forEach(function (sprint) {
            const start = fieldToImage(sprint.startX, sprint.startY, field);
            const end = fieldToImage(sprint.endX, sprint.endY, field);
            drawArrow(start, end);
            drawPoint(start, "#ffe45c", 6);
            drawPoint(end, "#ff2d2d", 6.5);
            drawLabel(end, sprint.id);
        });

        setStatus(sprints.length ? "Mapa carregado" : "Sem sprints", sprints.length ? "success" : "waiting");
        if (description) {
            description.textContent = sprints.length
                ? `${sprints.length} ${sprints.length === 1 ? "sprint plotado" : "sprints plotados"} no relatório.`
                : "Nenhum segmento de sprint foi retornado para o relatório.";
        }
        if (note) note.hidden = sprints.length > 0;
        return true;
    }

    window.MovexSprintMap = {
        clear: clear,
        render: render,
        fieldToImage: fieldToImage,
        setState: setState
    };
})();
