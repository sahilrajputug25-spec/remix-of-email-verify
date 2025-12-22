import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  Shield, 
  FileUp, 
  Download, 
  Zap,
  ArrowRight,
  Globe,
  Database,
  AlertTriangle
} from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-hero relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 animate-fade-in">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Real-time email validation</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-slide-up">
              Validate Emails with
              <span className="text-gradient block mt-2">Confidence & Precision</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Stop bounces before they happen. Our advanced validation checks MX records, 
              detects disposable emails, and ensures your list is clean and deliverable.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth?mode=signup">
                  Start Validating Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/auth">
                  Login to Dashboard
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div>
                <div className="text-3xl font-bold text-foreground">99.5%</div>
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">1000+</div>
                <div className="text-sm text-muted-foreground">Bulk Emails</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">&lt;1s</div>
                <div className="text-sm text-muted-foreground">Validation Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need for Email Validation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive validation checks to ensure your emails reach their destination.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Cards */}
            <FeatureCard
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="Syntax Validation"
              description="Instantly check if email addresses follow proper format and structure."
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Domain Verification"
              description="Verify that the email domain exists and is properly configured."
            />
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title="MX Record Check"
              description="Confirm mail servers are set up to receive emails."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Disposable Detection"
              description="Identify temporary or disposable email addresses."
            />
            <FeatureCard
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Role-Based Detection"
              description="Detect generic addresses like info@, admin@, support@."
            />
            <FeatureCard
              icon={<FileUp className="w-6 h-6" />}
              title="Bulk Upload"
              description="Validate up to 1000 emails at once via CSV or Excel upload."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple three-step process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              step={1}
              title="Create Account"
              description="Sign up for free and access your personal dashboard."
            />
            <StepCard
              step={2}
              title="Upload or Enter Emails"
              description="Validate single emails or upload a CSV/Excel file."
            />
            <StepCard
              step={3}
              title="Get Results"
              description="View detailed results and download clean lists."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Clean Your Email List?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Start validating emails today and improve your deliverability rates.
          </p>
          <Button 
            size="xl" 
            className="bg-background text-foreground hover:bg-background/90"
            asChild
          >
            <Link to="/auth?mode=signup">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-elevated hover:shadow-glow transition-all duration-300 group">
      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
