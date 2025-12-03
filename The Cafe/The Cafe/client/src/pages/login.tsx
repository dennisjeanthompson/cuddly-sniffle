import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { setAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Invalid credentials' };
        }
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      setAuthState({ user: data.user, isAuthenticated: true });
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-background to-secondary/30 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
              <Coffee className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              The Café
            </h1>
            <p className="text-lg text-muted-foreground">
              Smart Payroll & Employee Management
            </p>
          </div>

          <div className="space-y-6 mt-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Easy Scheduling</p>
                <p className="text-sm text-muted-foreground">Create and manage shifts with drag-and-drop simplicity</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Automated Payroll</p>
                <p className="text-sm text-muted-foreground">Philippine statutory deductions calculated automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Mobile Ready</p>
                <p className="text-sm text-muted-foreground">Employees can access schedules and payslips on any device</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/20">
              <Coffee className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">The Café</h1>
            <p className="text-sm text-muted-foreground mt-1">Smart Payroll System</p>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                <p className="text-muted-foreground mt-1">Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="h-12 px-4 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                    data-testid="input-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="h-12 px-4 pr-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Sign In</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-8">
                Protected by enterprise-grade security
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2025 The Café. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
