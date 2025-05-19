/**
 * This makes the entire global history functionality work.
 * It is an infinite-scroll feature that isn't ever perfect.
 */
function main() {
    const historyDOM = document.querySelector("#history");

    let page = 0;
    let infiniteScrollTimeout;
    let loadedFilenames = [];

    /**
     * This updates the history by fetching the history and affecting the DOM.
     * It returns true if an update occurs and false if not.
     */
    async function updateHistoryDOM() {
        const response = await fetch("/history", {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page }),
            method: "POST"
        });

        const { history } = await response.json();
        if (history.length === 0) return false;

        for (const { filename, time } of history) {
            if (loadedFilenames.includes(filename))
                continue;

            const date = new Date(time);
            const anchor = document.createElement("a");
            anchor.href = `/results/${filename}`;
            anchor.innerHTML = `<span>${filename}</span><span class="badge">${date.toLocaleString()}</span>`;
            anchor.target = "_blank";
            historyDOM.appendChild(anchor);
            loadedFilenames.push(filename);
        }

        ++page;
        return true;
    }

    /**
     * Whenever we scroll to the bottom (with some tolerance),
     * we want to start updating the history.
     */
    historyDOM.addEventListener("scroll", function (event) {
        const element = event.currentTarget;
        if (element.scrollTop > (element.scrollHeight - element.offsetHeight - 20)) {
            if (infiniteScrollTimeout) {
                clearTimeout(infiniteScrollTimeout);
            }
            infiniteScrollTimeout = setTimeout(updateHistoryDOM, 1000);
        }
    });

    /**
     * This makes it load everything it can until the container is scrollable,
     * this makes sense when the amount of history it gets is small.
     */
    async function retrieveUntilScrollable() {
        if (historyDOM.scrollHeight - historyDOM.offsetHeight === 0 && await updateHistoryDOM()) {
            setTimeout(retrieveUntilScrollable, 100);
        }
    }

    retrieveUntilScrollable();
    document.querySelector("body").classList.remove("hidden");
}

main();