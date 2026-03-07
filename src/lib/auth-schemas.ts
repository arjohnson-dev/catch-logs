/*
 * File:        src/lib/auth-schemas.ts
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required")
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const registerUserSchema = z
  .object({
    email: z
      .string()
      .email("Please enter a valid email address")
      .min(1, "Email is required")
      .transform((val) => val.toLowerCase().trim()),
    firstName: z
      .string()
      .min(1, "First name is required")
      .transform((val) => val.trim()),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .transform((val) => val.trim()),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    ageVerified: z.boolean().refine((val) => val === true, {
      message: "You must verify that you are at least 16 years old",
    }),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms of Service and Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type LoginUser = z.infer<typeof loginSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
