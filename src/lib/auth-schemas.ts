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
    name: z.string().min(1, "Name is required").transform((val) => val.trim()),
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
