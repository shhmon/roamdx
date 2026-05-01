import { DEFAULT_PORT } from "@roamdx/shared";

export const config = {
  port: parseInt(process.env.PORT || String(DEFAULT_PORT), 10),
  token: process.env.ROAMDX_TOKEN || "changeme",
  host: process.env.HOST || "0.0.0.0",
};
