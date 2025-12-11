import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';
import { Sparkles, Zap, TrendingUp, Image, Layout, Clock, Check, Twitter, Linkedin, MessageCircle, ArrowRight, Star, Hash, Users, FileText, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (!startOnView) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted, startOnView]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, ref };
}

const stats = [
  { value: 50000, label: 'Threads Generated', suffix: '+', icon: FileText },
  { value: 10000, label: 'Happy Creators', suffix: '+', icon: Users },
  { value: 4, label: 'Platforms Supported', suffix: '', icon: Globe },
  { value: 98, label: 'Satisfaction Rate', suffix: '%', icon: Star },
];

// Stat card component with animated counter
function StatCard({ stat, index }: { stat: typeof stats[0], index: number }) {
  const { count, ref } = useCountUp(stat.value, 2000);
  const Icon = stat.icon;
  
  return (
    <div 
      ref={ref}
      className="text-center animate-fade-in" 
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2">
        {count.toLocaleString()}{stat.suffix}
      </div>
      <div className="text-muted-foreground">{stat.label}</div>
    </div>
  );
}

const features = [{
  icon: Zap,
  title: 'AI Thread Generator',
  description: 'Generate viral threads in seconds with our advanced AI trained on top-performing content.'
}, {
  icon: Layout,
  title: 'Template Library',
  description: '15+ proven thread templates with engagement scores to maximize your reach.'
}, {
  icon: Image,
  title: 'Viral Image Library',
  description: '100+ curated images, memes, and quotes that drive engagement.'
}, {
  icon: TrendingUp,
  title: 'Multi-Platform',
  description: 'Optimized for Twitter/X, LinkedIn, Facebook, and Instagram Threads.'
}, {
  icon: Clock,
  title: 'Thread History',
  description: 'Save, favorite, and reuse your best-performing threads.'
}, {
  icon: Sparkles,
  title: 'Smart Formatting',
  description: 'Auto-formats content for each platform with optimal character counts.'
}];

const platforms = [{
  icon: Twitter,
  name: 'Twitter/X'
}, {
  icon: Linkedin,
  name: 'LinkedIn'
}, {
  icon: MessageCircle,
  name: 'Facebook'
}, {
  icon: Sparkles,
  name: 'Threads'
}];

