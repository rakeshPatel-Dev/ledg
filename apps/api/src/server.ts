import "dotenv/config";

import { APP_NAME } from "@ledg/shared";

import app from "./app.js";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`${APP_NAME} API listening on port ${port}`);
});
