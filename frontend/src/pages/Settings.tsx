import { Wrench, UserPlus, Bell, Globe, CreditCard } from 'lucide-react'
import { useState } from 'react'

export default function Settings() {
  const [activeSection, setActiveSection] = useState('account')
  const [twoStepEnabled, setTwoStepEnabled] = useState(false)

  const generalSettings = [
    { id: 'apps', name: 'Apps', icon: Wrench },
    { id: 'account', name: 'Account', icon: UserPlus },
    { id: 'notification', name: 'Notification', icon: Bell },
    { id: 'language', name: 'Language & Region', icon: Globe },
  ]

  const workspaceSettings = [
    { id: 'general', name: 'General', icon: Wrench },
    { id: 'members', name: 'Members', icon: UserPlus },
    { id: 'billing', name: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="p-8 bg-white min-h-full">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Settings Navigation */}
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              GENERAL SETTINGS
            </h2>
            <div className="space-y-1">
              {generalSettings.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              WORKSPACE SETTINGS
            </h2>
            <div className="space-y-1">
              {workspaceSettings.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Settings Content */}
        <div className="lg:col-span-2">
          {activeSection === 'account' && (
            <div className="space-y-8">
              {/* My Profile */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Profile</h2>
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                    <span className="text-white text-2xl font-semibold">BF</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-3 mb-4">
                      <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
                        <span>+</span>
                        <span>Change Image</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
                        Remove Image
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      We support PNGs, JPEGs and GIFs under 2MB
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Brian"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Frederin"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Account Security */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue="brianfrederin@email.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <button className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                      Change email
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        defaultValue="•••••••••••"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <button className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                      Change password
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        2-Step Verifications
                      </h3>
                      <p className="text-sm text-gray-500">
                        Add an additional layer of security to your account during login.
                      </p>
                    </div>
                    <button
                      onClick={() => setTwoStepEnabled(!twoStepEnabled)}
                      className={`ml-4 w-12 h-6 rounded-full transition-colors ${
                        twoStepEnabled ? 'bg-black' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          twoStepEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                        style={{ marginTop: '2px' }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection !== 'account' && (
            <div className="text-center py-12">
              <p className="text-gray-500">Settings section coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