const exampleThreads = [
  {
    platform: 'twitter',
    platformName: 'Twitter/X',
    icon: Twitter,
    topic: 'Building in Public',
    posts: [
      "I've built 3 startups in the last 5 years.\n\nHere's the uncomfortable truth about entrepreneurship that nobody talks about:",
      "1/ Your first idea will probably fail.\n\nAnd that's okay.\n\nThe goal isn't to get it right the first time. The goal is to learn fast enough to pivot before you run out of runway.",
      "2/ Overnight success is a myth.\n\nMy 'overnight success' took 847 days of:\n• Building in public\n• Learning from failures\n• Showing up when nobody cared",
      "3/ Your network is your net worth.\n\nThe people who supported me at 100 followers are the same ones helping me at 100K.\n\nNurture relationships before you need them.",
      "4/ Revenue > Followers\n\nI'd rather have 1,000 customers than 100,000 followers.\n\nVanity metrics don't pay bills.",
      "If this resonated, drop a 🔥 and follow for more startup insights.\n\nI share my journey building in public every single day."
    ]
  },
  {
    platform: 'linkedin',
    platformName: 'LinkedIn',
    icon: Linkedin,
    topic: 'Career Advice',
    posts: [
      "I interviewed 200+ candidates last year.\n\nHere are 5 mistakes that instantly disqualified them:\n\n(And how you can avoid them)",
      "1. They couldn't explain their impact.\n\n❌ \"I was responsible for marketing.\"\n✅ \"I increased qualified leads by 47% through a targeted content strategy.\"\n\nNumbers tell stories. Use them.",
      "2. They bad-mouthed previous employers.\n\nNo matter how toxic your last job was, speaking negatively about it raises red flags.\n\nFocus on what you learned and how you grew.",
      "3. They didn't research the company.\n\n\"What does your company do?\" is an instant no.\n\nSpend 30 minutes understanding:\n• The mission\n• Recent news\n• Key challenges",
      "4. They asked about salary in the first interview.\n\nTiming matters. Show your value first, then negotiate.\n\nThe best candidates focus on fit before compensation.",
      "5. They didn't ask thoughtful questions.\n\n\"Do you have any questions?\" isn't a formality.\n\nIt's your chance to interview them.\n\n---\n\nAgree? What would you add?\n\n♻️ Repost to help your network\n🔔 Follow me for daily career tips"
    ]
  },
  {
    platform: 'facebook',
    platformName: 'Facebook',
    icon: MessageCircle,
    topic: 'Personal Growth',
    posts: [
      "10 years ago, I was broke, lost, and had no direction.\n\nToday, I run a 7-figure business and wake up excited every morning.\n\nHere's what changed everything for me... 👇",
      "1️⃣ I stopped waiting for the \"perfect moment.\"\n\nThere's never a perfect time to start. I launched my first business from my parents' basement with $500 and a laptop.\n\nStart messy. Improve as you go.",
      "2️⃣ I invested in myself before anything else.\n\nBooks. Courses. Mentors.\n\nThe ROI on self-education is infinite. While others bought new cars, I bought knowledge.",
      "3️⃣ I surrounded myself with people 10 steps ahead.\n\nYou become the average of the 5 people you spend the most time with.\n\nI found my tribe online and at local meetups. It changed my trajectory.",
      "4️⃣ I embraced failure as feedback.\n\nMy first 3 businesses failed. Each one taught me what NOT to do.\n\nFailure isn't the opposite of success—it's part of it.",
      "5️⃣ I focused on solving ONE problem really well.\n\nI stopped chasing every opportunity and went deep instead of wide.\n\nMastery beats mediocrity every time.\n\n💬 What's ONE thing that changed your life? Drop it in the comments!\n\n❤️ Like & Share if this helped you!"
    ]
  },
  {
    platform: 'threads',
    platformName: 'Threads',
    icon: Hash,
    topic: 'Productivity Tips',
    posts: [
      "I used to work 12-hour days and get nothing done.\n\nThen I discovered these 4 time hacks that changed everything 🧵",
      "1. The 2-Minute Rule\n\nIf it takes less than 2 minutes, do it NOW.\n\nYou'd be surprised how much this clears your mental load.",
      "2. Time Blocking\n\nI schedule EVERYTHING:\n• Deep work: 9-12\n• Meetings: 2-4\n• Admin: 4-5\n\nNo decisions = more energy for actual work.",
      "3. The Sunday Reset\n\nEvery Sunday I spend 30 min planning my week.\n\nThis one habit 10x'd my productivity.",
      "4. Say No More\n\nEvery yes is a no to something else.\n\nI started protecting my time like it's my most valuable asset.\n\nBecause it is.\n\nSave this for later 🔖"
    ]
  }
];

