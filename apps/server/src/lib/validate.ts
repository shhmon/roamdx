import * as v from "valibot";
import type { FastifyReply, FastifyRequest } from "fastify";

// Parse req.body against a schema; on failure send a 400 and return null.
// Caller should `return` immediately if null is returned.
export function parseBody<TSchema extends v.GenericSchema>(
  req: FastifyRequest,
  reply: FastifyReply,
  schema: TSchema,
): v.InferOutput<TSchema> | null {
  const result = v.safeParse(schema, req.body);
  if (!result.success) {
    const issue = result.issues[0];
    reply.status(400).send({
      error: "Invalid request body",
      detail: `${issue.path?.map((p) => p.key).join(".") || "body"}: ${issue.message}`,
    });
    return null;
  }
  return result.output;
}
