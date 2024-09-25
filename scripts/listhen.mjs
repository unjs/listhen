#!/usr/bin/env node

import { createJiti } from "jiti";

const jiti =  createJiti(import.meta.url)
const { runMain } = await jiti.import("../src/cli");

runMain();
