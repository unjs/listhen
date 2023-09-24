import { createApp, eventHandler } from "h3";
import { WebSocketServer } from "ws";
export const app = createApp();
const ws = new WebSocketServer({ noServer: true });

ws.on("connection", (socket, req) => {
  console.log("connected");
  socket.on("message", (message) => {
    console.log(new TextDecoder().decode(message));
  });

  socket.send("ping");
});

app.use(
  "/",
  eventHandler((event) => {
    if (event.headers.get("upgrade") === "websocket") {
      ws.handleUpgrade(
        event.node.req,
        event.node.req.socket,
        Buffer.alloc(0),
        (socket) => {
          ws.emit("connection", socket, event.node.req);
        },
      );
      return;
    }

    return `<h1>Hello World!</h1><script type="module">
      const ws = new WebSocket("ws://localhost:3000");
      await new Promise((resolve) => ws.addEventListener("open", resolve));
      ws.addEventListener("message", (event) => {
        console.log(event.data);
        ws.send("ping from client");
      });
      ws.send("pong");
    </script>`;
  }),
);
