import "dotenv/config";
import zod from "zod";
import express from "express";
import { rateLimit } from "express-rate-limit";

import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { ChatCompletionMessageParam } from "openai/resources.mjs";
import openai from "openai";

import fs from "fs";
import http from "http";
import path from "path";

import zodVerify from "./helpers/zod-verify";
import searchSuggestions from "./search-suggestions";
import "./cleanup-results";

const PORT = Number(process.env.PORT) || 80;
const application = express();
const server = http.createServer(application);

const systemPrompt = fs.readFileSync("./prompts/system.txt", { encoding: "utf8", flag: "r" });
const htmlTemplate = fs.readFileSync("./templates/index.html", { encoding: "utf8", flag: "r" });

/**
 * IP-based rate limiter to deter attacks. However, it is important 
 * to note that clients may have the same public IP address. 
 * Take into consideration the potential number of users at a given 
 * time within the same location.
 */
application.use(
    rateLimit({
        windowMs: 5 * 60 * 1000,
        limit: 500,
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
    if (request.method === "GET" && path.extname(request.path).length === 0 && request.path !== "/")
        request.url += ".html";
    next();
});

application.use(express.static("public", { maxAge: 60 * 60 * 1000}));
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
        context: zod.string().trim().min(1).max(64),
        openAIAPIKey: zod.string().startsWith("sk-")
    }), request);

    if (!parameters) {
        response.json({ redirectTo: `/?error=1` });
        return;
    }

    let { context, openAIAPIKey } = parameters;
    const openAIClient = new openai({ apiKey: openAIAPIKey });

    const messages: ChatCompletionMessageParam[] = [
        { role: "developer", content: systemPrompt },
        { role: "user", content: `context: ${context}` },
    ]

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

    const goals = ["index", "css", "js"] as const;
    let contents: Partial<IndexContent & { css: string, js: string }> = {};

    /**
     * This might be puzzling to understand since this is less readable compared to the "Initial Commit."
     * First, it achieves a goal, then builds up the message with the result from the goal. 
     * Finally, the result of said goal is also stored within the contents object.
     */
    for (const goal of goals) {
        const completion = await openAIClient.chat.completions.create({
            model: "o3-mini",
            messages: [
                ...messages,
                { role: "developer", content: `goal: ${goal}` }
            ]
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            response.json({ redirectTo: `/?error=1` });
            return;
        }
        
        if (goal === "index") {
            const index = JSON.parse(content) as IndexContent;
            contents = { ...index };
            messages.push({ role: "developer", content: `body: ${index.body}`});
            continue;
        }

        messages.push({ role: "developer", content: `${goal}: ${content}`});
        contents[goal] = content;
    }

    /**
     * This part bundles everything from the markup, styling, and scripting which will be 
     * saved in the results folder.
     */
    const { title, body, shortcode, css, js } = contents as IndexContent & { css: string, js: string };
    const $ = cheerio.load(htmlTemplate);
    const style = $(`<style>${css}</style>`);
    const script = $(`<script>${js}</script>`);
    $("head").append(style);
    $("title").html(title);
    $("body").html(body);
    $("body").append(script);

    const shortcodeUnique = `${shortcode.slice(0, 32)}-${uuidv4().slice(0, 8)}`;
    await fs.promises.writeFile(`./public/results/${shortcodeUnique}.html`, $.html(), { encoding: 'utf8', flag: 'w' });
    response.json({ redirectTo: `/results/${shortcodeUnique}` });
});

/**
 * POST /history
 * This is the global history of the server which lists all the existing generated pages so far.
 * However it limits the results to the newest 70% of page links and the oldest 30% are omitted.
 * Pagination should be implemented here.
 */
application.post("/history", async (request, response) => {
    const parameters = zodVerify(zod.object({
        page: zod.number().min(0)
    }), request);

    if (!parameters) {
        response.sendStatus(400);
        return;
    }

    const { page } = parameters;
    const filenames = await fs.promises.readdir("./public/results");

    let fileStatus = await Promise.all(
        filenames.map(async filename => {
            const fullpath = path.join("./public/results", filename);
            const status = await fs.promises.stat(fullpath);
            return { filename: filename.slice(0, -5), time: status.mtimeMs };
        })
    );
    
    const startIndex = page * process.env.RESULTS_HISTORY_PAGE_SIZE;
    const endIndex = startIndex + process.env.RESULTS_HISTORY_PAGE_SIZE;

    fileStatus.sort((fileStatus1, fileStatus2) => fileStatus2.time - fileStatus1.time);
    fileStatus = fileStatus.slice(0, process.env.RESULTS_MAX_FILES * 0.7).slice(startIndex, endIndex);
    response.json({ history: fileStatus })
});

/**
 * 
 */
application.post("/suggestions", (_request, response) => {
    const suggestions: string[] = [];
    const shallowCopy = [...searchSuggestions];
    
    for (let index = 0; index < 10; ++index) {
        const randomIndex = Math.floor(Math.random() * shallowCopy.length);
        suggestions.push(shallowCopy.splice(randomIndex, 1)[0]);
    }

    response.json({ suggestions });
})

server.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

process.on("SIGINT", () => {
    server.close();
    process.exit(0);
});