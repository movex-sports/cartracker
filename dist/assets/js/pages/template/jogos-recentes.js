const API_BASE_URL = "http://127.0.0.1:5001/api";
const API_ROOT_URL = "http://127.0.0.1:5001";

async function carregarJogosRecentes() {
    const lista = document.getElementById("lista-relatorios");

    if (!lista) return;

    try {
        const url = `${API_BASE_URL}/relatorios/recentes`;
        console.log("Buscando:", url);

        const resposta = await fetch(url);
        console.log("Status:", resposta.status);

        if (!resposta.ok) {
            const textoErro = await resposta.text();
            console.error("Resposta com erro:", textoErro);
            throw new Error("Erro ao buscar relatórios");
        }

        const dados = await resposta.json();
        console.log("Dados recebidos:", dados);

        lista.innerHTML = "";

        dados.forEach((item) => {
            lista.innerHTML += `
                <li class="py-1">
                    <a href="#"
                       class="text-muted relatorio-item"
                       data-relatorio-number="${item.relatorio_number}">
                        ${item.nome_relatorio}
                        <span class="float-end">(${item.data})</span>
                    </a>
                </li>
            `;
        });

    } catch (erro) {
        console.error("Erro completo:", erro);
        lista.innerHTML = `<li class="py-1 text-danger">Erro ao carregar jogos</li>`;
    }
}

async function gerarHeatmapPorRelatorio(relatorioNumber) {
    console.log("Chamando heatmap para relatório:", relatorioNumber);

    const loading = document.getElementById("heatmapLoading");
    const img = document.getElementById("heatmapImg");

    try {
        loading.textContent = "Gerando mapa de calor...";
        loading.style.display = "block";
        img.style.display = "none";

        const body = new URLSearchParams();
        body.set("relatorio_number", relatorioNumber);
        body.set("tag", "1");

        const resposta = await fetch(`${API_ROOT_URL}/generate_heatmap_by_relatorio`, {
            method: "POST",
            body: body
        });

        const dados = await resposta.json();
        console.log("Resposta heatmap:", dados);

        if (!resposta.ok) {
            throw new Error(dados.error || "Erro ao gerar heatmap");
        }

        img.src = `${API_ROOT_URL}/heatmap_image?t=${Date.now()}`;
        img.style.display = "block";
        loading.style.display = "none";

    } catch (erro) {
        console.error("Erro ao gerar heatmap:", erro);

        loading.textContent = erro.message;
        loading.style.display = "block";
        img.style.display = "none";
    }
}

document.addEventListener("click", function (e) {
    const item = e.target.closest(".relatorio-item");

    if (!item) return;

    e.preventDefault();

    const relatorioNumber = item.dataset.relatorioNumber;

    console.log("Relatório clicado:", relatorioNumber);

    if (!relatorioNumber) {
        console.error("relatorio_number não encontrado no item clicado");
        return;
    }

    gerarHeatmapPorRelatorio(relatorioNumber);
});

document.addEventListener("DOMContentLoaded", carregarJogosRecentes);