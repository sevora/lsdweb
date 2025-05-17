/**
 * Written by Ralph Louis Gopez
 * So it's been a long time since I wrote pure JavaScript. Having no typing is kind of bad.
 * This script makes the index.html interactive and actually work. I can put as much comment 
 * as I want and I'm assuming this file is way smaller than when I include an entire framework.
 */
function main() {
    loadSuggestions();

    /**
     * Refer to ./index.html for the DOM elements below.
     * Otherwise this might not make much sense at all.
     */
    const errorDOM = document.querySelector("#error");
    const suggestionsDOM = document.querySelector("#suggestions");
    const contextDOM = document.querySelector("#context");
    const contextCounterDOM = document.querySelector("#context-counter");
    const optionsOpenDOM = document.querySelector("#options-open");
    const optionsCloseDOM = document.querySelector("#options-close");
    const optionsDOM = document.querySelector("#options");
    const searchDOM = document.querySelector("#search");
    const openAIDOM = document.querySelector("#openai");
    const loaderDOM = document.querySelector("#loader");

    /**
     * Tries to load the value for the input if it is saved
     * on localStorage already.
     */
    const savedKey = localStorage.getItem("openAIAPIKey");
    if (savedKey) openAIDOM.value = savedKey;

    const urlParameter = new URLSearchParams(window.location.search);
    const hasError = urlParameter.get("error");
    if (hasError) errorDOM.classList.remove("none");

    /**
     * This fetches the suggestions for the context search bar
     * which we can click to automatically fill the content in.
     */
    async function loadSuggestions() {
         const response = await fetch("/suggestions", { method: "POST" });

        const { suggestions } = await response.json();
        
        for (const suggestion of suggestions) {
            const button = document.createElement("button");
            button.innerHTML = suggestion;
            button.addEventListener("click", function() {
                contextDOM.value = suggestion;
                searchDOM.classList.remove("disabled");
                contextCounterDOM.innerHTML = `${suggestion.length}/32`;
            });
            suggestionsDOM.append(button);
        }
    }

    /**
     * This is the search bar itself. We want to disable or enable
     * the search button depending on whether the input has content.
     */
    contextDOM.addEventListener("input", function (event) {
        const length = event.currentTarget.value.trim().length;
        const method = length > 0 ? "remove" : "add";
        searchDOM.classList[method]("disabled");
        contextCounterDOM.innerHTML = `${length}/32`;
    });

    /**
     * This is the search button which does various things
     * but the main point is to engage the search.
     */
    searchDOM.addEventListener("click", async function () {
        const context = contextDOM.value.trim();
        if (context.length === 0) return;

        const openAIAPIKey = openAIDOM.value.trim();

        if (openAIAPIKey.length === 0) {
            optionsDOM.classList.remove("none");
            history.pushState(null, null, window.location.href);

            if (openAIDOM.classList.contains("required")) {
                openAIDOM.focus();
                return;
            }

            openAIDOM.classList.add("required");
            return;
        }

        window.history.pushState({}, document.title, window.location.pathname);
        errorDOM.classList.add("none");
        loaderDOM.classList.remove("none");

        const response = await fetch("/hallucinate", {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context, openAIAPIKey }),
            method: "POST"
        });

        loaderDOM.classList.add("none");

        const { redirectTo } = await response.json();
        window.location.href = redirectTo;
    });

    /**
     * The option has to push the history because I want it so that
     * the options close whenever the user navigates back instead of
     * having them click the close icon.
     */
    optionsOpenDOM.addEventListener("click", function () {
        optionsDOM.classList.remove("none");
        history.pushState(null, null, window.location.href);
    });

    optionsCloseDOM.addEventListener("click", function () {
        history.back();
    });

    /**
     * Whenever the OpenAI input element text changes, we want to store
     * the value in localStorage.
     */
    openAIDOM.addEventListener("input", function (event) {
        const value = event.currentTarget.value.trim();
        localStorage.setItem("openAIAPIKey", value);
    });

    /**
     * If the options are currently being rendered,
     * we want to unrender them when the user navigates
     * back.
     */
    window.addEventListener("popstate", function () {
        if (!optionsDOM.classList.contains("none"))
            optionsDOM.classList.add("none");
    });
}

main();