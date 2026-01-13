import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';

export function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>

          <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement to Terms</h2>
              <p className="text-gray-700">
                By accessing or using Click Tracking Service ("Service", "we", "our", or "us"), you agree to be 
                bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use 
                the Service. We reserve the right to modify these Terms at any time, and your continued use of 
                the Service constitutes acceptance of any changes.
              </p>
            </section>

            {/* Account Registration */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Registration</h2>
              <div className="text-gray-700 space-y-3">
                <p>To use the Service, you must create an account by providing:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>A valid email address</li>
                  <li>A secure password meeting our minimum requirements (8 characters)</li>
                </ul>
                <p className="mt-3">You agree to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Confirm your email address through our verification process</li>
                </ul>
                <p className="mt-3">
                  You must be at least 13 years old to create an account. By creating an account, you represent 
                  that you meet this age requirement.
                </p>
              </div>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceptable Use Policy</h2>
              <div className="text-gray-700 space-y-3">
                <p>You agree to use the Service only for lawful purposes. You may not:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Create short URLs that link to illegal content, malware, or phishing sites</li>
                  <li>Use the Service to distribute spam or unsolicited communications</li>
                  <li>Violate any applicable laws, regulations, or third-party rights</li>
                  <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Use automated tools to create excessive numbers of short URLs</li>
                  <li>Impersonate any person or entity</li>
                  <li>Collect or harvest personal information from other users</li>
                  <li>Use the Service for fraudulent or deceptive purposes</li>
                </ul>
                <p className="mt-3">
                  We reserve the right to investigate and take appropriate action against anyone who violates 
                  this policy, including suspending or terminating accounts without notice.
                </p>
              </div>
            </section>

            {/* Service Features */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Features and Limitations</h2>
              <div className="text-gray-700 space-y-3">
                <p>The Service provides:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>URL shortening with auto-generated or custom short codes</li>
                  <li>Click tracking and analytics</li>
                  <li>User identification across multiple sessions</li>
                  <li>Revenue attribution through conversion webhooks</li>
                  <li>Management dashboard for creating and monitoring short URLs</li>
                </ul>
                <p className="mt-3">
                  Service limitations vary by pricing tier and may include restrictions on:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Number of short URLs</li>
                  <li>Monthly click volume</li>
                  <li>Access to advanced features</li>
                  <li>API usage</li>
                </ul>
              </div>
            </section>

            {/* Data Ownership */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Ownership and Privacy</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  You retain ownership of the destination URLs and content you create through the Service. 
                  By using the Service, you grant us a license to:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Store and process your short URLs and analytics data</li>
                  <li>Display your data to you through the management interface</li>
                  <li>Use aggregated, anonymized data for service improvement</li>
                </ul>
                <p className="mt-3">
                  Your data is isolated from other users' data. We do not share your individual analytics or 
                  short URL data with third parties except as described in our Privacy Policy.
                </p>
                <p className="mt-3">
                  For detailed information about data collection and usage, please review our{' '}
                  <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
                </p>
              </div>
            </section>

            {/* Payment and Billing */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment and Billing</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  Paid plans are billed monthly or annually based on your selected pricing tier. You agree to:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide accurate payment information</li>
                  <li>Pay all fees associated with your account</li>
                  <li>Authorize automatic recurring charges</li>
                </ul>
                <p className="mt-3">
                  We reserve the right to change pricing with 30 days' notice. If you do not agree to price 
                  changes, you may cancel your subscription before the changes take effect.
                </p>
                <p className="mt-3">
                  Refunds are provided at our discretion. Cancellations take effect at the end of the current 
                  billing period.
                </p>
              </div>
            </section>

            {/* Service Availability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Availability and Modifications</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  We strive to maintain high service availability but do not guarantee uninterrupted access. 
                  The Service may be temporarily unavailable due to:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Scheduled maintenance</li>
                  <li>Technical issues or outages</li>
                  <li>Security incidents</li>
                  <li>Force majeure events</li>
                </ul>
                <p className="mt-3">
                  We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time 
                  without liability. We will provide reasonable notice of significant changes when possible.
                </p>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Intellectual Property Rights</h2>
              <p className="text-gray-700">
                The Service, including its software, design, content, and trademarks, is owned by Click Tracking 
                Service and protected by copyright, trademark, and other intellectual property laws. You may not:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-gray-700">
                <li>Copy, modify, or distribute the Service or its content</li>
                <li>Reverse engineer or decompile the Service</li>
                <li>Remove or alter any copyright or trademark notices</li>
                <li>Use our trademarks without written permission</li>
              </ul>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Termination</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  You may terminate your account at any time by contacting us or using account deletion features 
                  in the dashboard.
                </p>
                <p>
                  We may suspend or terminate your account immediately without notice if:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>You violate these Terms of Service</li>
                  <li>Your account is used for illegal or harmful activities</li>
                  <li>Payment for your account fails</li>
                  <li>We are required to do so by law</li>
                </ul>
                <p className="mt-3">
                  Upon termination, your access to the Service will cease, and your data may be deleted according 
                  to our data retention policies.
                </p>
              </div>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Disclaimers and Warranties</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER 
                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Warranties of merchantability or fitness for a particular purpose</li>
                  <li>Warranties of accuracy, reliability, or completeness of data</li>
                  <li>Warranties of uninterrupted or error-free service</li>
                  <li>Warranties that the Service will meet your requirements</li>
                </ul>
                <p className="mt-3">
                  You use the Service at your own risk. We do not warrant that the Service is free from viruses 
                  or other harmful components.
                </p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="text-gray-700">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLICK TRACKING SERVICE SHALL NOT BE LIABLE FOR ANY 
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-gray-700">
                <li>Loss of profits, revenue, or business opportunities</li>
                <li>Loss of data or analytics information</li>
                <li>Business interruption</li>
                <li>Reputational harm</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Our total liability for any claims arising from the Service shall not exceed the amount you paid 
                us in the 12 months preceding the claim.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold harmless Click Tracking Service, its officers, employees, and 
                agents from any claims, damages, losses, or expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-gray-700">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Content you create or share through the Service</li>
              </ul>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law and Disputes</h2>
              <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with applicable laws. Any disputes 
                arising from these Terms or the Service shall be resolved through binding arbitration or in 
                courts of competent jurisdiction.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Email:</strong> support@clicktracking.com
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
