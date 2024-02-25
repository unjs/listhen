import { createApp, defineEventHandler } from "h3";
import { defineHooks } from "crossws";

export const app = createApp();

app.use(
  "/ws",
  defineEventHandler(() =>
    fetch(
      "https://raw.githubusercontent.com/unjs/crossws/main/examples/h3/public/index.html",
    ).then((r) => r.text()),
  ),
);

app.use(
  "/",
  defineEventHandler(() => ({ hello: "world!" })),
);

export const websocket = {
  hooks: defineHooks({
    open(peer) {
      console.log("[ws] open", peer);
      peer.send("Hello!");
    },
    message(peer, message) {
      console.log("[ws] message", peer);
      if (message.text() === "ping") {
        peer.send("pong");
      }
    },
  }),
};
