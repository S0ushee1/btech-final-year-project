import { Upload, Brain, Eye, FileText } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload Evidence',
      description: 'Citizens upload an image or video with location and context from the scene.',
      tone: 'bg-cyan-100 text-cyan-700',
    },
    {
      icon: Brain,
      title: 'AI Detection',
      description: 'The backend analyzes the media and flags likely traffic-rule violations.',
      tone: 'bg-cyan-100 text-cyan-700',
    },
    {
      icon: Eye,
      title: 'Authority Verification',
      description: 'Officers review detections and validate or reject the report.',
      tone: 'bg-sky-100 text-sky-700',
    },
    {
      icon: FileText,
      title: 'Action Taken',
      description: 'Confirmed reports are processed and visible with updated status.',
      tone: 'bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <div className="page-wrap page-section page-rhythm-lg">
      <section className="section-card text-center">
        <h1 className="text-4xl font-extrabold mb-4">How It Works</h1>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto">
          The platform follows a structured pipeline from evidence collection to verified traffic-rule enforcement.
        </p>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <article key={step.title} className="feature-card">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${step.tone} mb-4`}>
              <step.icon className="w-7 h-7" />
            </div>
            <p className="text-xs font-bold text-slate-500 mb-2">STEP {index + 1}</p>
            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
            <p className="text-slate-600">{step.description}</p>
          </article>
        ))}
      </section>

      <section className="section-card space-y-5">
        <h2 className="text-2xl font-bold">Detailed Flow</h2>
        <div className="space-y-4">
          {[
            'Citizen uploads media evidence with location and notes.',
            'AI service detects possible violations and assigns confidence.',
            'Report enters authority queue as Pending or Needs Manual Review.',
            'Authority confirms/rejects report and final status is stored.',
          ].map((item, idx) => (
            <div key={item} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-cyan-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </div>
              <p className="text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

