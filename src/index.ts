import "dotenv/config";
import zod from "zod";
import express from "express";
import openai from "openai";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from "express-rate-limit";

import fs from "fs";
import http from "http";
import path from "path";

import zodVerify from "./helpers/zod-verify";

import { 
    MAX_RESULT_FILES, 
    OPEN_AI_CHAT_MODEL 
} from "./options";
import "./cleanup-results";

const PORT = Number(process.env.PORT) || 80;
const application = express();
const server = http.createServer(application);

const systemPrompt = fs.readFileSync("./prompts/system.txt", { encoding: "utf8", flag: "r" });
const htmlTemplate = fs.readFileSync("./templates/index.html", { encoding: "utf8", flag: "r" });
const historyTemplate = fs.readFileSync("./templates/history.html", { encoding: "utf8", flag: "r" });

/**
 * The results will all be temporarily saved under
 * the public results folder, therefore this 
 * folder must be generated automatically.
 */
if (!fs.existsSync("./public/results")) {
    fs.mkdirSync("./public/results");
}

/**
 * IP-based rate limiter to deter attacks. However, it is important 
 * to note that clients may have the same public IP address. 
 * Take into consideration the potential number of users at a given 
 * time within the same location.
 */
application.use(
    rateLimit({
        windowMs: 5 * 60 * 1000,
        limit: 250,
        standardHeaders: 'draft-8',
        legacyHeaders: false
    })
);

/**
 * This makes it so that requests that do not have an extension are
 * automatically interpreted as request for the same file but with
 * an HTML extension. For example, a GET /index will serve
 * /index.html and so on.
 */
application.use((request, _response, next) => {
    if (request.method === "GET" && path.extname(request.path).length === 0 && !["/", "/history"].includes(request.path))
        request.url += ".html";
    next();
});

application.use(express.static("public"));
application.use(express.json());

application.get("/health", (_request, response) => {
    response.sendStatus(200);
});

/**
 * POST /hallucinate
 * This generates the webpage that the client asks for. 
 * In case there are any errors, the client will be redirected
 * to the index page but with query string signifying an error occured. 
 */
application.post("/hallucinate", async (request, response) => {
    const parameters = zodVerify(zod.object({
        context: zod.string().trim().min(1).max(32),
        openAIAPIKey: zod.string().startsWith("sk-")
    }), request);

    if (!parameters) {
        response.json({ redirectTo: `/?error=1` });
        return;
    }

    let { context, openAIAPIKey } = parameters;
    const openAIClient = new openai({ apiKey: openAIAPIKey });

    const indexCompletion = await openAIClient.chat.completions.create({
        model: OPEN_AI_CHAT_MODEL,
        messages: [
            { role: "developer", content: systemPrompt },
            { role: "developer", content: `context: ${context}` },
            { role: "developer", content: "goal: index" }
        ],
    });

    const indexContent = indexCompletion.choices[0].message.content;

    if (!indexContent) {
        response.json({ redirectTo: `/?error=1` });
        return;
    }

    /**
     * Refer to the system prompt about what this is.
     * But essentially, this includes key information
     * about the webpage to be created.
     */
    interface IndexContent {
        title: string;
        body: string;
        shortcode: string;
    };

    const { title, body, shortcode } = JSON.parse(indexContent) as IndexContent;

    const cssCompletion = await openAIClient.chat.completions.create({
        model: OPEN_AI_CHAT_MODEL,
        messages: [
            { role: "developer", content: systemPrompt },
            { role: "developer", content: `context: ${context}` },
            { role: "developer", content: `body: ${body}` },
            { role: "developer", content: "goal: css" }
        ],
    });

    const cssContent = cssCompletion.choices[0].message.content;

    if (!cssContent) {
        response.json({ redirectTo: `/?error=1` });
        return;
    }

    const scriptCompletion = await openAIClient.chat.completions.create({
        model: OPEN_AI_CHAT_MODEL,
        messages: [
            { role: "developer", content: systemPrompt },
            { role: "developer", content: `context: ${context}` },
            { role: "developer", content: `body: ${body}` },
            { role: "developer", content: `css: ${cssContent}` },
            { role: "developer", content: "goal: js" }
        ],
    });

    const scriptContent = scriptCompletion.choices[0].message.content;
    if (!scriptContent) {
        response.json({ redirectTo: `/?error=1` });
        return;
    }

    /**
     * This part bundles everything from the markup, styling,
     * and scripting which will be temporarily saved in the results
     * folder.
     */
    const $ = cheerio.load(htmlTemplate);
    const style = $(`<style>${cssContent}</style>`);
    const script = $(`<script>${scriptContent}</script>`);
    $("head").append(style);
    $("title").html(title);
    $("body").html(body);
    $("body").append(script);

    const shortcodeUnique = `${shortcode}-${uuidv4()}`;
    await fs.promises.writeFile(`./public/results/${shortcodeUnique}.html`, $.html());

    response.json({ redirectTo: `/results/${shortcodeUnique}` });
});

/**
 * GET /history
 * This is the global history of the server which lists all the 
 * existing generated pages so far. However it limits the results
 * to the newest 70% of page links and the oldest 30% are
 * omitted.
 */
application.get("/history", async (_request, response) => {
    const $ = cheerio.load(historyTemplate);
    const list = $("<ul></ul>");
    $("body > #main").append(list);

    const filenames = await fs.promises.readdir("./public/results");

    let fileStatistics = await Promise.all(
        filenames.map(async filename => {
            const fullpath = path.join("./public/results", filename);
            const statistic = await fs.promises.stat(fullpath);
            return { filename: filename.slice(0, -5), time: statistic.mtimeMs };
        })
    );

    fileStatistics.sort((fileStatistic1, fileStatistic2) => fileStatistic2.time - fileStatistic1.time);
    fileStatistics = fileStatistics.slice(0, MAX_RESULT_FILES * 0.7); 

    for (const { filename } of fileStatistics) {
        list.append($(`<li><a href="/results/${filename}">${filename}</a></li>`))
    }

    response.set('Content-Type', 'text/html');
    response.send($.html());
});

server.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

process.on("SIGINT", () => {
    server.close();
    process.exit(0);
});