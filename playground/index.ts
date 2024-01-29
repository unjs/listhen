import { createApp, eventHandler } from "h3";
import { defineWebSocketHooks } from "crossws";

export const app = createApp();

app.use(
  "/ws",
  eventHandler(() => {
    return getWebSocketTestPage();
  }),
);

app.use(
  "/",
  eventHandler(() => ({ hello: "world!" })),
);

function getWebSocketTestPage() {
  return `
  <!doctype html>
  <head>
    <title>WebSocket Test Page</title>
  </head>
  <body>
    <div id="logs"></div>
    <script type="module">
      const url = \`ws://\${location.host}/_ws\`;
      const logsEl = document.querySelector("#logs");
      const log = (...args) => {
        console.log("[ws]", ...args);
        logsEl.innerHTML += \`<p>[\${new Date().toJSON()}] \${args.join(" ")}</p>\`;
      };

      log(\`Connecting to "\${url}""...\`);
      const ws = new WebSocket(url);

      ws.addEventListener("message", (event) => {
        log("Message from server:", event.data);
      });

      log("Waiting for connection...");
      await new Promise((resolve) => ws.addEventListener("open", resolve));

      log("Sending ping...");
      ws.send("ping");
    </script>
  </body>
    `;
}

export const webSocket = defineWebSocketHooks({
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
});
