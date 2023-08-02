import { app } from "./app";
import { toNodeListener } from "h3";

export default toNodeListener(app);