const faqs = [{
  question: 'How does the AI thread generator work?',
  answer: 'Our AI analyzes thousands of viral threads to understand what makes content go viral. Simply enter your topic, select your platform, and get a fully formatted thread in seconds.'
}, {
  question: 'Can I edit the generated threads?',
  answer: 'Absolutely! All generated content is fully editable. You can tweak, add, or remove any part before posting.'
}, {
  question: 'What platforms are supported?',
  answer: 'We support Twitter/X, LinkedIn, Facebook, and Instagram Threads. Each platform has optimized formatting and character limits.'
}, {
  question: 'Is there a free trial?',
  answer: 'Yes! You can try ThreadPosts free with limited generations. Upgrade to premium for unlimited access.'
}, {
  question: 'Can I cancel anytime?',
  answer: 'Yes, you can cancel your subscription at any time. No questions asked, no hidden fees.'
}];
export default function Index() {
  const {
    user
  } = useAuth();
  const [selectedExample, setSelectedExample] = useState('twitter');
  // Track affiliate referrals when users arrive via ?ref= links
  useAffiliateTracking();
  return <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-xl font-display font-bold">ThreadPosts</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? <Button asChild className="gradient-primary">
                <Link to="/dashboard">Dashboard</Link>
              </Button> : <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild className="gradient-primary">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 gradient-hero overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{
          animationDelay: '1s'
        }} />
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
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{
          animationDelay: '0.1s'
        }}>
            The AI-powered thread generator that helps you create engaging content for 
            Twitter/X, LinkedIn, Facebook, and Threads.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in" style={{
          animationDelay: '0.2s'
        }}>
            <Button asChild size="lg" className="gradient-primary glow-primary text-lg px-8 h-14">
              <Link to="/auth">
                Start Creating Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 h-14" onClick={() => document.getElementById('examples')?.scrollIntoView({ behavior: 'smooth' })}>
              View Examples
            </Button>
          </div>

          {/* Platform Icons */}
          <div className="flex items-center justify-center gap-8 animate-fade-in" style={{
          animationDelay: '0.3s'
        }}>
            {platforms.map(platform => <div key={platform.name} className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <platform.icon className="h-8 w-8" />
                <span className="text-sm">{platform.name}</span>
              </div>)}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-y border-border bg-card/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <StatCard key={stat.label} stat={stat} index={index} />
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
            {features.map(feature => <Card key={feature.title} className="bg-card/50 border-border hover:border-primary/50 transition-all duration-300 hover:glow-accent group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section id="examples" className="py-20 px-4 bg-secondary/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real examples of threads generated by our AI. Click any platform to see the magic.
            </p>
          </div>

          {/* Platform Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {exampleThreads.map((thread) => (
              <Button
                key={thread.platform}
                variant={selectedExample === thread.platform ? "default" : "outline"}
                onClick={() => setSelectedExample(thread.platform)}
                className={selectedExample === thread.platform ? "gradient-primary" : ""}
              >
                <thread.icon className="h-4 w-4 mr-2" />
                {thread.platformName}
              </Button>
            ))}
          </div>

          {/* Thread Display */}
          {exampleThreads.filter(t => t.platform === selectedExample).map((thread) => (
            <div key={thread.platform} className="max-w-2xl mx-auto">
              <div className="mb-6 text-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Topic: "{thread.topic}"
                </span>
              </div>
              
              <div className="space-y-4">
                {thread.posts.map((post, index) => (
                  <Card key={index} className="bg-card border-border animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                            <thread.icon className="h-5 w-5 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">ThreadPosts AI</span>
                            <span className="text-xs text-muted-foreground">• {index + 1}/{thread.posts.length}</span>
                          </div>
                          <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{post}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center mt-8">
                <Button asChild size="lg" className="gradient-primary">
                  <Link to="/auth">
                    Create Your Own Thread
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Loved by Creators Worldwide
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of content creators who've transformed their social media presence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "Marketing Director",
                avatar: "SC",
                content: "ThreadPosts cut my content creation time by 80%. I used to spend hours crafting threads, now I generate high-quality content in minutes. My engagement has tripled!",
                rating: 5
              },
              {
                name: "Marcus Johnson",
                role: "Startup Founder",
                avatar: "MJ",
                content: "As someone building in public, I need to post consistently. ThreadPosts helps me stay active on Twitter and LinkedIn without burning out. Game changer.",
                rating: 5
              },
              {
                name: "Emily Rodriguez",
                role: "Career Coach",
                avatar: "ER",
                content: "My LinkedIn posts used to get 50 views. After using ThreadPosts templates and AI, I'm consistently hitting 10K+ views. The ROI is incredible for just $5/month.",
                rating: 5
              },
              {
                name: "David Park",
                role: "Content Creator",
                avatar: "DP",
                content: "I was skeptical about AI-generated content, but ThreadPosts genuinely understands what makes threads go viral. The output feels authentic and matches my voice.",
                rating: 5
              },
              {
                name: "Jessica Williams",
                role: "SaaS Founder",
                avatar: "JW",
                content: "We use ThreadPosts for our company's social presence. The multi-platform support is amazing—one topic, four perfectly formatted threads. Our team loves it.",
                rating: 5
              },
              {
                name: "Alex Thompson",
                role: "Freelance Writer",
                avatar: "AT",
                content: "The template library alone is worth the subscription. I've learned so much about thread structure just by studying the examples. Plus the AI adds that extra spark.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-card/50 border-border hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
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
                    {['Unlimited AI thread generation', 'All 15+ templates', '100+ viral images', 'Thread history & favorites', 'All platforms supported', 'Priority support'].map(feature => <li key={feature} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>{feature}</span>
                      </li>)}
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
            {faqs.map((faq, index) => <AccordionItem key={index} value={`item-${index}`} className="bg-card border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>)}
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
            Join thousands of creators using ThreadPosts to grow their audience.
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
            <span className="font-display font-bold">ThreadPosts</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 ThreadPosts. All rights reserved.</p>
        </div>
      </footer>
    </div>;
}