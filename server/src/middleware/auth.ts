import type { MiddlewareHandler } from "hono";

/**
 * Auth middleware that reads the Remote-User header set by Nginx/Authelia.
 *
 * In production, Nginx's auth_request directive validates with Authelia and
 * forwards Remote-User, Remote-Groups, Remote-Name, Remote-Email headers.
 * These headers are set from Authelia's response, so clients cannot spoof them.
 *
 * In development (DEV_USER env var set), the middleware injects that value
 * as the user, bypassing the need for Nginx/Authelia.
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const devUser = process.env.DEV_USER;
  const remoteUser = c.req.header("Remote-User") || devUser;

  if (!remoteUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", remoteUser);
  c.set("userEmail", c.req.header("Remote-Email") || "");
  c.set("userName", c.req.header("Remote-Name") || remoteUser);
  c.set("userGroups", c.req.header("Remote-Groups") || "");

  await next();
};
