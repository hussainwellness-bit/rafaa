import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useAuth } from '../../context/AuthContext'
import type { GhostPreference } from '../../types'
import { PLAN_NAMES } from '../../types'
import { APP_CONFIG } from '../../config/app'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-[#111] last:border-0">
      <span className="text-[#555]">{label}</span>
      <span className="text-white capitalize">{value}</span>
    </div>
  )
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#444] text-xs font-semibold uppercase tracking-widest mb-3">{children}</p>
  )
}

function PrivacyDocModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-[#222] rounded-[20px] w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <h3 className="font-[Bebas_Neue] text-2xl text-white tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 text-[#666] text-sm leading-relaxed space-y-3">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-[#1a1a1a]">
          <button onClick={onClose} className="w-full py-3 border border-[#333] text-[#888] hover:text-white rounded-[12px] text-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HeroSettings() {
  const { profile, setProfile } = useAuthStore()
  const { signOut } = useAuth()
  const [ghost, setGhost] = useState<GhostPreference>(profile?.ghost_preference ?? 'last')
  const [saved, setSaved] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showDataRequest, setShowDataRequest] = useState(false)
  const [showCorrection, setShowCorrection] = useState(false)
  const [dataRequestSent, setDataRequestSent] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionSent, setCorrectionSent] = useState(false)

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from('profiles').update({ ghost_preference: ghost }).eq('id', profile!.id)
    },
    onSuccess: () => {
      if (profile) setProfile({ ...profile, ghost_preference: ghost })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  async function sendDataRequest() {
    if (!profile?.id) return
    await supabase.from('notifications').insert({
      user_id: profile.coach_id ?? profile.id,
      title: 'Data Access Request',
      body: `${profile.full_name} has requested access to their personal data.`,
      type: 'system',
    })
    setDataRequestSent(true)
  }

  async function sendCorrection() {
    if (!profile?.id || !correctionText.trim()) return
    await supabase.from('notifications').insert({
      user_id: profile.coach_id ?? profile.id,
      title: 'Data Correction Request',
      body: `${profile.full_name}: ${correctionText.trim()}`,
      type: 'system',
    })
    setCorrectionSent(true)
    setCorrectionText('')
  }

  return (
    <div className="p-5 max-w-lg mx-auto space-y-5 pb-10">
      <div className="pt-4">
        <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">SETTINGS</h1>
      </div>

      {/* Profile */}
      <Card className="p-5">
        <SectionHead>Profile</SectionHead>
        <Row label="Name" value={profile?.full_name ?? '—'} />
        <Row label="Email" value={profile?.email ?? '—'} />
        {profile?.phone && <Row label="Phone" value={profile.phone} />}
        <Row label="Goal" value={profile?.goal ?? '—'} />
        <Row label="Height" value={profile?.height ? `${profile.height} cm` : '—'} />
        <div className="flex justify-between items-center text-sm py-2">
          <span className="text-[#555]">Plan</span>
          <Badge variant={profile?.plan_type === 'C' ? 'accent' : profile?.plan_type === 'B' ? 'blue' : 'muted'}>
            Plan {profile?.plan_type} — {PLAN_NAMES[profile?.plan_type ?? 'A']}
          </Badge>
        </div>
      </Card>

      {/* Workout Ghost */}
      <Card className="p-5 space-y-4">
        <SectionHead>Workout Ghost</SectionHead>
        <p className="text-[#555] text-xs -mt-2">What numbers appear as placeholders during workouts</p>
        <div className="space-y-2">
          {[
            { value: 'last' as GhostPreference, label: 'Last Session', desc: 'Shows numbers from your most recent workout for each exercise' },
            { value: 'best' as GhostPreference, label: 'Personal Best', desc: 'Shows your all-time heaviest weight for each exercise' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setGhost(opt.value)}
              className={`w-full p-4 rounded-[12px] border text-left transition-all ${
                ghost === opt.value
                  ? 'bg-[#c8ff00]/5 border-[#c8ff00]/40'
                  : 'border-[#333] hover:border-[#444]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${ghost === opt.value ? 'border-[#c8ff00] bg-[#c8ff00]' : 'border-[#444]'}`}>
                  {ghost === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[#080808]" />}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{opt.label}</p>
                  <p className="text-[#555] text-xs mt-0.5">{opt.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
          {saved ? '✓ Saved!' : save.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </Card>

      {/* Notifications — placeholder toggle */}
      <Card className="p-5">
        <SectionHead>Notifications</SectionHead>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-white text-sm">Push Notifications</p>
            <p className="text-[#444] text-xs mt-0.5">Receive alerts for plan updates and approvals</p>
          </div>
          <div className="w-10 h-6 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center px-0.5">
            <span className="w-4 h-4 rounded-full bg-[#c8ff00]/40" />
          </div>
        </div>
        <p className="text-[#333] text-xs mt-3">Push notification settings will be available after plan activation.</p>
      </Card>

      {/* Privacy */}
      <Card className="p-5 space-y-1">
        <SectionHead>Privacy</SectionHead>

        {/* Privacy Policy */}
        <button
          onClick={() => setShowPrivacy(true)}
          className="w-full flex items-center justify-between py-3 text-sm text-[#888] hover:text-white transition-colors border-b border-[#111]"
        >
          <span>Privacy Policy</span>
          <span className="text-[#444]">→</span>
        </button>

        {/* Right to Access */}
        <button
          onClick={() => setShowDataRequest(true)}
          className="w-full flex items-center justify-between py-3 text-sm text-[#888] hover:text-white transition-colors border-b border-[#111]"
        >
          <span>Right to Access My Data</span>
          <span className="text-[#444]">→</span>
        </button>

        {/* Right to Rectify */}
        <button
          onClick={() => setShowCorrection(true)}
          className="w-full flex items-center justify-between py-3 text-sm text-[#888] hover:text-white transition-colors"
        >
          <span>Right to Rectify My Data</span>
          <span className="text-[#444]">→</span>
        </button>
      </Card>

      {/* Terms */}
      <Card className="p-5">
        <SectionHead>Legal</SectionHead>
        <button
          onClick={() => setShowTerms(true)}
          className="w-full flex items-center justify-between py-3 text-sm text-[#888] hover:text-white transition-colors"
        >
          <span>Terms &amp; Conditions</span>
          <span className="text-[#444]">→</span>
        </button>
      </Card>

      {/* About */}
      <Card className="p-5">
        <SectionHead>About</SectionHead>
        <div className="space-y-2">
          <Row label="App" value={APP_CONFIG.name} />
          <Row label="Version" value={APP_CONFIG.version} />
          <div className="text-center pt-2">
            <p className="text-[#333] text-sm" style={{ fontFamily: 'serif', direction: 'rtl' }}>{APP_CONFIG.nameArabic}</p>
            <p className="text-[#2a2a2a] text-xs font-[DM_Mono] mt-0.5">{APP_CONFIG.tagline}</p>
          </div>
        </div>
      </Card>

      {/* Sign Out */}
      <Card className="p-3">
        <button
          onClick={signOut}
          className="w-full py-3.5 rounded-[12px] text-[#ff3d3d]/70 hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/5 transition-all text-sm font-semibold"
        >
          Sign Out
        </button>
      </Card>

      {/* ── Modals ── */}

      {showTerms && (
        <PrivacyDocModal title="Terms & Conditions" onClose={() => setShowTerms(false)}>
          <p className="font-semibold text-[#888]">{APP_CONFIG.name} Terms &amp; Conditions</p>
          <p>By using {APP_CONFIG.name}, you agree to use the platform solely for personal fitness tracking purposes. You agree not to misuse the service or share your account with others.</p>
          <p>All content provided through this platform, including workout programs, is for informational purposes only and does not constitute medical advice. Consult a physician before starting any fitness program.</p>
          <p>{APP_CONFIG.name} reserves the right to modify these terms at any time. Continued use of the service constitutes acceptance of updated terms.</p>
          <p className="text-[#444]">Full terms document will be available at launch.</p>
        </PrivacyDocModal>
      )}

      {showPrivacy && (
        <PrivacyDocModal title="Privacy Policy" onClose={() => setShowPrivacy(false)}>
          <p className="font-semibold text-[#888]">{APP_CONFIG.name} Privacy Policy</p>
          <p><strong className="text-[#888]">What we collect:</strong> Name, email, phone number, body metrics (weight, height), fitness goals, health information, and workout data.</p>
          <p><strong className="text-[#888]">Why we collect it:</strong> To match you with a coach and deliver your personalized fitness plan.</p>
          <p><strong className="text-[#888]">How long we retain it:</strong> Health data is deleted 2 years after your plan ends, unless you request earlier deletion.</p>
          <p><strong className="text-[#888]">Your rights (Saudi PDPL):</strong> You have the right to access your data, request corrections, and request deletion at any time.</p>
          <p><strong className="text-[#888]">Data sharing:</strong> Your data is only shared with your assigned coach. It is never sold or shared with third parties.</p>
          <p className="text-[#444]">For data requests, use "Right to Access My Data" in Settings.</p>
        </PrivacyDocModal>
      )}

      {showDataRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#222] rounded-[20px] w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-white">Request My Data</h3>
            {dataRequestSent ? (
              <p className="text-[#888] text-sm">Your request has been sent to your coach. They will provide your data within 30 days as per PDPL.</p>
            ) : (
              <>
                <p className="text-[#555] text-sm">This will send a data access request to your coach. Under Saudi PDPL, you are entitled to receive a copy of all personal data we hold about you.</p>
                <Button onClick={sendDataRequest} className="w-full">Send Request</Button>
              </>
            )}
            <button onClick={() => { setShowDataRequest(false); setDataRequestSent(false) }} className="w-full py-2.5 border border-[#333] text-[#888] hover:text-white rounded-[12px] text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {showCorrection && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#222] rounded-[20px] w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-white">Request Data Correction</h3>
            {correctionSent ? (
              <p className="text-[#888] text-sm">Your correction request has been sent to your coach.</p>
            ) : (
              <>
                <p className="text-[#555] text-sm">Describe what information needs to be corrected.</p>
                <textarea
                  rows={3}
                  value={correctionText}
                  onChange={e => setCorrectionText(e.target.value)}
                  placeholder="e.g. My date of birth is incorrect, it should be..."
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none resize-none text-sm"
                />
                <Button onClick={sendCorrection} disabled={!correctionText.trim()} className="w-full">Send Request</Button>
              </>
            )}
            <button onClick={() => { setShowCorrection(false); setCorrectionSent(false); setCorrectionText('') }} className="w-full py-2.5 border border-[#333] text-[#888] hover:text-white rounded-[12px] text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
