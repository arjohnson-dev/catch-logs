/*
 * File:        src/components/auth/register-form.tsx
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { FaEnvelope, FaLock, FaUser } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { registerUserSchema, type RegisterUser } from "@/lib/auth-schemas";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface RegisterFormProps {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { toast } = useToast();

  const form = useForm<RegisterUser>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      ageVerified: false,
      termsAccepted: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterUser) => {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.firstName,
            display_name: data.firstName,
            name: data.firstName,
            first_name: data.firstName,
            firstName: data.firstName,
            last_name: data.lastName,
            lastName: data.lastName,
            age_verified: data.ageVerified,
            terms_accepted: data.termsAccepted,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        throw error;
      }

      // Supabase may not return an error for duplicate emails depending on auth settings.
      // In that case it returns a user object with no identities; treat that as a failed registration.
      const identities = signUpData.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        throw new Error("An account with this email already exists.");
      }
    },
    onSuccess: () => {
      form.reset();
      onSuccess?.();
      toast({
        title: "Registration Successful!",
        description: "Please check your email to verify your account before signing in.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      // Check for duplicate email error
      const message = error instanceof Error ? error.message : "Please try again";
      const normalizedMessage = message.toLowerCase();
      const isDuplicateEmail =
        normalizedMessage.includes("already exists") ||
        normalizedMessage.includes("already registered");
      toast({
        title: isDuplicateEmail ? "Account Already Exists" : "Registration Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterUser) => {
    registerMutation.mutate(data);
  };

  const onInvalid = () => {
    const messages = Array.from(
      new Set(
        Object.values(form.formState.errors)
          .map((error) => error?.message)
          .filter((message): message is string => Boolean(message)),
      ),
    );

    toast({
      title: "Registration failed",
      description: messages.join(" "),
      variant: "destructive",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl>
                <div className="icon-field">
                  <FaUser className="icon-field-icon" />
                  <Input
                    placeholder="John"
                    className="icon-field-input"
                    autoComplete="given-name"
                    required
                    {...field}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name *</FormLabel>
              <FormControl>
                <div className="icon-field">
                  <FaUser className="icon-field-icon" />
                  <Input
                    placeholder="Doe"
                    className="icon-field-input"
                    autoComplete="family-name"
                    required
                    {...field}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address *</FormLabel>
              <FormControl>
                <div className="icon-field">
                  <FaEnvelope className="icon-field-icon" />
                  <Input 
                    placeholder="your@email.com" 
                    className="icon-field-input"
                    type="email"
                    autoComplete="email"
                    {...field}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />



        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password *</FormLabel>
              <FormControl>
                <div className="icon-field">
                  <FaLock className="icon-field-icon" />
                  <Input 
                    placeholder="Minimum 8 characters" 
                    className="icon-field-input"
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password *</FormLabel>
              <FormControl>
                <div className="icon-field">
                  <FaLock className="icon-field-icon" />
                  <Input 
                    placeholder="Confirm your password" 
                    className="icon-field-input"
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ageVerified"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  required
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I verify that I am at least 16 years of age *
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  required
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" className="text-blue-400 hover:text-blue-300 underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" className="text-blue-400 hover:text-blue-300 underline">
                    Privacy Policy
                  </a>{" "}
                  *
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="btn-full btn-primary"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? "Creating Account..." : "Create Account"}
        </Button>
        
        <div className="text-xs text-[#999999] text-center">
          By creating an account, you'll receive an email verification link. 
          You must verify your email before you can log in.
        </div>
      </form>
    </Form>
  );
}
