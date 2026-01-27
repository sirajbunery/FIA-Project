'use client';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold mb-3">About BEOE Validator</h3>
            <p className="text-gray-400 text-sm">
              AI-powered document validation system to help Pakistani travelers verify their
              documents before traveling internationally.
            </p>
            <p className="text-gray-400 text-sm font-urdu mt-2">
              پاکستانی مسافروں کی دستاویزات کی تصدیق کا نظام
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://beoe.gov.pk" target="_blank" rel="noopener noreferrer"
                   className="text-gray-400 hover:text-white transition-colors">
                  BEOE Official Website
                </a>
              </li>
              <li>
                <a href="https://gamca.org" target="_blank" rel="noopener noreferrer"
                   className="text-gray-400 hover:text-white transition-colors">
                  GAMCA Medical
                </a>
              </li>
              <li>
                <a href="https://www.fia.gov.pk" target="_blank" rel="noopener noreferrer"
                   className="text-gray-400 hover:text-white transition-colors">
                  FIA Pakistan
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Contact Support</h3>
            <p className="text-gray-400 text-sm mb-2">
              Need help? Reach out to us on WhatsApp or email.
            </p>
            <div className="space-y-1 text-sm">
              <p className="text-gray-400">
                WhatsApp: <span className="text-white">+92 333 6689905</span>
              </p>
              <p className="text-gray-400">
                Email: <span className="text-white">sirajbunery048@gmail.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} BEOE Document Validator. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            This is an independent tool and is not officially affiliated with the Government of Pakistan.
          </p>
        </div>
      </div>
    </footer>
  );
}
