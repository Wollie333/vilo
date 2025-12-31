import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Vilo ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when you use our platform. Please
              read this privacy policy carefully. If you do not agree with the terms of this privacy policy,
              please do not access the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-600">
              <li><strong>Account Information:</strong> Name, email address, phone number, password</li>
              <li><strong>Profile Information:</strong> Profile picture, business name, property details</li>
              <li><strong>Booking Information:</strong> Reservation dates, guest counts, special requests</li>
              <li><strong>Payment Information:</strong> Payment method details (processed securely by our payment partners)</li>
              <li><strong>Communications:</strong> Messages, reviews, support inquiries</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">We also automatically collect certain information, including:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-600">
              <li>Device information (browser type, operating system)</li>
              <li>Log data (IP address, access times, pages viewed)</li>
              <li>Location information (with your consent)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-600">
              <li>Provide, maintain, and improve our services</li>
              <li>Process bookings and payments</li>
              <li>Send transactional communications (booking confirmations, updates)</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Detect, prevent, and address fraud and security issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="text-gray-600 leading-relaxed">We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-600">
              <li><strong>With Hosts/Guests:</strong> To facilitate bookings, we share relevant information between hosts and guests</li>
              <li><strong>Service Providers:</strong> With third-party vendors who assist in providing our services</li>
              <li><strong>Payment Processors:</strong> To process payments securely</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed">
              We use cookies and similar tracking technologies to collect and store information. Cookies help us
              improve your experience, analyze usage patterns, and personalize content. You can control cookies
              through your browser settings, but disabling them may affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. However, no method of
              transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes for which
              it was collected, comply with legal obligations, resolve disputes, and enforce our agreements.
              Booking records may be retained for tax and legal compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              Depending on your location, you may have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-600">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              To exercise these rights, please contact us at privacy@vilo.co.za
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              Our platform may contain links to third-party websites or integrate with third-party services.
              We are not responsible for the privacy practices of these third parties. We encourage you to
              read the privacy policies of any third-party services you use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Our platform is not intended for children under 18 years of age. We do not knowingly collect
              personal information from children under 18. If you believe we have collected information from
              a child under 18, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              updating the "Last updated" date and, for material changes, by providing additional notice.
              Your continued use of the platform after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              Email: privacy@vilo.co.za<br />
              Address: South Africa
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
