#!/usr/bin/env node
// Lightweight entrypoint so you can run the super admin bootstrap without building.
require("ts-node/register/transpile-only");
require("./src/scripts/createSuperAdmin");
