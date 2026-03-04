import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  CheckCircle, 
  ArrowRight, 
  ShieldCheck, 
  Zap,
  Star,
  Cpu,
  Award,
  BookOpen,
  LayoutGrid
} from 'lucide-react'
import { AINeuralBackground } from '@/components/ui/AINeuralBackground'

export default function HomePage() {
  const certifications = [
    {
      title: 'AI Foundations',
      description: 'Master the core concepts of Artificial Intelligence, Machine Learning, and standard AI tooling.',
      icon: Cpu,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'AI Practitioner',
      description: 'Prove hands-on capability in deploying models, analyzing data, and integrating AI into workflows.',
      icon: Zap,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      title: 'GenAI Specialist',
      description: 'Validate advanced expertise in Large Language Models, prompt engineering, and GenAI architecture.',
      icon: ShieldCheck,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      title: 'Solutions Architect',
      description: 'Design scalable, secure, and enterprise-grade AI solutions across modern cloud environments.',
      icon: LayoutGrid,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
  ]

  const steps = [
    {
      step: '01',
      title: 'Learn & Prepare',
      description: 'Study our curated, industry-standard learning resources designed for each certification track.',
      icon: BookOpen
    },
    {
      step: '02',
      title: 'Take Practice Exams',
      description: 'Test your knowledge with unlimited practice runs featuring immediate, detailed feedback.',
      icon: Zap
    },
    {
      step: '03',
      title: 'Earn Your Certificate',
      description: 'Pass the timed, official assessment and receive a cryptographically verifiable certificate.',
      icon: Award
    },
  ]

  const testimonials = [
    {
      content: "ReadyCheck AI certificates have become our gold standard for hiring. If a candidate holds a GenAI Specialist badge, we know they actually understand the technology, not just the buzzwords.",
      author: "Sarah Chen",
      role: "VP of Engineering",
      company: "TechFlow Enterprise"
    },
    {
      content: "We transitioned our entire engineering department through the AI Practitioner track. The verifiable certificates gave our enterprise clients the confidence they needed in our team.",
      author: "Marcus Rodriguez",
      role: "Chief Technology Officer", 
      company: "InnovateCore"
    },
    {
      content: "The combination of curated resources and rigorous testing is unmatched. Earning the Solutions Architect certification definitively advanced my consulting career.",
      author: "Emily Watson",
      role: "Lead Cloud Architect",
      company: "DataDriven Solutions"
    }
  ]

  return (
    <div className="flex flex-col bg-background">
      {/* Hero Section with AI Neural 3D WebGL Background */}
      <AINeuralBackground className="pt-24 pb-32 sm:pt-32 sm:pb-40 border-b border-border shadow-2xl">
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-sm font-medium mb-8 border border-cyan-500/30 backdrop-blur-sm">
              <Award className="w-4 h-4 text-cyan-400" />
              <span>The Industry Standard AI Certification</span>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl mb-6 drop-shadow-md">
              Prove Your AI Expertise. <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300">
                Eliminate the Guesswork.
              </span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-slate-200 mb-10 max-w-2xl mx-auto drop-shadow-sm font-light">
              Stop hiring based on buzzwords. ReadyCheck AI provides rigorous, cryptographically verifiable certifications to validate true Artificial Intelligence competence for individuals and enterprise teams.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white border-0 shadow-lg shadow-cyan-500/25 transition-all" asChild>
                <Link href="/auth/signup">
                  Get Certified Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md" asChild>
                <Link href="/verify">Verify a Certificate</Link>
              </Button>
            </div>
            <p className="mt-8 text-sm text-slate-300/80 font-medium">
              Trusted by <span className="text-white font-bold">2,847+</span> forward-thinking enterprises
            </p>
          </div>
        </div>
      </AINeuralBackground>

      {/* Trust & Stats Strip */}
      <section className="py-12 border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col gap-2">
              <span className="text-4xl font-bold text-foreground">15k+</span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Certificates Issued</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-4xl font-bold text-foreground">4</span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Specialized Tracks</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-4xl font-bold text-foreground">100%</span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Verifiable</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-4xl font-bold text-foreground">24/7</span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Proctored Validation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Certification Tracks */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-primary">Certification Paths</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Validate skills across the entire AI lifecycle
            </p>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              From foundational concepts to enterprise cloud architecture, our exams are meticulously designed to test practical, real-world knowledge.
            </p>
          </div>
          <div className="grid max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-2">
            {certifications.map((cert) => (
              <Card key={cert.title} className="bg-card hover:shadow-lg transition-shadow border-border">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`p-3 rounded-xl ${cert.bg}`}>
                      <cert.icon className={`w-8 h-8 ${cert.color}`} />
                    </div>
                    <CardTitle className="text-2xl">{cert.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-muted-foreground mb-6">
                    {cert.description}
                  </CardDescription>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    <Link href="/assess/start" className="flex items-center">
                      Explore track <ArrowRight className="ml-1 w-4 h-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution with Certificate Mockup */}
      <section className="py-24 sm:py-32 bg-secondary/20 border-y border-border overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 items-center">
            <div className="lg:pr-8">
              <h2 className="text-base font-semibold leading-7 text-primary">Enterprise Confidence</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                The AI Skills Gap is a Liability
              </p>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                In the rush to adopt AI, companies are flying blind. Unqualified teams risk data breaches, hallucinations, and catastrophic deployment failures.
              </p>
              <ul className="mt-10 space-y-6 text-base leading-7 text-muted-foreground">
                <li className="flex gap-x-3">
                  <ShieldCheck className="mt-1 h-6 w-6 flex-none text-primary" />
                  <span><strong className="font-semibold text-foreground">Cryptographically Signed.</strong> Every certificate generates a unique, immutable hash that employers can instantly verify via our public portal.</span>
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="mt-1 h-6 w-6 flex-none text-primary" />
                  <span><strong className="font-semibold text-foreground">Anti-Cheat Enforcement.</strong> Official certification runs utilize strict time limits and browser monitoring to ensure academic integrity.</span>
                </li>
                <li className="flex gap-x-3">
                  <BookOpen className="mt-1 h-6 w-6 flex-none text-primary" />
                  <span><strong className="font-semibold text-foreground">Continuous Evolution.</strong> Our question banks are dynamically updated weekly to reflect the bleeding-edge of AI developments.</span>
                </li>
              </ul>
            </div>
            
            {/* Certificate Mockup */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-purple-500/20 blur-3xl rounded-full" />
              <div className="relative rounded-2xl bg-card p-8 shadow-2xl ring-1 ring-border/50 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="border-4 border-border/50 rounded-xl p-8">
                  <div className="flex justify-between items-start mb-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground/70 font-mono text-sm">LICENSE KEY</div>
                      <div className="text-foreground font-mono font-bold">RC-GENAI-2026-ABC123</div>
                    </div>
                  </div>
                  <div className="text-center mb-12">
                    <h3 className="text-muted-foreground font-medium tracking-widest uppercase mb-4">Certificate of Achievement</h3>
                    <h2 className="text-3xl font-serif text-foreground mb-2">Alex Developer</h2>
                    <div className="h-px w-64 bg-border mx-auto mb-4" />
                    <p className="text-muted-foreground">has successfully completed the requirements to be recognized as a</p>
                    <h4 className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-2">ReadyCheck GenAI Specialist</h4>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-muted-foreground/70 text-xs uppercase mb-1">Issue Date</div>
                      <div className="text-foreground font-medium">April 24, 2026</div>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-500/20">
                      <CheckCircle className="w-4 h-4" /> Validated
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-primary">Your Journey</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From beginner to certified expert
            </p>
          </div>
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.step} className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-5xl font-bold text-muted/30 absolute top-6 right-6 select-none">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 sm:py-32 bg-secondary/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center mb-16">
            <h2 className="text-lg font-semibold leading-8 tracking-tight text-primary">Industry Recognition</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Trusted by engineering leaders
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card border-border shadow-sm">
                <CardContent className="pt-8">
                  <div className="flex gap-1 text-yellow-500 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-foreground leading-relaxed mb-8">
                    "{testimonial.content}"
                  </blockquote>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.author}</div>
                    <div className="text-sm text-primary">{testimonial.role}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Invest in verifiable skills
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Begin your learning journey for free. Upgrade to Pro when you're ready to earn official certificates.
            </p>
          </div>
          <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free Tier */}
            <Card className="p-8 bg-card border-border">
              <h3 className="text-2xl font-bold text-foreground mb-2">Practice Pass</h3>
              <div className="text-4xl font-extrabold text-foreground mb-6">₹0<span className="text-lg text-muted-foreground font-normal">/forever</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle className="w-5 h-5 text-green-500" /> Access curated study resources</li>
                <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle className="w-5 h-5 text-green-500" /> Take unlimited Practice Exams</li>
                <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle className="w-5 h-5 text-green-500" /> Basic performance analytics</li>
              </ul>
              <Button variant="outline" className="w-full h-12 text-lg" asChild>
                <Link href="/auth/signup">Start Practicing Free</Link>
              </Button>
            </Card>

            {/* Pro Tier */}
            <Card className="p-8 bg-gradient-to-b from-primary/10 to-background border-primary shadow-xl shadow-primary/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-lg font-medium text-sm">Most Popular</div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Pro Certification</h3>
              <div className="text-4xl font-extrabold text-foreground mb-6">₹299<span className="text-lg text-muted-foreground font-normal">/month</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-foreground font-medium"><CheckCircle className="w-5 h-5 text-primary" /> Everything in Practice Pass</li>
                <li className="flex items-center gap-3 text-foreground font-medium"><CheckCircle className="w-5 h-5 text-primary" /> Unlimited Official Certification Exams</li>
                <li className="flex items-center gap-3 text-foreground font-medium"><CheckCircle className="w-5 h-5 text-primary" /> Cryptographically signed PDF certificates</li>
                <li className="flex items-center gap-3 text-foreground font-medium"><CheckCircle className="w-5 h-5 text-primary" /> Public verification profile link</li>
              </ul>
              <Button className="w-full h-12 text-lg" asChild>
                <Link href="/auth/signup">Get Pro Access</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 sm:py-32 overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="relative mx-auto max-w-3xl px-6 text-center z-10">
          <h2 className="text-4xl font-extrabold tracking-tight text-primary-foreground sm:text-5xl mb-6">
            Ready to stand out?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-10">
            Join thousands of developers and engineers who have validated their expertise with a ReadyCheck AI Certification.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto h-14 px-8 text-lg font-bold" asChild>
              <Link href="/auth/signup">
                Create Free Account
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
