import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useAuth } from '../../context/AuthContext'
import type { GhostPreference } from '../../types'
import { PLAN_NAMES } from '../../types'
import { APP_CONFIG } from '../../config/app'
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
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, letterSpacing: 4, lineHeight: 1, color: 'var(--text)', margin: 0 }}>SETTINGS</h1>
      </div>

      {/* Profile */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 10 }}>
        <SectionHead>Profile</SectionHead>
        <Row label="Name" value={profile?.full_name ?? '—'} />
        <Row label="Email" value={profile?.email ?? '—'} />
        {profile?.phone && <Row label="Phone" value={profile.phone} />}
        <Row label="Goal" value={profile?.goal ?? '—'} />
        <Row label="Height" value={profile?.height ? `${profile.height} cm` : '—'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>Plan</span>
          <Badge variant={profile?.plan_type === 'C' ? 'accent' : profile?.plan_type === 'B' ? 'blue' : 'muted'}>
            Plan {profile?.plan_type} — {PLAN_NAMES[profile?.plan_type ?? 'A']}
          </Badge>
        </div>
      </div>

      {/* Workout Ghost */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 10 }}>
        <SectionHead>Workout Ghost</SectionHead>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginBottom: 12 }}>What numbers appear as placeholders during workouts</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {[
            { value: 'last' as GhostPreference, label: 'Last Session', desc: 'Shows numbers from your most recent workout for each exercise' },
            { value: 'best' as GhostPreference, label: 'Personal Best', desc: 'Shows your all-time heaviest weight for each exercise' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setGhost(opt.value)}
              style={{
                width: '100%', padding: 14, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                background: ghost === opt.value ? 'var(--accent-dim)' : 'var(--lift)',
                border: `1px solid ${ghost === opt.value ? 'rgba(200,255,0,0.4)' : 'var(--border2)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', border: `2px solid ${ghost === opt.value ? 'var(--accent)' : 'var(--border2)'}`,
                  background: ghost === opt.value ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {ghost === opt.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bg)' }} />}
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{opt.label}</p>
                  <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{opt.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
          {saved ? '✓ Saved!' : save.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Notifications */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 10 }}>
        <SectionHead>Notifications</SectionHead>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4 }}>
          <div>
            <p style={{ color: 'var(--text)', fontSize: 13 }}>Push Notifications</p>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Receive alerts for plan updates and approvals</p>
          </div>
          <div style={{ width: 40, height: 24, borderRadius: 100, background: 'var(--accent-dim)', border: '1px solid rgba(200,255,0,0.2)', display: 'flex', alignItems: 'center', padding: '0 2px' }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(200,255,0,0.4)', display: 'block' }} />
          </div>
        </div>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--border2)', marginTop: 10 }}>Push notification settings will be available after plan activation.</p>
      </div>

      {/* Privacy */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 10 }}>
        <SectionHead>Privacy</SectionHead>
        {[
          { label: 'Privacy Policy', onClick: () => setShowPrivacy(true) },
          { label: 'Right to Access My Data', onClick: () => setShowDataRequest(true) },
          { label: 'Right to Rectify My Data', onClick: () => setShowCorrection(true) },
        ].map((item, i, arr) => (
          <button
            key={item.label}
            onClick={item.onClick}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: 12, paddingBottom: 12, background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)',
            }}
          >
            <span>{item.label}</span>
            <span style={{ color: 'var(--border2)' }}>→</span>
          </button>
        ))}
      </div>

      {/* Terms */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 10 }}>
        <SectionHead>Legal</SectionHead>
        <button
          onClick={() => setShowTerms(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)' }}
        >
          <span>Terms &amp; Conditions</span>
          <span style={{ color: 'var(--border2)' }}>→</span>
        </button>
      </div>

      {/* About */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 10 }}>
        <SectionHead>About</SectionHead>
        <Row label="App" value={APP_CONFIG.name} />
        <Row label="Version" value={APP_CONFIG.version} />
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <p style={{ fontFamily: 'serif', direction: 'rtl', color: 'var(--border2)', fontSize: 14 }}>{APP_CONFIG.nameArabic}</p>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--border)', marginTop: 2 }}>{APP_CONFIG.tagline}</p>
        </div>
      </div>

      {/* Sign Out */}
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <button
          onClick={signOut}
          style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: 12, letterSpacing: 2, color: 'var(--red)', fontWeight: 700 }}
        >
          SIGN OUT
        </button>
      </div>

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
