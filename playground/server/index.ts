import { toNodeListener } from "h3";
import { app } from "./app";

export default toNodeListener(app);
