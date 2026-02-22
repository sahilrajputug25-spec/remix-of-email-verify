import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Footer } from '@/components/layout/Footer';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { useEffect } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  Shield, 
  FileUp, 
  Zap,
  ArrowRight,
  Globe,
  Database,
  AlertTriangle,
  BarChart3,
  Clock,
  Users
} from 'lucide-react';

export default function Landing() {
  const { isAuthenticated } = useCredentialAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-28 pb-24 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/[0.05] rounded-full blur-[80px]" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent border border-accent/20 px-4 py-1.5 rounded-full mb-8 animate-fade-in">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold tracking-wide uppercase">Enterprise-grade validation</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 animate-slide-up leading-[1.1]">
              Email validation you can
              <span className="text-gradient block mt-1">actually trust</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
              Stop bounces before they happen. Advanced MX verification, disposable detection, 
              and deliverability checks — all in one platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/#features">
                  See Features
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-20 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="bg-card rounded-2xl border border-border shadow-elevated p-1">
              <div className="grid grid-cols-3 divide-x divide-border">
                <StatItem value="99.5%" label="Accuracy" icon={<BarChart3 className="w-4 h-4" />} />
                <StatItem value="10M+" label="Emails Processed" icon={<Mail className="w-4 h-4" />} />
                <StatItem value="<1s" label="Avg Response" icon={<Clock className="w-4 h-4" />} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-card/50 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-accent tracking-wide uppercase mb-3">Capabilities</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Comprehensive validation suite
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Every check you need to ensure deliverability, all in a single API call.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <FeatureCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              title="Syntax Validation"
              description="RFC-compliant format and structure verification."
            />
            <FeatureCard
              icon={<Globe className="w-5 h-5" />}
              title="Domain Verification"
              description="Confirm the domain exists and resolves correctly."
            />
            <FeatureCard
              icon={<Database className="w-5 h-5" />}
              title="MX Record Check"
              description="Verify mail servers are configured to receive."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Disposable Detection"
              description="Catch temporary and throwaway addresses."
            />
            <FeatureCard
              icon={<AlertTriangle className="w-5 h-5" />}
              title="Role-Based Detection"
              description="Flag generic addresses like info@, support@."
            />
            <FeatureCard
              icon={<FileUp className="w-5 h-5" />}
              title="Bulk Upload"
              description="Process millions of emails via CSV upload."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-accent tracking-wide uppercase mb-3">Process</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Three steps to clean data
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Get results in minutes, not hours.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              step={1}
              title="Authenticate"
              description="Login with your credential key to access the platform."
            />
            <StepCard
              step={2}
              title="Upload"
              description="Validate single emails or bulk upload CSV/Excel files."
            />
            <StepCard
              step={3}
              title="Download"
              description="Get clean, categorized results with detailed reports."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-primary rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                Ready to clean your email list?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-lg mx-auto">
                Start validating today and improve your deliverability rates immediately.
              </p>
              <Button 
                size="xl" 
                className="bg-background text-foreground hover:bg-background/90 shadow-lg"
                asChild
              >
                <Link to="/auth">
                  Login Now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatItem({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="py-4 px-6 text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold text-foreground">{value}</div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card p-6 rounded-xl border border-border hover:border-accent/30 hover:shadow-card-hover transition-all duration-300 group">
      <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="text-center group">
      <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-display font-bold mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
        {step}
      </div>
      <h3 className="text-lg font-display font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
