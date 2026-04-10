import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By registering as a coach on RafaaTech, you agree to these terms and conditions in full. If you do not agree, please do not proceed with registration.',
  },
  {
    title: '2. Coach Responsibilities',
    body: 'As a coach on RafaaTech, you are responsible for:',
    list: [
      'Providing accurate professional information',
      'Delivering the coaching services you offer',
      'Maintaining professional conduct with all heroes',
      'Keeping your subscription active and payments up to date',
    ],
  },
  {
    title: '3. Subscription & Payment',
    body: 'Coach subscriptions are available in 3-month, 6-month, and 1-year plans. Payment is required to activate your account. Subscriptions are non-refundable once activated. Renewal is the responsibility of the coach.',
  },
  {
    title: '4. Data & Privacy',
    body: 'We collect and process your personal and professional information in accordance with our Privacy Policy and Saudi PDPL regulations. Your data will not be sold to third parties.',
  },
  {
    title: '5. Platform Rules',
    body: 'RafaaTech reserves the right to suspend or terminate any coach account that violates these terms, engages in fraudulent activity, or fails to maintain subscription payments.',
  },
  {
    title: '6. Contact',
    body: 'For any questions or concerns regarding these terms, contact us at: support@rafaa.fit',
  },
]

export default function TermsPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#080808] pb-20">
      <div className="max-w-2xl mx-auto px-5 pt-10 space-y-8">
        <button onClick={() => navigate(-1)} className="text-[#555] hover:text-white text-sm transition-colors">
          ← Back
        </button>

        <div>
          <h1 className="font-[Bebas_Neue] text-5xl text-white tracking-wide">TERMS & CONDITIONS</h1>
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
