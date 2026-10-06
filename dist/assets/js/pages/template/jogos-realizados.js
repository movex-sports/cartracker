const API_BASE_URL = "https://sua-api.com/api";

async function carregarJogosRecentes() {
    const lista = document.getElementById("lista-relatorios");

    if (!lista) return;

    try {
        const resposta = await fetch(`${API_BASE_URL}/relatorios/recentes`);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar relatórios recentes");
        }

        const dados = await resposta.json();

        lista.innerHTML = "";

        dados.forEach((item) => {
            lista.innerHTML += `
                <li class="py-1">
                    <a href="#" class="text-muted">
                        ${item.nome_relatorio}
                        <span class="float-end">(${item.data})</span>
                    </a>
                </li>
            `;
        });

    } catch (erro) {
        console.error("Erro:", erro);
        lista.innerHTML = `<li class="py-1 text-danger">Erro ao carregar jogos</li>`;
    }
}

document.addEventListener("DOMContentLoaded", carregarJogosRecentes);