import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';

export function Legal() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Legal Information</h1>

          <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
            {/* Company Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Information</h2>
              <div className="text-gray-700 space-y-2">
                <p><strong>Service Name:</strong> Click Tracking Service</p>
                <p><strong>Service Type:</strong> URL Shortening and Analytics Platform</p>
                <p><strong>Contact:</strong> legal@clicktracking.com</p>
              </div>
            </section>

            {/* Legal Disclaimers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Legal Disclaimers</h2>
              <div className="text-gray-700 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Service Availability</h3>
                  <p>
                    Click Tracking Service is provided "as is" without warranties of any kind, either express or implied. 
                    While we strive to maintain 99.9% uptime, we do not guarantee uninterrupted service availability. 
                    Scheduled maintenance and unforeseen technical issues may result in temporary service disruptions.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Accuracy</h3>
                  <p>
                    We make reasonable efforts to ensure the accuracy of analytics data, including click counts, 
                    user tracking, and revenue attribution. However, we do not guarantee 100% accuracy due to 
                    technical limitations such as ad blockers, browser privacy settings, and network issues. 
                    Analytics data should be used for informational purposes and general trends.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">User Responsibility</h3>
                  <p>
                    Users are solely responsible for the content of destination URLs and the use of short URLs 
                    created through our service. We do not monitor, verify, or endorse the content of destination 
                    URLs. Users must ensure their use of the service complies with all applicable laws and regulations.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Prohibited Use</h3>
                  <p>
                    Users may not use Click Tracking Service for illegal activities, spam, phishing, malware 
                    distribution, or any purpose that violates our Terms of Service. We reserve the right to 
                    suspend or terminate accounts that violate these restrictions without prior notice.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Limitation of Liability</h3>
                  <p>
                    To the maximum extent permitted by law, Click Tracking Service and its operators shall not 
                    be liable for any indirect, incidental, special, consequential, or punitive damages, including 
                    but not limited to loss of profits, data, or business opportunities, arising from the use or 
                    inability to use the service.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Third-Party Services</h3>
                  <p>
                    Our service may integrate with third-party platforms and services. We are not responsible 
                    for the availability, accuracy, or content of third-party services. Users interact with 
                    third-party services at their own risk.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Changes to Service</h3>
                  <p>
                    We reserve the right to modify, suspend, or discontinue any aspect of the service at any 
                    time without prior notice. We may also change pricing, features, and terms of service with 
                    reasonable notice to users.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Intellectual Property</h3>
                  <p>
                    All content, features, and functionality of Click Tracking Service, including but not limited 
                    to software, text, graphics, logos, and design, are owned by the service operators and protected 
                    by copyright, trademark, and other intellectual property laws.
                  </p>
                </div>
              </div>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-700">
                These legal terms and your use of Click Tracking Service shall be governed by and construed in 
                accordance with applicable laws. Any disputes arising from the use of this service shall be 
                resolved through binding arbitration or in courts of competent jurisdiction.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about these legal terms or need to report a legal concern, please contact us at:
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Email:</strong> legal@clicktracking.com
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
