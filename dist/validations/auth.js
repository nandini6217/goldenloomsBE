"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginBodySchema = void 0;
const zod_1 = require("zod");
exports.loginBodySchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email"),
    password: zod_1.z.string().min(1, "Password is required"),
});
