(function () {
    "use strict";

    var renewEndpoint = "https://cartracker-api.onrender.com/auth/renew";
    var accessTokenKeys = ["movex_access_token", "access_token"];

    function clearSession() {
        [
            "movex_access_token",
            "access_token",
            "movex_token_type",
            "movex_token_expires_at",
            "movex_user"
        ].forEach(function (key) {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
    }

    function getAccessToken() {
        for (var index = 0; index < accessTokenKeys.length; index += 1) {
            var token = sessionStorage.getItem(accessTokenKeys[index]);
            if (token) return token;
        }
        return "";
    }

    function redirectToSignin() {
        clearSession();
        window.location.replace("signin.html");
    }

    function saveRenewedSession(data) {
        var expiresIn = Number(data.expires_in) || 600;
        sessionStorage.setItem("movex_access_token", data.access_token);
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("movex_token_type", data.token_type || "bearer");
        sessionStorage.setItem("movex_token_expires_at", String(Date.now() + expiresIn * 1000));
    }

    async function renewSession() {
        var token = getAccessToken();
        if (!token) {
            redirectToSignin();
            return false;
        }

        try {
            var response = await fetch(renewEndpoint, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                },
                cache: "no-store"
            });

            if (response.status === 401 || response.status === 403) {
                redirectToSignin();
                return false;
            }

            var data = await response.json().catch(function () { return {}; });
            if (!response.ok || !data.access_token) {
                throw new Error(data.detail || data.message || "Nao foi possivel renovar a sessao.");
            }

            saveRenewedSession(data);
            window.dispatchEvent(new CustomEvent("movex:session-renewed", { detail: data }));
            return true;
        } catch (error) {
            console.error("Falha ao renovar a sessao MOVEX.", error);
            return false;
        } finally {
            document.documentElement.classList.remove("movex-session-pending");
        }
    }

    window.movexRenewSession = renewSession;
    window.movexSessionReady = renewSession();
})();
