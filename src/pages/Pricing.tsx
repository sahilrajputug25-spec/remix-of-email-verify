import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Footer } from '@/components/layout/Footer';
import { Check, ArrowRight, Zap, Calendar } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const dailyPlans = [
  {
    name: 'Starter',
    limit: '7 Lac',
    price: '1,000',
    popular: false,
    features: ['Up to 7,00,000 emails/day', 'Bulk CSV upload', 'Detailed validation reports', 'Email support'],
  },
  {
    name: 'Growth',
    limit: '15 Lac',
    price: '1,700',
    popular: true,
    features: ['Up to 15,00,000 emails/day', 'Bulk CSV upload', 'Detailed validation reports', 'Priority support', 'Faster processing'],
  },
  {
    name: 'Business',
    limit: '20 Lac',
    price: '2,000',
    popular: false,
    features: ['Up to 20,00,000 emails/day', 'Bulk CSV upload', 'Detailed validation reports', 'Priority support', 'Faster processing'],
  },
  {
    name: 'Enterprise',
    limit: '28 Lac',
    price: '2,800',
    popular: false,
    features: ['Up to 28,00,000 emails/day', 'Bulk CSV upload', 'Detailed validation reports', 'Dedicated support', 'Fastest processing', 'Custom integrations'],
  },
];

const monthlyPlans = [
  {
    name: 'Starter',
    limit: '7 Lac',
    price: '16,000',
    popular: false,
    features: ['Up to 7,00,000 emails/day', 'Bulk CSV upload', 'Detailed validation reports', 'Email support', '30 days access'],
  },
  {
    name: 'Growth',
    limit: '15 Lac',
    price: '29,000',
    popular: true,
    features: ['Up to 15,00,000 emails/day', 'Bulk CSV upload', 'Detailed validation reports', 'Priority support', 'Faster processing', '30 days access'],
  },
  {
    name: 'Business',
    limit: '20 Lac',
    price: '37,000',
    popular: false,
    features: ['Up to 20,00,000 emails/day', 'Bulk CSV upload', 'Detailed validation reports', 'Priority support', 'Faster processing', '30 days access'],
  },
  {
    name: 'Enterprise',
    limit: '25 Lac',
    price: '45,000',
    popular: false,
    features: ['Up to 25,00,000 emails/day', 'Bulk CSV upload', 'Detailed validation reports', 'Dedicated support', 'Fastest processing', 'Custom integrations', '30 days access'],
  },
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'daily' | 'monthly'>('daily');
  const plans = billingPeriod === 'daily' ? dailyPlans : monthlyPlans;

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      {/* Hero */}
      <section className="pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.03] rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 relative text-center">
          <p className="text-sm font-semibold text-accent tracking-wide uppercase mb-3">Pricing</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Choose the plan that fits your volume. No hidden fees. Pay only for what you need.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-muted rounded-xl p-1 gap-1">
            <button
              onClick={() => setBillingPeriod('daily')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                billingPeriod === 'daily'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Zap className="w-4 h-4" />
              Daily
            </button>
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                billingPeriod === 'monthly'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calendar className="w-4 h-4" />
              Monthly
            </button>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'relative bg-card rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:shadow-card-hover',
                  plan.popular
                    ? 'border-accent shadow-elevated ring-1 ring-accent/20'
                    : 'border-border'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-display font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.limit} emails limit</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <span className="text-4xl font-display font-bold text-foreground">{plan.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    per {billingPeriod === 'daily' ? 'day' : 'month'}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? 'default' : 'outline'}
                  className="w-full"
                  asChild
                >
                  <Link to="/auth">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ-like note */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="bg-card/50 border border-border rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto text-center">
            <h3 className="text-xl font-display font-bold text-foreground mb-3">Need a custom plan?</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              If your requirements exceed our listed plans, contact us for a tailored solution with higher volume limits.
            </p>
            <Button variant="outline" asChild>
              <Link to="/auth">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
