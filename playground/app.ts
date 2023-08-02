import { createApp, eventHandler } from "h3";

export const app = createApp();

app.use(
  "/",
  eventHandler(() => ({ hello: "world!!" })),
);
