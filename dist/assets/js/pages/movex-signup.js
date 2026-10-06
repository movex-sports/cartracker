function initializeAuthParticles() {
    if (!window.particlesJS || !document.getElementById("auth-particles")) {
        return;
    }

    particlesJS("auth-particles", {
        particles: {
            number: { value: 90, density: { enable: true, value_area: 800 } },
            color: { value: "#ffffff" },
            shape: {
                type: "circle",
                stroke: { width: 0, color: "#000000" },
                polygon: { nb_sides: 5 },
                image: { src: "img/github.svg", width: 100, height: 100 },
            },
            opacity: {
                value: 0.8,
                random: true,
                anim: { enable: true, speed: 1, opacity_min: 0, sync: false },
            },
            size: {
                value: 4,
                random: true,
                anim: { enable: false, speed: 4, size_min: 0.2, sync: false },
            },
            line_linked: { enable: false, distance: 150, color: "#ffffff", opacity: 0.4, width: 1 },
            move: {
                enable: true,
                speed: 2,
                direction: "none",
                random: false,
                straight: false,
                out_mode: "out",
                attract: { enable: false, rotateX: 600, rotateY: 1200 },
            },
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: { enable: true, mode: "bubble" },
                onclick: { enable: true, mode: "repulse" },
                resize: true,
            },
            modes: {
                grab: { distance: 400, line_linked: { opacity: 1 } },
                bubble: { distance: 400, size: 4, duration: 2, opacity: 0.8, speed: 3 },
                repulse: { distance: 200 },
                push: { particles_nb: 4 },
                remove: { particles_nb: 2 },
            },
        },
        retina_detect: true,
    });
}

function initializePasswordToggle() {
    document.querySelectorAll("form .auth-pass-inputgroup").forEach(function (group) {
        group.querySelectorAll(".password-addon").forEach(function (button) {
            button.addEventListener("click", function () {
                const input = group.querySelector(".password-input");
                if (!input) return;

                input.type = input.type === "password" ? "text" : "password";
            });
        });
    });
}

function setPasswordRuleState(element, isValid) {
    if (!element) return;

    element.classList.toggle("valid", isValid);
    element.classList.toggle("invalid", !isValid);
}

function initializePasswordChecklist(passwordInput) {
    const container = document.getElementById("password-contain");
    const lower = document.getElementById("pass-lower");
    const upper = document.getElementById("pass-upper");
    const number = document.getElementById("pass-number");
    const length = document.getElementById("pass-length");

    if (!passwordInput || !container) return;

    passwordInput.addEventListener("focus", function () {
        container.style.display = "block";
    });

    passwordInput.addEventListener("blur", function () {
        container.style.display = "none";
    });

    passwordInput.addEventListener("keyup", function () {
        setPasswordRuleState(lower, /[a-z]/.test(passwordInput.value));
        setPasswordRuleState(upper, /[A-Z]/.test(passwordInput.value));
        setPasswordRuleState(number, /[0-9]/.test(passwordInput.value));
        setPasswordRuleState(length, passwordInput.value.length >= 8);
    });
}

function initializeBootstrapValidation() {
    window.addEventListener("load", function () {
        Array.from(document.getElementsByClassName("needs-validation")).forEach(function (form) {
            form.addEventListener("submit", function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                form.classList.add("was-validated");
            });
        });
    });
}

initializeAuthParticles();
initializePasswordToggle();
initializeBootstrapValidation();

const signupForm = document.getElementById("signup-form");
        const signupAlert = document.getElementById("signup-alert");
        const signupSubmit = document.getElementById("signup-submit");
        const signupPassword = document.getElementById("password-input");
        const signupConfirmPassword = document.getElementById("confirm-password-input");
const signupEndpoint = "https://cartracker-api.onrender.com/users";

initializePasswordChecklist(signupPassword);

        function validateSignupPasswordMatch() {
            if (!signupPassword || !signupConfirmPassword) {
                return;
            }

            const passwordsMatch = signupPassword.value === signupConfirmPassword.value;
            signupConfirmPassword.setCustomValidity(passwordsMatch ? "" : "As senhas precisam ser iguais.");
        }

        signupPassword.addEventListener("input", validateSignupPasswordMatch);
        signupConfirmPassword.addEventListener("input", validateSignupPasswordMatch);
        function setSignupAlert(message, type) {
            signupAlert.textContent = message;
            signupAlert.classList.toggle("auth-alert-success", type === "success");
            signupAlert.style.display = "block";
        }

        function clearSignupAlert() {
            signupAlert.textContent = "";
            signupAlert.classList.remove("auth-alert-success");
            signupAlert.style.display = "none";
        }

        function getApiErrorMessage(data) {
            if (!data) {
                return "Nao foi possivel criar a conta.";
            }

            if (typeof data.detail === "string") {
                return data.detail;
            }

            if (Array.isArray(data.detail)) {
                return data.detail
                    .map((item) => item.msg || item.message || JSON.stringify(item))
                    .join(" ");
            }

            return data.message || "Nao foi possivel criar a conta.";
        }

        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            validateSignupPasswordMatch();
            clearSignupAlert();

            if (!signupForm.checkValidity()) {
                signupForm.classList.add("was-validated");
                return;
            }

            const payload = {
                nome: document.getElementById("first-name").value.trim(),
                sobrenome: document.getElementById("last-name").value.trim(),
                cpf: document.getElementById("cpf-input").value.trim(),
                email: document.getElementById("useremail").value.trim(),
                rua: document.getElementById("street-input").value.trim(),
                numero: document.getElementById("number-input").value.trim(),
                cep: document.getElementById("cep-input").value.trim(),
                bairro: document.getElementById("neighborhood-input").value.trim(),
                cidade: document.getElementById("city-input").value.trim(),
                estado: document.getElementById("state-input").value.trim().toUpperCase(),
                contato: document.getElementById("contact-input").value.replace(/\D/g, ""),
                username: document.getElementById("username").value.trim(),
                senha: signupPassword.value,
            };

            signupSubmit.disabled = true;
            signupSubmit.textContent = "Criando conta...";

            try {
                const response = await fetch(signupEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(getApiErrorMessage(data));
                }

                setSignupAlert("Cadastro criado com sucesso. Redirecionando para o login...", "success");

                window.setTimeout(() => {
                    window.location.href = "signin.html";
                }, 1200);
            } catch (error) {
                setSignupAlert(error.message || "Nao foi possivel criar a conta agora. Tente novamente.", "error");
            } finally {
                signupSubmit.disabled = false;
                signupSubmit.textContent = "Criar conta";
            }
        });

