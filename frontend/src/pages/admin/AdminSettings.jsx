import { useState } from 'react'
import { User, Save, Trash2, AlertTriangle } from 'lucide-react'
import { useApp } from '../../context/useApp'

export default function AdminSettings() {
  const { clearOrders, clearAllData } = useApp()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false)

  const handleReset = () => {
    clearOrders()
    setShowResetConfirm(false)
  }

  const handleResetAll = () => {
    clearAllData()
    setShowResetAllConfirm(false)
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-heading mb-6">SETTINGS</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
          <h3 className="text-sm font-bold text-heading mb-4">BUSINESS INFORMATION</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Business Name</label>
              <input type="text" defaultValue="Mwinuka Enterprises Co Ltd" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Phone</label>
              <input type="text" defaultValue="0712 345 678" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Email</label>
              <input type="email" defaultValue="info@mwinuka.co.tz" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Address</label>
              <input type="text" defaultValue="Dar es Salaam, Tanzania" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <button className="bg-primary text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
              <Save className="w-3 h-3" /> Save Changes
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
                <p className="text-sm font-bold text-heading">Administrator</p>
                <p className="text-xs text-muted">admin@mwinuka.co.tz</p>
              </div>
            </div>
            <div className="space-y-3">
              <input type="text" defaultValue="Administrator" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input type="email" defaultValue="admin@mwinuka.co.tz" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <button className="bg-primary text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
                <Save className="w-3 h-3" /> Update Profile
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <h3 className="text-sm font-bold text-heading mb-4">CHANGE PASSWORD</h3>
            <div className="space-y-3">
              <input type="password" placeholder="Current password" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input type="password" placeholder="New password" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input type="password" placeholder="Confirm new password" className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <button className="bg-primary text-white px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
                <Save className="w-3 h-3" /> Change Password
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
