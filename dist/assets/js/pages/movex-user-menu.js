(function () {
    "use strict";

    var apiBaseUrl = "https://cartracker-api.onrender.com";

    function token() {
        return sessionStorage.getItem("movex_access_token") || sessionStorage.getItem("access_token") || "";
    }

    function clearSession() {
        ["movex_access_token", "access_token", "movex_token_type", "movex_token_expires_at", "movex_user"].forEach(function (key) {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
    }

    function logout(event) {
        event.preventDefault();
        clearSession();
        window.location.replace("signin.html");
    }

    function setName(user) {
        var fullName = [user.nome, user.sobrenome].filter(Boolean).join(" ") || user.username || "Usuário";
        document.querySelectorAll(".user-name-text, .sidebar-user-name-text").forEach(function (element) {
            element.textContent = fullName;
            element.title = fullName;
        });
        sessionStorage.setItem("movex_user", JSON.stringify(user));
    }

    async function loadProfile() {
        var accessToken = token();
        if (!accessToken) return;
        try {
            var response = await fetch(apiBaseUrl + "/users/me", {
                headers: { "Accept": "application/json", "Authorization": "Bearer " + accessToken },
                cache: "no-store"
            });
            if (response.ok) setName(await response.json());
        } catch (error) {
            console.warn("Não foi possível carregar o nome do usuário.", error);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll("[data-movex-logout]").forEach(function (link) { link.addEventListener("click", logout); });
        try {
            var saved = JSON.parse(sessionStorage.getItem("movex_user") || "null");
            if (saved) setName(saved);
        } catch (error) { /* perfil será recarregado */ }
        Promise.resolve(window.movexSessionReady).then(function (ready) { if (ready !== false) loadProfile(); });
    });
})();
