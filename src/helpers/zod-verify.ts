import { z } from 'zod';
import { Request } from 'express';

/**
 * Just provide the zod schema and the request object and it will automatically 
 * check the body if it matches the schema along with typecasting the result 
 * according to schema.
 * @param schema the zod schema to match
 * @param request the request object.
 * @returns an object or null depending on whether the schema matched or not.
 */
export default function zodVerify<T>(schema: z.ZodType<T>, request: Request) {
   const { success } = schema.safeParse(request.body);
   return success ? (request.body as z.infer<typeof schema>) : null;
}