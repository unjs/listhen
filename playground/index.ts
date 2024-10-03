import { createApp, defineEventHandler } from "h3";
import { defineHooks } from "crossws";

export const app = createApp();

app.use(
  "/ws",
  defineEventHandler(async () => await import("./_ws").then((m) => m.default)),
);

app.use(
  "/",
  defineEventHandler(() => ({ hello: "world!" })),
);

export const websocket = {
  hooks: defineHooks({
    open(peer) {
      peer.send({ user: "server", message: `Welcome ${peer}!` });
      peer.publish("chat", { user: "server", message: `${peer} joined!` });
      peer.subscribe("chat");
    },
    message(peer, message) {
      if (message.text().includes("ping")) {
        peer.send({ user: "server", message: "pong" });
      } else {
        const msg = {
          user: peer.toString(),
          message: message.toString(),
        };
        peer.send(msg); // echo
        peer.publish("chat", msg);
      }
    },
    close(peer) {
      peer.publish("chat", { user: "server", message: `${peer} left!` });
    },
  }),
};
