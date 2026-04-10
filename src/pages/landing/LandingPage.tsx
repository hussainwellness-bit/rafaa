import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-10">

        {/* Logo */}
        <div className="text-center space-y-1">
          <h1 className="font-[Bebas_Neue] text-7xl text-white tracking-widest leading-none">RAFAATECH</h1>
          <p className="text-[#c8ff00] text-2xl font-bold" style={{ fontFamily: 'serif' }}>رفعتك</p>
          <p className="text-[#555] font-[DM_Mono] text-[13px] uppercase tracking-[4px] mt-2">Elevate Your Performance</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Coach Card */}
          <button
            onClick={() => navigate('/apply-as-coach')}
            className="group text-left rounded-[20px] border border-[#222] bg-[#0e0e0e] p-7 space-y-5 hover:border-[#c8ff00]/40 hover:bg-[#111] transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-[14px] flex items-center justify-center text-3xl"
              style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.15)' }}>
              🏋️
            </div>
            <div className="space-y-2">
              <h2 className="font-[Bebas_Neue] text-2xl text-white tracking-wide">I'M A COACH</h2>
              <p className="text-[#555] text-[14px] leading-relaxed">
                Join our platform and start training your heroes
              </p>
            </div>
            <div
              className="inline-block font-[DM_Mono] text-[11px] font-bold uppercase tracking-[2px] px-5 py-2.5 rounded-[100px] transition-all"
              style={{ background: '#c8ff00', color: '#080808' }}
            >
              Apply as Coach
            </div>
          </button>

          {/* Hero Card */}
          <button
            onClick={() => navigate('/join')}
            className="group text-left rounded-[20px] border border-[#222] bg-[#0e0e0e] p-7 space-y-5 hover:border-[#3d9fff]/40 hover:bg-[#111] transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-[14px] flex items-center justify-center text-3xl"
              style={{ background: 'rgba(61,159,255,0.08)', border: '1px solid rgba(61,159,255,0.15)' }}>
              💪
            </div>
            <div className="space-y-2">
              <h2 className="font-[Bebas_Neue] text-2xl text-white tracking-wide">I'M A HERO</h2>
              <p className="text-[#555] text-[14px] leading-relaxed">
                Find your coach and start your fitness journey
              </p>
            </div>
            <div
              className="inline-block font-[DM_Mono] text-[11px] font-bold uppercase tracking-[2px] px-5 py-2.5 rounded-[100px] border transition-all"
              style={{ borderColor: 'rgba(61,159,255,0.4)', color: '#3d9fff', background: 'rgba(61,159,255,0.08)' }}
            >
              Find My Coach
            </div>
          </button>
        </div>

        {/* Sign in link */}
        <p className="text-center text-[#444] text-sm">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-[#c8ff00] hover:text-white transition-colors font-semibold"
          >
            Sign In
          </button>
        </p>

      </div>
    </div>
  )
}
