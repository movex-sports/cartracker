function getChartColorsArray(chartId) {
    if (document.getElementById(chartId) !== null) {
        var colors = document.getElementById(chartId).getAttribute("data-colors");
        if (colors) {
            return JSON.parse(colors).map(function (value) {
                var color = value.replace(" ", "");
                if (color.indexOf(",") === -1) {
                    return getComputedStyle(document.documentElement).getPropertyValue(color) || color;
                }

                var rgbaValue = value.split(",");
                if (rgbaValue.length === 2) {
                    return "rgba(" + getComputedStyle(document.documentElement).getPropertyValue(rgbaValue[0]) + "," + rgbaValue[1] + ")";
                }

                return color;
            });
        }

        console.warn("data-colors attributes not found on", chartId);
    }
}

(function () {
    var intensityColors = getChartColorsArray("athlete_intensity_chart");
    if (!intensityColors) return;

    var baseDate = new Date("2026-07-11T08:00:00").getTime();
    var minute = 60 * 1000;
    var intensityData = [
        36, 42, 48, 55, 63, 71, 78, 84, 88, 92, 96, 91,
        86, 79, 73, 67, 61, 58, 64, 72, 81, 89, 93, 97,
        94, 88, 82, 74, 66, 59, 52, 46, 41, 38, 44, 57,
        69, 77, 85, 91, 95, 90, 83, 76, 68, 60, 53, 47
    ].map(function (value, index) {
        return {
            x: baseDate + index * minute,
            y: value
        };
    });
    window.athleteIntensityData = intensityData;

    var zoneColors = {
        recovery: "#e9f7ef",
        light: "#d7f3ea",
        moderate: "#fff4d6",
        strong: "#ffe6d6",
        max: "#fce0e0"
    };

    var options = {
        series: [{
            name: "Intensidade",
            data: intensityData
        }],
        chart: {
            type: "area",
            stacked: false,
            height: 340,
            zoom: {
                type: "x",
                enabled: true,
                autoScaleYaxis: false
            },
            toolbar: {
                autoSelected: "zoom"
            }
        },
        annotations: {
            yaxis: [
                { y: 0, y2: 40, fillColor: zoneColors.recovery, opacity: 0.55, label: { text: "0-40%", borderColor: "#7bbf93", style: { background: "#7bbf93", color: "#fff" } } },
                { y: 40, y2: 60, fillColor: zoneColors.light, opacity: 0.5, label: { text: "40-60%", borderColor: "#4fb99f", style: { background: "#4fb99f", color: "#fff" } } },
                { y: 60, y2: 80, fillColor: zoneColors.moderate, opacity: 0.45, label: { text: "60-80%", borderColor: "#e7b84b", style: { background: "#e7b84b", color: "#fff" } } },
                { y: 80, y2: 90, fillColor: zoneColors.strong, opacity: 0.5, label: { text: "80-90%", borderColor: "#f1963b", style: { background: "#f1963b", color: "#fff" } } },
                { y: 90, y2: 100, fillColor: zoneColors.max, opacity: 0.5, label: { text: "90-100%", borderColor: "#f06548", style: { background: "#f06548", color: "#fff" } } }
            ]
        },
        colors: intensityColors,
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: "smooth",
            width: 3
        },
        markers: {
            size: 0,
            hover: {
                sizeOffset: 5
            }
        },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                inverseColors: false,
                opacityFrom: 0.35,
                opacityTo: 0.02,
                stops: [0, 90, 100]
            }
        },
        grid: {
            borderColor: "#eef0f4",
            yaxis: {
                lines: {
                    show: true
                }
            }
        },
        yaxis: {
            min: 0,
            max: 100,
            tickAmount: 5,
            labels: {
                formatter: function (value) {
                    return Math.round(value) + "%";
                }
            },
            title: {
                text: "Intensidade",
                style: {
                    fontWeight: 500
                }
            }
        },
        xaxis: {
            type: "datetime",
            labels: {
                datetimeUTC: false
            }
        },
        tooltip: {
            shared: false,
            x: {
                format: "HH:mm"
            },
            y: {
                formatter: function (value) {
                    return value.toFixed(0) + "%";
                }
            }
        }
    };

    new ApexCharts(document.querySelector("#athlete_intensity_chart"), options).render();
})();

