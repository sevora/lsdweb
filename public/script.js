/**
 * Refer to ./index.html for the DOM elements below.
 * Otherwise this might not make much sense at all.
 */
const errorDOM = document.querySelector("#error");
const suggestionsDOM = document.querySelector("#suggestions"); // TODO: not yet implemented
const contextDOM = document.querySelector("#context");
const globalHistoryDOM = document.querySelector("#global-history");
const optionToggleDOM = document.querySelector("#option-toggle");
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
 * This is the search bar itself. We want to disable or enable
 * the search button depending on whether the input has content.
 */
contextDOM.addEventListener("input", function (event) {
    const method = event.currentTarget.value.trim().length > 0 ? "remove" : "add";
    searchDOM.classList[method]("disabled");
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
        optionsDOM.classList.remove("hidden");

        if (openAIDOM.classList.contains("required")) {
            openAIDOM.focus();
            return;
        }

        openAIDOM.classList.add("required");
        return;
    }

    optionsDOM.classList.add("hidden");
    loaderDOM.classList.remove("none");
    
    const response = await fetch("/hallucinate", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ context, openAIAPIKey })
    });

    window.location.replace((await response.json()).redirectTo);
});

/**
 * This element could simply be a link. Not gonna lie, 
 * this is kind of unnecessary.
 */
globalHistoryDOM.addEventListener("click", function () {
    window.location.replace("/history");
});

/**
 * The options button will toggle the visibility of the options.
 * The options just contain the OpenAI API key input and disclaimer.
 */
optionToggleDOM.addEventListener("click", function () {
    const method = optionsDOM.classList.contains("hidden") ? "remove" : "add";
    optionsDOM.classList[method]("hidden");
});

/**
 * Whenever the OpenAI input element text changes, we want to store
 * the value in localStorage.
 */
openAIDOM.addEventListener("input", function(event) {
    const value = event.currentTarget.value.trim();
    localStorage.setItem("openAIAPIKey", value);
});