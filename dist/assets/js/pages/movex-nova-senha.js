function initializeAuthParticles() {
    if (!window.particlesJS || !document.getElementById("auth-particles")) return;

    particlesJS("auth-particles", {
        particles: {
            number: { value: 90, density: { enable: true, value_area: 800 } },
            color: { value: "#ffffff" },
            shape: { type: "circle", stroke: { width: 0, color: "#000000" } },
            opacity: { value: 0.8, random: true, anim: { enable: true, speed: 1, opacity_min: 0, sync: false } },
            size: { value: 4, random: true, anim: { enable: false } },
            line_linked: { enable: false },
            move: { enable: true, speed: 2, direction: "none", random: false, straight: false, out_mode: "out" },
        },
        interactivity: {
            detect_on: "canvas",
            events: { onhover: { enable: true, mode: "bubble" }, onclick: { enable: true, mode: "repulse" }, resize: true },
            modes: { bubble: { distance: 400, size: 4, duration: 2, opacity: 0.8, speed: 3 }, repulse: { distance: 200 } },
        },
        retina_detect: true,
    });
}

const form = document.getElementById("new-password-form");
const emailInput = document.getElementById("useremail");
const passwordInput = document.getElementById("password-input");
const confirmPasswordInput = document.getElementById("confirm-password-input");
const alertElement = document.getElementById("new-password-alert");
const submitButton = document.getElementById("new-password-submit");
const apiBaseUrl = "https://uwbv2-1.onrender.com";
const token = new URLSearchParams(window.location.search).get("token");

function initializePasswordToggle() {
    document.querySelectorAll(".auth-pass-inputgroup").forEach((group) => {
        group.querySelector(".password-addon")?.addEventListener("click", () => {
            const input = group.querySelector(".password-input");
            if (input) input.type = input.type === "password" ? "text" : "password";
        });
    });
}

function setRuleState(id, isValid) {
    const element = document.getElementById(id);
    if (!element) return;
    element.classList.toggle("valid", isValid);
    element.classList.toggle("invalid", !isValid);
}

function updatePasswordChecklist() {
    setRuleState("pass-lower", /[a-z]/.test(passwordInput.value));
    setRuleState("pass-upper", /[A-Z]/.test(passwordInput.value));
    setRuleState("pass-number", /[0-9]/.test(passwordInput.value));
    setRuleState("pass-length", passwordInput.value.length >= 8);
}

function validatePasswordMatch() {
    const matches = passwordInput.value === confirmPasswordInput.value;
    confirmPasswordInput.setCustomValidity(matches ? "" : "As senhas precisam ser iguais.");
}

function setAlert(message, type) {
    alertElement.textContent = message;
    alertElement.classList.toggle("auth-alert-success", type === "success");
    alertElement.style.display = "block";
}

function clearAlert() {
    alertElement.textContent = "";
    alertElement.classList.remove("auth-alert-success");
    alertElement.style.display = "none";
}

function getApiErrorMessage(data) {
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
        return data.detail.map((item) => item.msg || item.message || JSON.stringify(item)).join(" ");
    }
    return data?.message || "Nao foi possivel salvar a nova senha.";
}

initializeAuthParticles();
initializePasswordToggle();

passwordInput.addEventListener("focus", () => {
    document.getElementById("password-contain").style.display = "block";
});
passwordInput.addEventListener("blur", () => {
    document.getElementById("password-contain").style.display = "none";
});
passwordInput.addEventListener("input", () => {
    updatePasswordChecklist();
    validatePasswordMatch();
});
confirmPasswordInput.addEventListener("input", validatePasswordMatch);

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    validatePasswordMatch();
    clearAlert();

    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
    }

    if (!token) {
        setAlert("Link de renovacao de senha invalido ou sem token.", "error");
        return;
    }

    const payload = {
        email: emailInput.value.trim(),
        nova_senha: passwordInput.value,
        confirmar_nova_senha: confirmPasswordInput.value,
    };

    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";

    try {
        const response = await fetch(
            `${apiBaseUrl}/renovacoes-senha/renovar?token=${encodeURIComponent(token)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) throw new Error(getApiErrorMessage(data));

        setAlert("Nova senha salva com sucesso. Redirecionando para o login...", "success");
        window.setTimeout(() => {
            window.location.href = "signin.html";
        }, 1200);
    } catch (error) {
        setAlert(error.message || "Nao foi possivel salvar a nova senha agora. Tente novamente.", "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Salvar nova senha";
    }
});
