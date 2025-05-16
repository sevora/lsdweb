const historyDOM = document.querySelector("#history");

/**
 * This is one of the laziest ways this page could work.
 */
async function loadHistory() {
    const response = await fetch("/history", {
        headers: { "Content-Type": "application/json" },
        method: "POST"
    });

    const json = await response.json();

    for (filename of json.history) {
        const listItem = document.createElement("li");
        const anchor = document.createElement("a");
        listItem.appendChild(anchor);
        anchor.href = `/results/${filename}`;
        anchor.innerHTML = filename;
        anchor.target = "_blank";
        historyDOM.appendChild(listItem)
    }
}

loadHistory();