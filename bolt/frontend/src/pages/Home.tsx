import { AlertCircle, Camera, Shield, CheckCircle, Sparkles } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="page-wrap page-rhythm-lg"
      style={{ paddingTop: 0, marginTop: 0,
               paddingBottom: '48px' }}>
      <section
        className="hero-panel text-slate-900 p-8 sm:p-12"
        style={{ marginTop: '8px', paddingTop: '40px',
           paddingBottom: '48px' }}
      >
        <div className="max-w-3xl animate-fade-in-up">
          <span className="hero-badge mb-5 anti-gravity">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-powered traffic compliance system
          </span>
          <h1 className="h-display mb-4">
            Safer Roads Through Smart Violation Detection
          </h1>
          <p className="text-slate-700 text-lg sm:text-xl mb-8">
            Submit image or video evidence, get instant AI analysis, and support authorities with clear, structured reports.
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            <button onClick={() => onNavigate('report')} className="btn-primary active:scale-[0.98] transition-transform">
              Report Violation
            </button>
            <button onClick={() => onNavigate('how-it-works')} className="btn-soft active:scale-[0.98] transition-transform">
              Explore Workflow
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-slate-700">
            <span className="hero-badge badge-soft !py-1 !px-3">Fast AI Triage</span>
            <span className="hero-badge badge-soft !py-1 !px-3">Admin Verified</span>
            <span className="hero-badge badge-soft !py-1 !px-3">Citizen Feedback Loop</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10">
          <div className="stat-pill anti-gravity" style={{ animationDelay: '0s' }}>
            <div className="text-2xl font-bold">Real-time</div>
            <div className="text-sm text-slate-600">Evidence upload and processing</div>
          </div>
          <div className="stat-pill anti-gravity" style={{ animationDelay: '0.4s' }}>
            <div className="text-2xl font-bold">Role-based</div>
            <div className="text-sm text-slate-600">Citizen and authority dashboards</div>
          </div>
          <div className="stat-pill anti-gravity" style={{ animationDelay: '0.8s' }}>
            <div className="text-2xl font-bold">Traceable</div>
            <div className="text-sm text-slate-600">Status, confidence, and review history</div>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6 stagger-children">
        <article className="feature-card">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-4">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Community Reporting</h3>
          <p className="text-slate-600">
            Citizens upload visual evidence in seconds from phones or desktops with location and comments.
          </p>
        </article>

        <article className="feature-card">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">AI Analysis</h3>
          <p className="text-slate-600">
            Detection engine extracts likely violations and confidence level for faster decision support.
          </p>
        </article>

        <article className="feature-card">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Authority Review</h3>
          <p className="text-slate-600">
            Authorities verify, confirm, or reject cases with transparent status updates for citizens.
          </p>
        </article>
      </section>

      <section className="section-card stagger-children">
        <h2 className="text-3xl font-bold mb-6 text-center">Why Traffic Vision</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            'Image and video evidence support',
            'AI-first triage for faster review',
            'Manual-review workflow for uncertain cases',
            'Role-based secure access control',
            'Status visibility for citizens and officers',
            'Clean API-ready architecture for scale',
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              <span className="text-slate-700">{feature}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