(function () {
    var chartElement = document.querySelector("#athlete_intensity_zones_chart");
    if (!chartElement) return;

    var zoneDefinitions = [
        { name: "0-40%", min: 0, max: 40, color: "#299cdb" },
        { name: "41-60%", min: 40, max: 60, color: "#f1963b" },
        { name: "61-80%", min: 60, max: 80, color: "#f7b84b" },
        { name: "81-90%", min: 80, max: 90, color: "#0ab39c" },
        { name: "91-100%", min: 90, max: 100, color: "#405189" }
    ];
    var series = zoneDefinitions.map(function (zone, zoneIndex) {
        return {
            name: zone.name,
            data: []
        };
    });

    var options = {
        series: series,
        chart: {
            type: "bar",
            height: 340,
            stacked: true,
            toolbar: { show: false }
        },
        colors: zoneDefinitions.map(function (zone) { return zone.color; }),
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: "62%",
                borderRadius: 2
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (value) {
                return value > 0 ? Number(value).toLocaleString("pt-BR") : "";
            },
            style: { fontSize: "11px", colors: ["#fff"] },
            dropShadow: { enabled: false }
        },
        stroke: { width: 1, colors: ["#fff"] },
        xaxis: {
            categories: [],
            min: 0,
            labels: { formatter: function (value) { return Number(value).toFixed(0); } },
            title: { text: "Quantidade de sprints" }
        },
        legend: {
            position: "top",
            horizontalAlign: "center",
            markers: { radius: 3 }
        },
        grid: { borderColor: "#f1f1f1" },
        tooltip: {
            y: { formatter: function (value) { return Number(value).toLocaleString("pt-BR") + " sprints"; } }
        },
        noData: { text: "Selecione um jogador para carregar os sprints." }
    };

    window.athleteIntensityZonesChart = new ApexCharts(chartElement, options);
    window.athleteIntensityZonesChart.render();
})();

(function () {
    var speedHistoryColors = getChartColorsArray("athlete_speed_history_chart");
    if (!speedHistoryColors) return;

    var options = {
        chart: {
            height: 340,
            type: "line",
            zoom: {
                enabled: false
            },
            toolbar: {
                show: false
            }
        },
        colors: speedHistoryColors,
        dataLabels: {
            enabled: true,
            formatter: function (value) {
                return value.toFixed(1);
            },
            background: {
                enabled: true,
                borderRadius: 3,
                opacity: 0.92
            }
        },
        stroke: {
            width: [3, 3],
            curve: "straight"
        },
        series: [
            {
                name: "Velocidade máxima por jogo",
                data: []
            },
            {
                name: "Média das máximas",
                data: []
            }
        ],
        title: {
            text: "Velocidade máxima por jogo",
            align: "left",
            style: {
                fontWeight: 500
            }
        },
        grid: {
            row: {
                colors: ["transparent", "transparent"],
                opacity: 0.2
            },
            borderColor: "#f1f1f1"
        },
        markers: {
            size: 6,
            hover: {
                sizeOffset: 4
            }
        },
        xaxis: {
            categories: [],
            labels: {
                show: true,
                rotate: -45,
                trim: true,
                hideOverlappingLabels: true,
                style: {
                    fontSize: "11px"
                }
            },
            tooltip: {
                enabled: false
            },
            title: {
                text: ""
            }
        },
        yaxis: {
            title: {
                text: "Velocidade (km/h)"
            },
            min: 0,
            forceNiceScale: true,
            labels: {
                formatter: function (value) {
                    return value.toFixed(0);
                }
            }
        },
        legend: {
            position: "top",
            horizontalAlign: "right",
            floating: true,
            offsetY: -25,
            offsetX: -5
        },
        tooltip: {
            x: {
                show: true
            },
            y: {
                formatter: function (value) {
                    return value.toFixed(1) + " km/h";
                }
            }
        },
        responsive: [{
            breakpoint: 600,
            options: {
                chart: {
                    toolbar: {
                        show: false
                    }
                },
                legend: {
                    show: false
                }
            }
        }]
    };

    window.athleteSpeedHistoryChart = new ApexCharts(document.querySelector("#athlete_speed_history_chart"), options);
    window.athleteSpeedHistoryChart.render();
})();
