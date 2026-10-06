(function () {
    "use strict";

    var authKeys = [
        "movex_access_token",
        "movex_token_type",
        "movex_user",
        "access_token",
    ];
    var redirectingToSignin = false;

    function captureTokenFromUrl() {
        var hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        var token = hashParams.get("access_token") || "";

        if (!token) {
            return "";
        }

        sessionStorage.setItem("movex_access_token", token);
        sessionStorage.setItem("movex_token_type", "bearer");
        sessionStorage.setItem("access_token", token);

        localStorage.removeItem("movex_access_token");
        localStorage.removeItem("movex_token_type");
        localStorage.removeItem("access_token");

        if (window.history && window.history.replaceState) {
            window.history.replaceState(
                null,
                document.title,
                window.location.pathname + window.location.search
            );
        }

        return token;
    }

    function readStoredUser() {
        var rawUser = localStorage.getItem("movex_user") || sessionStorage.getItem("movex_user");

        if (!rawUser) {
            return {};
        }

        try {
            return JSON.parse(rawUser) || {};
        } catch (error) {
            return {};
        }
    }

    function compactName(parts) {
        return parts
            .filter(function (part) {
                return typeof part === "string" && part.trim();
            })
            .map(function (part) {
                return part.trim();
            })
            .join(" ");
    }

    function getStoredToken() {
        return captureTokenFromUrl()
            || localStorage.getItem("movex_access_token")
            || sessionStorage.getItem("movex_access_token")
            || localStorage.getItem("access_token")
            || sessionStorage.getItem("access_token")
            || "";
    }

    function decodeJwtPayload(token) {
        if (!token || token.split(".").length < 2) {
            return {};
        }

        try {
            var base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            var padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
            var json = decodeURIComponent(
                Array.prototype.map.call(atob(padded), function (char) {
                    return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
                }).join("")
            );

            return JSON.parse(json) || {};
        } catch (error) {
            return {};
        }
    }

    function getAuthProfile() {
        var storedUser = readStoredUser();
        storedUser = storedUser.user || storedUser.usuario || storedUser;
        var tokenUser = decodeJwtPayload(getStoredToken());

        return Object.assign({}, tokenUser, storedUser);
    }

    function getAuthenticatedUserName() {
        var user = getAuthProfile();
        var fullName = compactName([
            user.nome || user.first_name || user.firstName,
            user.sobrenome || user.last_name || user.lastName,
        ]);

        return (
            fullName ||
            user.nome_completo ||
            user.full_name ||
            user.name ||
            user.username ||
            user.login ||
            ""
        );
    }

    function getAuthenticatedUserRole() {
        var user = getAuthProfile();

        return user.cargo || user.perfil || user.role || user.tipo || "";
    }

    function formatRole(role) {
        if (!role) {
            return "Usuario";
        }

        return String(role)
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, function (character) {
                return character.toUpperCase();
            });
    }

    function getGreeting(firstName) {
        var hour = new Date().getHours();
        var period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
        return period + ", " + firstName + "!";
    }

    function setText(selector, value) {
        document.querySelectorAll(selector).forEach(function (element) {
            element.textContent = value;
        });
    }

    function setProfileImages(imageUrl, fullName) {
        if (!imageUrl) {
            return;
        }

        document.querySelectorAll(".header-profile-user, .sidebar-user-img").forEach(function (image) {
            image.src = imageUrl;
            image.alt = fullName;
        });
    }

    function revealUserIdentity() {
        document.querySelectorAll(
            ".user-name-text, .user-name-sub-text, .sidebar-user-name-text, .sidebar-user-name-sub-text, .header-profile-user"
        ).forEach(function (element) {
            element.style.visibility = "visible";
        });
    }

    function updateUserInterface() {
        var user = getAuthProfile();
        var firstName = String(user.nome || user.username || getAuthenticatedUserName() || "Usuario").trim();
        var lastName = String(user.sobrenome || "").trim();
        var fullName = compactName([firstName, lastName]) || firstName;
        var role = formatRole(getAuthenticatedUserRole());
        var imageUrl = "assets/images/users/user-dummy-img.jpg";
        var greeting = document.getElementById("movex-user-greeting");
        var greetingSubtitle = document.getElementById("movex-user-greeting-subtitle");

        setText(".user-name-text, .sidebar-user-name-text", fullName);
        setText(".user-name-sub-text", role);
        setText(".topbar-user .dropdown-header", "Bem-vindo, " + firstName + "!");
        setProfileImages(imageUrl, fullName);
        revealUserIdentity();

        if (greeting) {
            greeting.textContent = getGreeting(firstName);
        }

        if (greetingSubtitle) {
            greetingSubtitle.textContent = "Acompanhe seus relatórios e a evolução dos seus atletas.";
        }
    }

    function updateUserName() {
        var userName = getAuthenticatedUserName();
        var userRole = getAuthenticatedUserRole();

        if (!userName) {
            return;
        }

        document.querySelectorAll(".user-name-text, .sidebar-user-name-text").forEach(function (element) {
            element.textContent = userName;
        });

        document.querySelectorAll(".user-name-sub-text").forEach(function (element) {
            element.textContent = userRole;
            element.classList.toggle("d-xl-block", Boolean(userRole));
            element.classList.toggle("d-none", !userRole);
        });

        document.querySelectorAll(".dropdown-header").forEach(function (element) {
            if (/welcome|bem-vindo|ol[a\u00e1]/i.test(element.textContent)) {
                element.textContent = "Ola, " + userName;
            }
        });
    }

    function ensureMovexAuthStyles() {
        if (document.getElementById("movex-auth-styles")) {
            return;
        }

        var style = document.createElement("style");
        style.id = "movex-auth-styles";
        style.textContent = [
            ".user-name-text,.user-name-sub-text,.sidebar-user-name-text,.sidebar-user-name-sub-text,.header-profile-user{visibility:hidden;}",
            ".topbar-user .btn{min-height:70px;padding:0 20px;border:0;border-radius:0;background:rgba(255,255,255,.055);}",
            ".topbar-user .btn:hover,.topbar-user .btn:focus{background:rgba(255,255,255,.09);}",
            ".topbar-user .header-profile-user{width:42px;height:42px;border:2px solid rgba(255,255,255,.18);box-shadow:0 10px 24px rgba(0,0,0,.18);}",
            ".movex-user-menu{min-width:260px;padding:10px;border:1px solid rgba(15,23,42,.08);border-radius:12px;box-shadow:0 20px 45px rgba(15,23,42,.18);}",
            ".movex-user-card{display:flex;align-items:center;gap:12px;padding:10px 10px 12px;border-bottom:1px solid rgba(15,23,42,.08);}",
            ".movex-user-card img{width:42px;height:42px;border-radius:50%;object-fit:cover;}",
            ".movex-user-card-name{display:block;color:#172033;font-weight:700;line-height:1.2;}",
            ".movex-user-card-role{display:block;margin-top:3px;color:#7b8496;font-size:12px;line-height:1.2;}",
            ".movex-logout-link{display:flex;align-items:center;gap:10px;margin-top:8px;padding:11px 12px;border-radius:10px;color:#2b313b!important;font-weight:600;}",
            ".movex-logout-link:hover{color:#b42318!important;background:rgba(244,67,54,.08);}",
            ".movex-logout-link i{color:#b42318!important;font-size:18px;}",
        ].join("");

        document.head.appendChild(style);
    }

    function clearAuthSession() {
        authKeys.forEach(function (key) {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    function isTokenExpired(token) {
        var payload = decodeJwtPayload(token);
        var expiresAt = Number(payload.exp);

        if (!expiresAt) {
            return false;
        }

        return expiresAt * 1000 <= Date.now();
    }

    function redirectToSignin() {
        if (redirectingToSignin) {
            return;
        }

        redirectingToSignin = true;
        clearAuthSession();
        window.location.replace("signin.html");
    }

    function requireAuthenticatedSession() {
        var token = getStoredToken();

        if (!token || isTokenExpired(token)) {
            redirectToSignin();
            return false;
        }

        if (document.body) {
            document.body.style.visibility = "visible";
        }

        return true;
    }

    function installUnauthorizedResponseGuard() {
        if (typeof window.fetch === "function") {
            var originalFetch = window.fetch.bind(window);

            window.fetch = function () {
                return originalFetch.apply(null, arguments).then(function (response) {
                    if (response.status === 401) {
                        redirectToSignin();
                    }

                    return response;
                });
            };
        }

        if (typeof window.XMLHttpRequest === "function") {
            var originalOpen = window.XMLHttpRequest.prototype.open;

            window.XMLHttpRequest.prototype.open = function () {
                this.addEventListener("loadend", function () {
                    if (this.status === 401) {
                        redirectToSignin();
                    }
                });

                return originalOpen.apply(this, arguments);
            };
        }
    }

    function isLogoutItem(item) {
        var href = item.getAttribute("href") || "";
        var text = item.textContent || "";

        return (
            item.querySelector('[data-key="t-logout"]') ||
            /logout|sair/i.test(text) ||
            /auth-logout|signin\.html/i.test(href)
        );
    }

    function buildUserMenu(menu, logoutItem) {
        var currentName = document.querySelector(".topbar-user .user-name-text");
        var currentRole = document.querySelector(".topbar-user .user-name-sub-text");
        var userName = getAuthenticatedUserName() || (currentName ? currentName.textContent.trim() : "") || "Usuario";
        var userRole = getAuthenticatedUserRole() || (currentRole ? currentRole.textContent.trim() : "") || "Conta MOVEX";
        var avatar = document.querySelector(".topbar-user .header-profile-user");
        var avatarSrc = avatar ? avatar.getAttribute("src") : "assets/images/users/user-dummy-img.jpg";
        var card = document.createElement("div");
        var image = document.createElement("img");
        var text = document.createElement("div");
        var name = document.createElement("span");
        var role = document.createElement("span");

        menu.innerHTML = "";
        menu.classList.add("movex-user-menu");

        card.className = "movex-user-card";
        image.src = avatarSrc;
        image.alt = "";
        name.className = "movex-user-card-name";
        name.textContent = userName;
        role.className = "movex-user-card-role";
        role.textContent = userRole;

        text.appendChild(name);
        text.appendChild(role);
        card.appendChild(image);
        card.appendChild(text);
        menu.appendChild(card);

        logoutItem.className = "dropdown-item movex-logout-link";
        logoutItem.setAttribute("href", "signin.html");
        logoutItem.innerHTML = '<i class="mdi mdi-logout"></i><span class="align-middle">Logout</span>';
        menu.appendChild(logoutItem);
    }

    function normalizeUserDropdowns() {
        document.querySelectorAll(".dropdown-menu").forEach(function (menu) {
            var items = Array.from(menu.querySelectorAll(".dropdown-item"));
            var logoutItem = items.find(isLogoutItem);

            if (!logoutItem) {
                return;
            }

            buildUserMenu(menu, logoutItem);
        });

        document.querySelectorAll(".movex-logout-link").forEach(function (logoutLink) {
            logoutLink.addEventListener("click", function (event) {
                event.preventDefault();
                clearAuthSession();
                window.location.href = "signin.html";
            });
        });
    }

    if (!requireAuthenticatedSession()) {
        return;
    }

    installUnauthorizedResponseGuard();

    document.addEventListener("DOMContentLoaded", function () {
        ensureMovexAuthStyles();
        updateUserName();
        updateUserInterface();
        normalizeUserDropdowns();
    });
})();
