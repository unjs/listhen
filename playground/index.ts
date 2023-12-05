import { createApp, eventHandler } from "h3";
import { WebSocketServer } from "ws";

const ws = new WebSocketServer({ noServer: true });
ws.on("connection", (socket) => {
  console.log("[ws", "connected");
  socket.on("message", (message) => {
    console.log("[ws]", new TextDecoder().decode(message));
  });
  socket.send("ping");
});

export const app = createApp().use(
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

    return `<!DOCTYPE html>
     <h1>Hello World!</h1>
     <script type="module">
      const ws = new WebSocket("ws://" + location.host);
      await new Promise((resolve) => ws.addEventListener("open", resolve));
      ws.addEventListener("message", (event) => {
        console.log(event.data);
        ws.send("ping from client");
      });
      ws.send("pong");
    </script>`;
  }),
);
