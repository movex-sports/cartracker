(function () {
    function readStoredUser() {
        const rawUser = localStorage.getItem("movex_user")
            || sessionStorage.getItem("movex_user");

        if (!rawUser) return null;

        try {
            return JSON.parse(rawUser);
        } catch (error) {
            return null;
        }
    }

    function formatRole(role) {
        if (!role) return "Usuário";

        return String(role)
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, function (character) {
                return character.toUpperCase();
            });
    }

    function getGreeting(firstName) {
        const hour = new Date().getHours();
        const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
        return `${period}, ${firstName}!`;
    }

    function setText(selector, value) {
        document.querySelectorAll(selector).forEach(function (element) {
            element.textContent = value;
        });
    }

    function setProfileImages(imageUrl, fullName) {
        if (!imageUrl) return;

        document.querySelectorAll(".header-profile-user, .sidebar-user-img").forEach(function (image) {
            image.src = imageUrl;
            image.alt = fullName;
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        const user = readStoredUser();
        if (!user) return;

        const firstName = String(user.nome || user.username || "Usuário").trim();
        const lastName = String(user.sobrenome || "").trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const role = formatRole(user.role);
        const imageUrl = user.foto_padrao_url || user.foto_url || user.avatar_url || "";

        setText(".user-name-text, .sidebar-user-name-text", fullName);
        setText(".user-name-sub-text", role);
        setText(".topbar-user .dropdown-header", `Bem-vindo, ${firstName}!`);
        setProfileImages(imageUrl, fullName);

        const greeting = document.getElementById("movex-user-greeting");
        const greetingSubtitle = document.getElementById("movex-user-greeting-subtitle");

        if (greeting) greeting.textContent = getGreeting(firstName);
        if (greetingSubtitle) {
            greetingSubtitle.textContent = "Acompanhe seus relatórios e a evolução dos seus atletas.";
        }
    });
})();
