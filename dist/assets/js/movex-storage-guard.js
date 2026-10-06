(function () {
    "use strict";

    var authKeys = [
        "movex_access_token",
        "movex_token_type",
        "movex_user",
        "access_token",
    ];
    var originalClear = Storage.prototype.clear;

    Storage.prototype.clear = function () {
        if (this !== window.sessionStorage) {
            return originalClear.call(this);
        }

        var authSession = {};

        authKeys.forEach(function (key) {
            var value = sessionStorage.getItem(key);

            if (value !== null) {
                authSession[key] = value;
            }
        });

        originalClear.call(sessionStorage);

        Object.keys(authSession).forEach(function (key) {
            sessionStorage.setItem(key, authSession[key]);
        });
    };
})();
