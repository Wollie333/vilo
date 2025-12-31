import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EarningsDisclaimer() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Earnings Disclaimer</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">No Guarantee of Earnings</h2>
            <p className="text-gray-600 leading-relaxed">
              Vilo makes no guarantees regarding the level of success or income you may experience by using our platform.
              The success of property hosts depends on many factors, including but not limited to location, property quality,
              pricing strategy, market conditions, and individual effort. We do not guarantee that you will earn any specific
              amount of income or achieve any particular level of success.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Host Earnings</h2>
            <p className="text-gray-600 leading-relaxed">
              Any earnings or income statements, or examples of earnings or income, are only estimates of what you might earn.
              There is no assurance that you will do as well as stated in any examples. If you rely upon any figures provided,
              you must accept the entire risk of not doing as well as the information provided.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              Earnings potential is entirely dependent on the individual using our platform, the property being listed,
              market demand, seasonal factors, and many other variables. We cannot guarantee your success or income level,
              nor are we responsible for any of your actions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Affiliate and Referral Disclosures</h2>
            <p className="text-gray-600 leading-relaxed">
              Vilo may offer referral or affiliate programs where users can earn commissions or credits for referring new
              hosts or guests to the platform. Any earnings from such programs are subject to the specific terms and
              conditions of those programs and are not guaranteed.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              Referral bonuses and affiliate commissions may be modified, suspended, or terminated at any time at Vilo's
              sole discretion. Past performance of referral earnings is not indicative of future results.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">General Liability Disclaimer</h2>
            <p className="text-gray-600 leading-relaxed">
              Vilo provides a platform for property owners to list and manage their accommodations. We are not responsible
              for the actions, behavior, or conduct of any host, guest, or third party. Property owners are solely
              responsible for their properties, listings, pricing, and interactions with guests.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              Vilo shall not be held liable for any direct, indirect, incidental, consequential, or punitive damages
              arising from the use of our platform, including but not limited to property damage, personal injury,
              loss of income, or any other damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Forward-Looking Statements</h2>
            <p className="text-gray-600 leading-relaxed">
              Any statements regarding future earnings, market trends, or business opportunities are forward-looking
              statements and are subject to risks and uncertainties. Actual results may differ materially from those
              expressed or implied in such statements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Advice</h2>
            <p className="text-gray-600 leading-relaxed">
              The information provided on this platform is for general informational purposes only and should not be
              construed as professional financial, legal, or tax advice. We recommend consulting with appropriate
              professionals before making any business or financial decisions related to your property or earnings.
            </p>
          </section>
        </div>

        <p className="text-sm text-gray-500 mt-12 pt-8 border-t border-gray-100">
          Last updated: January 2025
        </p>
      </main>
    </div>
  )
}
