import { useState, useEffect } from 'react'
import { User, Save, Trash2, AlertTriangle, KeyRound, CheckCircle2, XCircle } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useAuth } from '../../context/AuthContext'

function Success({ message }) {
  if (!message) return null
  return (
    <div className="bg-green-50 border border-green-200 text-success text-xs rounded-lg p-2.5 mb-3 flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4" /> {message}
    </div>
  )
}

function Error({ message }) {
  if (!message) return null
  return (
    <div className="bg-red-50 border border-red-200 text-danger text-xs rounded-lg p-2.5 mb-3 flex items-center gap-2">
      <XCircle className="w-4 h-4" /> {message}
    </div>
  )
}

export default function AdminSettings() {
  const { user, updateUser, changePassword } = useAuth()
  const { settings, updateSettings, fetchUsers, usersList, clearOrders, clearAllData } = useApp()

  const [biz, setBiz] = useState({})
  const [bizSaving, setBizSaving] = useState(false)
  const [bizDone, setBizDone] = useState('')
  const [bizError, setBizError] = useState('')

  const [profile, setProfile] = useState({ name: '', username: '', email: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileDone, setProfileDone] = useState('')
  const [profileError, setProfileError] = useState('')

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdDone, setPwdDone] = useState('')
  const [pwdError, setPwdError] = useState('')

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false)

  useEffect(() => {
    setBiz({
      business_name: settings.business_name || '',
      tagline: settings.tagline || '',
      address: settings.address || '',
      phone: settings.phone || '',
      email: settings.email || '',
      receipt_thankyou: settings.receipt_thankyou || '',
      receipt_thankyou_en: settings.receipt_thankyou_en || '',
      currency: settings.currency || 'TSh',
    })
  }, [settings])

  useEffect(() => {
    const me = usersList.find(u => Number(u.id) === Number(user?.id))
    setProfile({
      name: user?.name || me?.name || '',
      username: user?.username || me?.username || '',
      email: me?.email || '',
    })
  }, [user, usersList])

  const setBizField = (key, val) => {
    setBiz(prev => ({ ...prev, [key]: val }))
    setBizDone('')
    setBizError('')
  }

  const saveBusiness = async () => {
    setBizSaving(true)
    setBizError('')
    setBizDone('')
    try {
      await updateSettings(biz)
      setBizDone('Business information saved successfully.')
    } catch (err) {
      setBizError(err.message || 'Failed to save business information')
    } finally {
      setBizSaving(false)
    }
  }

  const setProfileField = (key, val) => {
    setProfile(prev => ({ ...prev, [key]: val }))
    setProfileDone('')
    setProfileError('')
  }

  const saveProfile = async () => {
    if (!profile.name.trim()) { setProfileError('Name is required'); return }
    if (!profile.username.trim()) { setProfileError('Username is required'); return }
    if (!profile.email.trim()) { setProfileError('Email is required'); return }
    setProfileSaving(true)
    setProfileError('')
    setProfileDone('')
    try {
      await updateUser({
        name: profile.name.trim(),
        username: profile.username.trim(),
        email: profile.email.trim(),
      })
      await fetchUsers()
      setProfileDone('Profile updated successfully.')
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const setPwdField = (key, val) => {
    setPwd(prev => ({ ...prev, [key]: val }))
    setPwdDone('')
    setPwdError('')
  }

  const savePassword = async () => {
    if (!pwd.current) { setPwdError('Enter your current password'); return }
    if (!pwd.next) { setPwdError('Enter a new password'); return }
    if (pwd.next.length < 6) { setPwdError('New password must be at least 6 characters'); return }
    if (pwd.next !== pwd.confirm) { setPwdError('New passwords do not match'); return }
    setPwdSaving(true)
    setPwdError('')
    setPwdDone('')
    try {
      await changePassword(pwd.current, pwd.next)
      setPwdDone('Password changed successfully.')
      setPwd({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwdError(err.message || 'Failed to change password')
    } finally {
      setPwdSaving(false)
    }
  }

  const handleReset = () => {
    clearOrders()
    setShowResetConfirm(false)
  }

  const handleResetAll = () => {
    clearAllData()
    setShowResetAllConfirm(false)
  }

  const me = usersList.find(u => Number(u.id) === Number(user?.id))

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-heading mb-6">SETTINGS</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
          <h3 className="text-sm font-bold text-heading mb-4">BUSINESS INFORMATION</h3>
          <p className="text-[10px] text-muted mb-4">Shown on the login screen, sidebar and printed invoices.</p>
          <Success message={bizDone} />
          <Error message={bizError} />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Business Name *</label>
              <input type="text" value={biz.business_name || ''} onChange={e => setBizField('business_name', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Tagline</label>
                <input type="text" value={biz.tagline || ''} onChange={e => setBizField('tagline', e.target.value)} placeholder="e.g. Quality Products"
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Currency</label>
                <input type="text" value={biz.currency || ''} onChange={e => setBizField('currency', e.target.value)} placeholder="e.g. TSh"
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Phone</label>
                <input type="text" value={biz.phone || ''} onChange={e => setBizField('phone', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Email</label>
                <input type="email" value={biz.email || ''} onChange={e => setBizField('email', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Address</label>
              <input type="text" value={biz.address || ''} onChange={e => setBizField('address', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Receipt Footer (Swahili)</label>
                <input type="text" value={biz.receipt_thankyou || ''} onChange={e => setBizField('receipt_thankyou', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Receipt Footer (English)</label>
                <input type="text" value={biz.receipt_thankyou_en || ''} onChange={e => setBizField('receipt_thankyou_en', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <button onClick={saveBusiness} disabled={bizSaving}
              className="bg-primary text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1 disabled:opacity-50">
              <Save className="w-3 h-3" /> {bizSaving ? 'Saving...' : 'Save Business Info'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <h3 className="text-sm font-bold text-heading mb-4">ADMIN PROFILE</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-heading">{me?.name || user?.name || 'Administrator'}</p>
                <p className="text-xs text-muted">{me?.email || '—'}</p>
              </div>
            </div>
            <Success message={profileDone} />
            <Error message={profileError} />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Full Name</label>
                <input type="text" value={profile.name} onChange={e => setProfileField('name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Username</label>
                  <input type="text" value={profile.username} onChange={e => setProfileField('username', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Email</label>
                  <input type="email" value={profile.email} onChange={e => setProfileField('email', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              <button onClick={saveProfile} disabled={profileSaving}
                className="bg-primary text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1 disabled:opacity-50">
                <Save className="w-3 h-3" /> {profileSaving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <h3 className="text-sm font-bold text-heading mb-4 flex items-center gap-1.5"><KeyRound className="w-4 h-4 text-accent" /> CHANGE PASSWORD</h3>
            <Success message={pwdDone} />
            <Error message={pwdError} />
            <div className="space-y-3">
              <input type="password" placeholder="Current password" value={pwd.current} onChange={e => setPwdField('current', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input type="password" placeholder="New password" value={pwd.next} onChange={e => setPwdField('next', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input type="password" placeholder="Confirm new password" value={pwd.confirm} onChange={e => setPwdField('confirm', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <button onClick={savePassword} disabled={pwdSaving}
                className="bg-primary text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1 disabled:opacity-50">
                <Save className="w-3 h-3" /> {pwdSaving ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <h3 className="text-sm font-bold text-heading mb-4">RESET DATA</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted mb-2">Clear all sales orders and customer records. Products will not be affected.</p>
                <button onClick={() => setShowResetConfirm(true)} className="bg-warning text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-yellow-600 transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Reset Sales & Customers
                </button>
              </div>
              <hr className="border-line" />
              <div>
                <p className="text-xs text-muted mb-2">Clear everything - all products, orders, and settings. This cannot be undone.</p>
                <button onClick={() => setShowResetAllConfirm(true)} className="bg-danger text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Reset All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-warning" /></div>
            <h3 className="text-sm font-bold text-heading mb-1">Reset Sales & Customers?</h3>
            <p className="text-xs text-muted mb-6">This will permanently delete all orders. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleReset} className="flex-1 bg-warning text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-yellow-600 transition-colors">Reset</button>
            </div>
          </div>
        </div>
      )}

      {showResetAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-6 h-6 text-danger" /></div>
            <h3 className="text-sm font-bold text-heading mb-1">Reset All Data?</h3>
            <p className="text-xs text-muted mb-6">This will permanently delete ALL products, orders, and data. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetAllConfirm(false)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleResetAll} className="flex-1 bg-danger text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-red-700 transition-colors">Reset Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}