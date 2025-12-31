import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TermsAndConditions() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing and using Vilo's platform, you accept and agree to be bound by these Terms and Conditions.
              If you do not agree to these terms, please do not use our services. These terms apply to all visitors,
              users, hosts, and guests who access or use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. User Accounts</h2>
            <p className="text-gray-600 leading-relaxed">
              When you create an account with us, you must provide accurate, complete, and current information.
              You are responsible for safeguarding the password and for all activities that occur under your account.
              You agree to notify us immediately of any unauthorized access to or use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed">
              You agree to use the platform only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-600">
              <li>Use the platform in any way that violates any applicable law or regulation</li>
              <li>Post false, misleading, or fraudulent listings or information</li>
              <li>Engage in any conduct that restricts or inhibits anyone's use of the platform</li>
              <li>Attempt to gain unauthorized access to the platform or other users' accounts</li>
              <li>Use the platform to transmit any malicious code or harmful content</li>
              <li>Circumvent or attempt to circumvent any security features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Booking Policies</h2>
            <p className="text-gray-600 leading-relaxed">
              All bookings made through Vilo are subject to the availability and acceptance by the property host.
              Booking confirmations are subject to the host's approval and the accuracy of the listing information.
              Guests must comply with all house rules and policies set by the host.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              Vilo acts as an intermediary platform connecting hosts and guests. We do not own, manage, or control
              any of the properties listed on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Cancellation and Refunds</h2>
            <p className="text-gray-600 leading-relaxed">
              Cancellation policies are set by individual hosts and vary by property. Please review the specific
              cancellation policy for each booking before confirming. Refunds, if applicable, will be processed
              according to the host's cancellation policy.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              In cases of force majeure, natural disasters, or circumstances beyond reasonable control,
              special cancellation terms may apply at Vilo's discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Payment Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              All payments are processed securely through our payment partners. Hosts agree to pay applicable
              platform fees as specified in their subscription or service agreement. Guests agree to pay all
              charges associated with their bookings, including any additional fees or taxes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              To the maximum extent permitted by law, Vilo shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including without limitation, loss of profits, data,
              use, goodwill, or other intangible losses, resulting from your access to or use of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Indemnification</h2>
            <p className="text-gray-600 leading-relaxed">
              You agree to defend, indemnify, and hold harmless Vilo, its affiliates, and their respective
              officers, directors, employees, and agents from any claims, damages, losses, or expenses arising
              out of your use of the platform or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. We will provide notice of any
              material changes by updating the "Last updated" date. Your continued use of the platform after
              such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of South Africa,
              without regard to its conflict of law provisions. Any disputes arising under these Terms shall
              be subject to the exclusive jurisdiction of the courts of South Africa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about these Terms, please contact us at support@vilo.co.za
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
