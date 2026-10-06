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

initializeAuthParticles();
initializePasswordToggle();

        const loginForm = document.getElementById("login-form");
        const loginAlert = document.getElementById("login-alert");
        const loginSubmit = document.getElementById("login-submit");
        const apiBaseUrl = "https://uwbv2-1.onrender.com";

        function setLoginAlert(message) {
            loginAlert.textContent = message;
            loginAlert.style.display = "block";
        }

        function clearLoginAlert() {
            loginAlert.textContent = "";
            loginAlert.style.display = "none";
        }

        function getApiErrorMessage(data, fallback) {
            if (typeof data?.detail === "string") return data.detail;
            if (typeof data?.message === "string") return data.message;
            return fallback;
        }

        async function requestLogin(login, senha) {
            return fetch(`${apiBaseUrl}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ login, senha }),
            });
        }

        async function requestLoginWithWakeUp(login, senha) {
            try {
                return await requestLogin(login, senha);
            } catch (error) {
                // O Render pode encerrar a instancia por inatividade. Acorda a API
                // e repete o login uma vez quando a primeira conexao nem chegou nela.
                await fetch(`${apiBaseUrl}/`, { cache: "no-store" });
                return requestLogin(login, senha);
            }
        }

        function saveAuthSession(data) {
            const authenticatedUser = data.user || data.usuario || data.data?.user || data.data?.usuario || {};

            sessionStorage.setItem("movex_access_token", data.access_token);
            sessionStorage.setItem("movex_token_type", data.token_type || "bearer");
            sessionStorage.setItem("movex_user", JSON.stringify(authenticatedUser));
            sessionStorage.setItem("access_token", data.access_token);

            localStorage.removeItem("movex_access_token");
            localStorage.removeItem("movex_token_type");
            localStorage.removeItem("movex_user");
            localStorage.removeItem("access_token");
        }

        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            clearLoginAlert();

            const login = document.getElementById("username").value.trim();
            const senha = document.getElementById("password-input").value;

            if (!login || !senha) {
                setLoginAlert("Informe usuario e senha para continuar.");
                return;
            }

            loginSubmit.disabled = true;
            loginSubmit.textContent = "Entrando...";

            try {
                const response = await requestLoginWithWakeUp(login, senha);

                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data.ok || !data.access_token) {
                    throw new Error(getApiErrorMessage(data, "Usuario ou senha invalidos."));
                }

                saveAuthSession(data);

                const redirectUrl = window.location.protocol === "file:"
                    ? `painel.html#access_token=${encodeURIComponent(data.access_token)}`
                    : "painel.html";

                window.location.href = redirectUrl;
            } catch (error) {
                const isNetworkError = error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(error.message || "");
                setLoginAlert(isNetworkError
                    ? "Nao foi possivel conectar ao servidor. Verifique sua internet e tente novamente em alguns segundos."
                    : (error.message || "Nao foi possivel entrar agora. Tente novamente."));
            } finally {
                loginSubmit.disabled = false;
                loginSubmit.textContent = "Entrar na plataforma";
            }
        });

