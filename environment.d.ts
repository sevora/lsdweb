declare global {
    namespace NodeJS {
        interface ProcessEnv {
            /**
             * The maximum number of results to be stored on disk after each 
             * hallucinatuon. Whenever the number of results exceed this value,
             * the oldest results get deleted to accomodate new ones.
             */
            readonly RESULTS_MAX_FILES: number;

            /**
             * The number of page links sent at a time 
             * when getting the history.
             */
            readonly RESULTS_HISTORY_PAGE_SIZE: number;

            /**
             * The time, in milliseconds, it takes between each cleanup
             * function call. The cleanup function call ensures that 
             * the number of results remain within the expected number 
             * of files.
             */
            readonly RESULTS_CLEANUP_INTERVAL: number;

            /**
             * The port number of the server. By default
             * this is 80.
             */
            readonly PORT?: string;
        }
    }
}

export {}