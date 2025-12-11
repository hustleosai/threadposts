import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sparkles, 
  Zap, 
  TrendingUp, 
  Image, 
  Layout, 
  Clock,
  Check,
  Twitter,
  Linkedin,
  MessageCircle,
  ArrowRight,
  Star
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'AI Thread Generator',
    description: 'Generate viral threads in seconds with our advanced AI trained on top-performing content.'
  },
  {
    icon: Layout,
    title: 'Template Library',
    description: '15+ proven thread templates with engagement scores to maximize your reach.'
  },
  {
    icon: Image,
    title: 'Viral Image Library',
    description: '100+ curated images, memes, and quotes that drive engagement.'
  },
  {
    icon: TrendingUp,
    title: 'Multi-Platform',
    description: 'Optimized for Twitter/X, LinkedIn, Facebook, and Instagram Threads.'
  },
  {
    icon: Clock,
    title: 'Thread History',
    description: 'Save, favorite, and reuse your best-performing threads.'
  },
  {
    icon: Sparkles,
    title: 'Smart Formatting',
    description: 'Auto-formats content for each platform with optimal character counts.'
  }
];

const platforms = [
  { icon: Twitter, name: 'Twitter/X' },
  { icon: Linkedin, name: 'LinkedIn' },
  { icon: MessageCircle, name: 'Facebook' },
  { icon: Sparkles, name: 'Threads' }
];

const faqs = [
  {
    question: 'How does the AI thread generator work?',
    answer: 'Our AI analyzes thousands of viral threads to understand what makes content go viral. Simply enter your topic, select your platform, and get a fully formatted thread in seconds.'
  },
  {
    question: 'Can I edit the generated threads?',
    answer: 'Absolutely! All generated content is fully editable. You can tweak, add, or remove any part before posting.'
  },
  {
    question: 'What platforms are supported?',
    answer: 'We support Twitter/X, LinkedIn, Facebook, and Instagram Threads. Each platform has optimized formatting and character limits.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! You can try ThreadMaster free with limited generations. Upgrade to premium for unlimited access.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. No questions asked, no hidden fees.'
  }
];

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-xl font-display font-bold">ThreadMaster</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild className="gradient-primary">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild className="gradient-primary">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 gradient-hero overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">Trusted by 10,000+ creators</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 animate-fade-in">
            Generate <span className="text-gradient">Viral Threads</span>
            <br />in Seconds
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            The AI-powered thread generator that helps you create engaging content for 
            Twitter/X, LinkedIn, Facebook, and Threads.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button asChild size="lg" className="gradient-primary glow-primary text-lg px-8 h-14">
              <Link to="/auth">
                Start Creating Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 h-14">
              View Examples
            </Button>
          </div>

          {/* Platform Icons */}
          <div className="flex items-center justify-center gap-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {platforms.map((platform) => (
              <div key={platform.name} className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <platform.icon className="h-8 w-8" />
                <span className="text-sm">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Everything You Need to Go Viral
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed to help you create engaging content that resonates with your audience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card/50 border-border hover:border-primary/50 transition-all duration-300 hover:glow-accent group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              One plan, unlimited possibilities
            </p>
          </div>

          <Card className="bg-card border-primary glow-primary">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
                    Most Popular
                  </div>
                  <h3 className="text-3xl font-display font-bold mb-2">Pro Plan</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-5xl font-bold">$5</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Unlimited AI thread generation',
                      'All 15+ templates',
                      '100+ viral images',
                      'Thread history & favorites',
                      'All platforms supported',
                      'Priority support'
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-4 w-full md:w-auto">
                  <Button asChild size="lg" className="gradient-primary text-lg px-8 h-14">
                    <Link to="/auth">Get Started Now</Link>
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Cancel anytime • No hidden fees
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-card border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-hero">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-display font-bold mb-4">
            Ready to Create Viral Content?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of creators using ThreadMaster to grow their audience.
          </p>
          <Button asChild size="lg" className="gradient-primary glow-primary text-lg px-8 h-14">
            <Link to="/auth">
              Start Free Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display font-bold">ThreadMaster</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 ThreadMaster. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
