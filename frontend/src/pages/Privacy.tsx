import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';

export function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700">
                Click Tracking Service ("we", "our", or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, store, and protect your personal information 
                when you use our URL shortening and analytics platform.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
              <div className="text-gray-700 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
                  <p>
                    When you create an account, we collect:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Email address (used as username)</li>
                    <li>Password (stored as encrypted hash)</li>
                    <li>Account creation and last login timestamps</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Short URL Data</h3>
                  <p>
                    When you create short URLs, we collect:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Destination URLs you wish to shorten</li>
                    <li>Optional source URLs for tracking purposes</li>
                    <li>Custom short codes you create</li>
                    <li>URL creation and modification timestamps</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Click Tracking Data</h3>
                  <p>
                    When users click on short URLs, we automatically collect:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Tracking ID (generated and stored in browser cookies and localStorage)</li>
                    <li>Click timestamps</li>
                    <li>IP addresses</li>
                    <li>User agent strings (browser and device information)</li>
                    <li>Referrer URLs (where the click originated)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Conversion Data</h3>
                  <p>
                    When conversion webhooks are triggered, we collect:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Tracking IDs associated with purchases</li>
                    <li>Revenue amounts</li>
                    <li>Product identifiers</li>
                    <li>Conversion timestamps</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
              <div className="text-gray-700 space-y-3">
                <p>We use the collected information for the following purposes:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>
                    <strong>Service Delivery:</strong> To provide URL shortening, redirect, and analytics services
                  </li>
                  <li>
                    <strong>User Authentication:</strong> To verify your identity and secure your account
                  </li>
                  <li>
                    <strong>Analytics:</strong> To track clicks, unique users, and user journeys across short URLs
                  </li>
                  <li>
                    <strong>Revenue Attribution:</strong> To connect conversions to specific marketing links
                  </li>
                  <li>
                    <strong>Service Improvement:</strong> To analyze usage patterns and improve our platform
                  </li>
                  <li>
                    <strong>Communication:</strong> To send account-related emails (confirmation, password reset)
                  </li>
                  <li>
                    <strong>Security:</strong> To detect and prevent fraud, abuse, and unauthorized access
                  </li>
                </ul>
              </div>
            </section>

            {/* Data Storage and Retention */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Storage and Retention</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  <strong>Storage Location:</strong> All data is stored securely in PostgreSQL databases with 
                  industry-standard encryption and access controls.
                </p>
                <p>
                  <strong>Retention Periods:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Account data: Retained until account deletion</li>
                  <li>Short URL data: Retained until manually deleted by user</li>
                  <li>Click events: Retained indefinitely for analytics purposes</li>
                  <li>User tracking IDs: Expire after 365 days of inactivity</li>
                  <li>Email confirmation tokens: Expire after 24 hours</li>
                  <li>Password reset tokens: Expire after 1 hour</li>
                </ul>
              </div>
            </section>

            {/* Data Sharing and Disclosure */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sharing and Disclosure</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  We do not sell, rent, or trade your personal information to third parties. We may share 
                  your information only in the following circumstances:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>
                    <strong>With Your Consent:</strong> When you explicitly authorize us to share information
                  </li>
                  <li>
                    <strong>Service Providers:</strong> With trusted third-party services that help us operate 
                    (e.g., email delivery, hosting providers)
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> When required by law, court order, or government request
                  </li>
                  <li>
                    <strong>Security:</strong> To protect our rights, property, or safety, or that of our users
                  </li>
                </ul>
              </div>
            </section>

            {/* Cookies and Tracking Technologies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking Technologies</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  We use cookies and browser localStorage to provide our tracking services:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>
                    <strong>Tracking Cookies:</strong> We store a tracking ID in cookies and localStorage to 
                    identify users across multiple clicks. This cookie expires after 365 days.
                  </li>
                  <li>
                    <strong>Authentication Tokens:</strong> We store JWT tokens in localStorage to maintain 
                    your login session.
                  </li>
                  <li>
                    <strong>Third-Party Cookies:</strong> We do not use third-party advertising or analytics cookies.
                  </li>
                </ul>
                <p className="mt-3">
                  Users can disable cookies in their browser settings, but this will prevent tracking functionality 
                  and may impact the service experience.
                </p>
              </div>
            </section>

            {/* Your Privacy Rights */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Privacy Rights</h2>
              <div className="text-gray-700 space-y-3">
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>
                    <strong>Access:</strong> Request a copy of the personal data we hold about you
                  </li>
                  <li>
                    <strong>Correction:</strong> Request correction of inaccurate or incomplete data
                  </li>
                  <li>
                    <strong>Deletion:</strong> Request deletion of your account and associated data
                  </li>
                  <li>
                    <strong>Data Portability:</strong> Request export of your data in a machine-readable format
                  </li>
                  <li>
                    <strong>Opt-Out:</strong> Opt out of non-essential communications
                  </li>
                </ul>
                <p className="mt-3">
                  To exercise these rights, please contact us at privacy@clicktracking.com
                </p>
              </div>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-gray-700">
                <li>Password hashing using bcrypt</li>
                <li>Encrypted data transmission via HTTPS/TLS</li>
                <li>Secure database access controls</li>
                <li>Regular security audits and updates</li>
                <li>Account isolation to prevent unauthorized access to other users' data</li>
              </ul>
              <p className="text-gray-700 mt-3">
                However, no method of transmission over the internet is 100% secure. While we strive to protect 
                your data, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-700">
                Our service is not intended for users under the age of 13. We do not knowingly collect personal 
                information from children under 13. If we become aware that we have collected data from a child 
                under 13, we will take steps to delete that information promptly.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify users of material changes 
                by email or through a notice on our website. Your continued use of the service after changes 
                constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Email:</strong> privacy@clicktracking.com
              </p>
            </section>

            {/* Last Updated */}
            <section className="border-t pt-6">
              <p className="text-sm text-gray-600">
                Last Updated: December 2, 2025
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
