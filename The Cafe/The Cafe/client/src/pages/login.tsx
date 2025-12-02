import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Eye, EyeOff, Sparkles, ArrowRight, Shield } from "lucide-react";
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
          console.error('Login failed - Error data:', errorData);
        } catch (e) {
          console.error('Login failed - Could not parse error response');
          errorData = { message: 'Invalid credentials' };
        }
        console.error('Full response status:', response.status, response.statusText);
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      // Update auth state
      setAuthState({ user: data.user, isAuthenticated: true });
      
      // Show success message
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
      });
      
    } catch (error) {
      console.error('Login error:', error);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8 fade-up">
          <div className="inline-flex items-center justify-center relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-orange-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Coffee className="h-10 w-10 text-white coffee-steam" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-orange-500 to-primary bg-clip-text text-transparent">
            The Café
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Smart Payroll & Employee Scheduling
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-2xl shadow-black/10 bg-card/80 backdrop-blur-xl fade-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="h-12 pl-4 pr-4 bg-secondary/50 border-transparent focus:border-primary/50 focus:bg-background rounded-xl transition-all duration-200"
                    data-testid="input-username"
                  />
                </div>
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
                    className="h-12 pl-4 pr-12 bg-secondary/50 border-transparent focus:border-primary/50 focus:bg-background rounded-xl transition-all duration-200"
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
                className="w-full h-12 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 group"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </form>

            {/* Security Note */}
            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secured with enterprise-grade encryption</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 fade-up" style={{ animationDelay: '0.2s' }}>
          © 2025 The Café. Smart Payroll System
        </p>
      </div>
    </div>
  );
}
