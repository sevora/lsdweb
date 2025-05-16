/**
 * These are non-sensitive options that can be adjusted before 
 * deployment depending on the environment.
 */
import { ChatModel } from "openai/resources.mjs";

/**
 * The number of pages or files to be kept in the results.
 */
export const MAX_RESULT_FILES = 10000;

/**
 * The cleanup interval to delete excess files prioritizing older files.
 */
export const CLEANUP_CHECK_INTERVAL = 15 * 60 * 1000;

/**
 * The chat model the API will use.
 */
export const OPEN_AI_CHAT_MODEL: ChatModel = "o3-mini";