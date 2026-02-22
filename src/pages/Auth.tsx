import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Key, Loader2, ArrowLeft, Eye, EyeOff, Mail, Shield, Zap } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  keyCode: z.string().min(1, 'Credential key is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const [keyCode, setKeyCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ keyCode?: string; password?: string }>({});
  
  const { login, isAuthenticated, loading } = useCredentialAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  const validateForm = () => {
    try {
      loginSchema.parse({ keyCode, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { keyCode?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof typeof fieldErrors] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const result = await login(keyCode, password);
      if (result.success) {
        toast({ title: 'Welcome!', description: 'Redirecting to dashboard...' });
      } else {
        toast({ title: 'Login failed', description: result.error || 'Invalid credentials', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white">EmailVerify</span>
          </div>

          {/* Center content */}
          <div className="max-w-md">
            <h2 className="text-3xl font-display font-bold text-white mb-4 leading-tight">
              Professional email validation for modern teams
            </h2>
            <p className="text-white/70 text-base leading-relaxed mb-8">
              Validate, verify, and clean your email lists with enterprise-grade accuracy.
            </p>
            <div className="space-y-4">
              <FeatureItem icon={<Shield className="w-4 h-4" />} text="99.5% validation accuracy" />
              <FeatureItem icon={<Zap className="w-4 h-4" />} text="Real-time processing under 1 second" />
              <FeatureItem icon={<Mail className="w-4 h-4" />} text="Bulk CSV upload up to 10M+ emails" />
            </div>
          </div>

          {/* Footer */}
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} EmailVerify. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        <div className="p-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm animate-scale-in">
            <div className="mb-8">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2 mb-8">
                <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-display font-bold text-foreground">EmailVerify</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Sign in to your account
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="keyCode" className="text-sm font-medium">Credential Key</Label>
                <Input
                  id="keyCode"
                  type="text"
                  placeholder="Enter your credential key"
                  value={keyCode}
                  onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
                  className={`h-11 font-mono tracking-wider ${errors.keyCode ? 'border-destructive' : ''}`}
                  autoComplete="off"
                />
                {errors.keyCode && <p className="text-xs text-destructive">{errors.keyCode}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`h-11 ${errors.password ? 'border-destructive pr-10' : 'pr-10'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don't have credentials?{' '}
              <span className="text-foreground font-medium">Contact your administrator</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80">
        {icon}
      </div>
      <span className="text-white/80 text-sm">{text}</span>
    </div>
  );
}
