"use client";

import { createAuthClient } from "better-auth/react";

/** Cliente de Better Auth para el navegador (mismo origen, rutas /api/auth). */
export const authClient = createAuthClient({ basePath: "/api/auth" });
