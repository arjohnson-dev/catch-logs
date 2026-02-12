import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { FaEnvelope, FaLock, FaUser } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      ageVerified: false,
      termsAccepted: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterUser) => {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.name,
            last_name: "",
            age_verified: data.ageVerified,
            terms_accepted: data.termsAccepted,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        throw error;
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
      const isDuplicateEmail = message.includes("already exists");
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <div className="icon-field">
                  <FaUser className="icon-field-icon" />
                  <Input
                    placeholder="John Doe"
                    className="icon-field-input"
                    autoComplete="name"
                    required
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
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
              <FormMessage />
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
              <FormMessage />
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
              <FormMessage />
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
                <FormMessage />
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
                <FormMessage />
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
