import fs from "fs";
import path from "path";

import { 
    CLEANUP_CHECK_INTERVAL, 
    MAX_RESULT_FILES 
} from "./options";

let watcherCleanupTimeout: NodeJS.Timeout;

/**
 * The purpose of this function is to keep a fixed amount of files in the results
 * folder by deleting older files. It runs within a set interval, and also is called
 * whenever the result folder changes.
 */
async function cleanupResults() {
    try {
        const filenames = await fs.promises.readdir("./public/results");

        if (filenames.length > MAX_RESULT_FILES) {

            /**
             * We want to be able to sort the files by their last
             * modified time later on and also retrieve their fullpath easily.
             */
            const fileStatistics = await Promise.all(
                filenames.map(async filename => {
                    const fullpath = path.join("./public/results", filename);
                    const statistic = await fs.promises.stat(fullpath);
                    return { fullpath, time: statistic.mtimeMs };
                })
            );

            /**
             * This sorts the files from oldest to newest.
             */
            fileStatistics.sort((fileStatistic1, fileStatistic2) => fileStatistic1.time - fileStatistic2.time);
            
            /**
             * The oldest files as you can see are kept in the reference array 
             * and then deleted.
             */
            const filesToDelete = fileStatistics.slice(0, fileStatistics.length - MAX_RESULT_FILES);
            for (const fileStatistic of filesToDelete) {
                await fs.promises.unlink(fileStatistic.fullpath);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * This makes it so that the cleanup function is called 10-seconds
 * after the results folder changes but can cancel the latest delayed call
 * when there are consecutive changes. This kind of logic is a debouncing mechanism
 * and real implementations include the typing indicator in chat messaging apps.
 */
fs.watch("./public/results", (_eventType, filename) => {
    if (filename) {
        if (watcherCleanupTimeout) 
            clearTimeout(watcherCleanupTimeout); 
        watcherCleanupTimeout = setTimeout(cleanupResults, 10 * 1000);
    }
});

setInterval(cleanupResults, CLEANUP_CHECK_INTERVAL);
