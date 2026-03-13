import { Link } from 'react-router-dom';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy - EmailVerify';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      
      {/* Main Content */}
      <div className="pt-28 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button & Title */}
          <div className="mb-12">
            <Button variant="ghost" size="sm" asChild className="mb-6">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-8">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Last updated: December 27, 2024
            </p>
            <p className="text-sm text-muted-foreground">
              EmailVerify ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
            </p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-12">
            {/* 1. Information We Collect */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
                1. Information We Collect
              </h2>
              <div className="prose prose-headings:font-display prose-headings:font-bold prose-h2:text-xl prose-a:no-underline prose-a:text-accent hover:prose-a:text-foreground transition-colors max-w-none">
                <p>
                  We collect minimal information necessary to provide our email validation services:
                </p>
                <ul>
                  <li><strong>Emails for validation</strong>: Individual emails or lists (via CSV upload) submitted for verification. <strong>We explicitly do not use your emails for our own services or marketing. They are only stored temporarily for businesses to verify their leads before sending mails.</strong></li>
                  <li><strong>Account information</strong>: Credential keys, usage stats for subscribed users.</li>
                  <li><strong>Technical data</strong>: IP address, browser type, usage analytics (anonymized).</li>
                </ul>
              </div>
            </section>

            {/* 2. How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
                2. How We Use Your Information
              </h2>
              <div className="bg-card rounded-2xl p-8 border border-border shadow-elevated">
                <div className="prose prose-headings:font-display prose-headings:font-bold prose-h2:text-xl prose-a:no-underline prose-a:text-accent hover:prose-a:text-foreground transition-colors max-w-none">
                  <p>Your emails are processed solely for validation (syntax, MX, disposable checks) and results are returned immediately. We do <strong>not</strong>:</p>
                  <ul>
                    <li>Send emails to your submitted addresses</li>
                    <li>Use them for our marketing/services</li>
                    <li>Sell/rent/share with third parties (except processors under strict agreements)</li>
                    <li>Store beyond validation completion (deleted after processing)</li>
                  </ul>
                  <p>Account data is used for service delivery, billing, support.</p>
                </div>
              </div>
            </section>

            {/* 3. Data Storage & Security */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">3. Data Storage & Security</h2>
              <div className="prose prose-headings:font-display prose-headings:font-bold prose-h2:text-xl max-w-none">
                <p>
                  Data is stored securely in Supabase (EU/US regions) with encryption at rest/transit. Emails are auto-deleted post-validation. We use industry-standard security (SOC 2 compliant infrastructure).
                </p>
              </div>
            </section>

            {/* 4. Sharing & Third Parties */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">4. Sharing Your Information</h2>
              <div className="prose prose-headings:font-display prose-headings:font-bold prose-h2:text-xl max-w-none">
                <p>We do not sell your data. Limited sharing with:</p>
                <ul>
                  <li>Service providers (Supabase for storage, Vercel for hosting)</li>
                  <li>Legal requirements</li>
                </ul>
              </div>
            </section>

            {/* 5. Cookies & Analytics */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">5. Cookies & Tracking</h2>
              <div className="prose prose-headings:font-display prose-headings:font-bold prose-h2:text-xl max-w-none">
                <p>We use essential cookies for functionality and anonymized analytics (Vercel Speed Insights). No personal tracking.</p>
              </div>
            </section>

            {/* 6. Your Rights */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">6. Your Rights</h2>
              <div className="prose prose-headings:font-display prose-headings:font-bold prose-h2:text-xl max-w-none">
                <p>GDPR/CCPA compliant: Access, delete, export your data. Contact us to exercise rights.</p>
              </div>
            </section>

            {/* 7. Changes & Contact */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">7. Changes to this Policy</h2>
              <div className="prose prose-headings:font-display prose-headings:font-bold prose-h2:text-xl max-w-none">
                <p>We may update this policy. Continued use constitutes acceptance.</p>
              </div>
              <div className="mt-8 p-6 bg-muted rounded-xl">
                <h3 className="font-semibold mb-2">Contact Us</h3>
                <p className="text-sm text-muted-foreground mb-3">Questions? Email <Link to="mailto:support@emailverify.com" className="text-accent hover:text-foreground font-medium">support@emailverify.com</Link></p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
