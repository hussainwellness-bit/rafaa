import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect the following information when you register as a coach or hero on RafaaTech:',
    list: [
      'Personal information: name, email address, phone number',
      'Professional information: specialty, years of experience, bio',
      'Health and fitness data provided by heroes with explicit consent',
      'Usage data: session logs, workout history, journal entries',
    ],
  },
  {
    title: '2. How We Use Your Information',
    body: 'Your information is used to:',
    list: [
      'Provide and improve the RafaaTech coaching platform',
      'Connect coaches with heroes',
      'Process subscription payments',
      'Send service-related notifications and updates',
      'Comply with legal obligations under Saudi PDPL',
    ],
  },
  {
    title: '3. Data Retention',
    body: 'We retain your personal data for as long as your account is active. Upon account deletion, your data is removed within 30 days, except where retention is required by law.',
  },
  {
    title: '4. Data Sharing',
    body: 'We do not sell your personal data. We may share data with:',
    list: [
      'Your assigned coach or heroes (limited to what is necessary)',
      'Third-party service providers (Supabase, Resend) under data processing agreements',
      'Authorities when required by Saudi law',
    ],
  },
  {
    title: '5. Your Rights (Saudi PDPL)',
    body: 'Under Saudi Personal Data Protection Law, you have the right to:',
    list: [
      'Access your personal data',
      'Correct inaccurate data',
      'Request deletion of your data',
      'Withdraw consent at any time',
      'Lodge a complaint with the relevant authority',
    ],
  },
  {
    title: '6. Security',
    body: 'We implement industry-standard security measures including encryption at rest and in transit to protect your data. However, no system is 100% secure.',
  },
  {
    title: '7. Contact',
    body: 'For privacy-related inquiries or to exercise your rights, contact us at: support@rafaa.fit',
  },
]

export default function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#080808] pb-20">
      <div className="max-w-2xl mx-auto px-5 pt-10 space-y-8">
        <button onClick={() => navigate(-1)} className="text-[#555] hover:text-white text-sm transition-colors">
          ← Back
        </button>

        <div>
          <h1 className="font-[Bebas_Neue] text-5xl text-white tracking-wide">PRIVACY POLICY</h1>
          <p className="text-[#444] font-[DM_Mono] text-xs mt-2 uppercase tracking-widest">Last updated: April 2026</p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map(s => (
            <div key={s.title} className="space-y-3">
              <h2 className="text-white font-semibold text-[16px]">{s.title}</h2>
              <p className="text-[#888] text-[14px] leading-relaxed">{s.body}</p>
              {s.list && (
                <ul className="space-y-1.5 ml-4">
                  {s.list.map(item => (
                    <li key={item} className="text-[#888] text-[14px] leading-relaxed flex gap-2">
                      <span className="text-[#c8ff00] shrink-0">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
