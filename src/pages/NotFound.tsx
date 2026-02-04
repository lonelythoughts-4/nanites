import React from 'react';
    import { Link } from 'react-router-dom';
    import { Home, ArrowLeft } from 'lucide-react';
    import Header from '../components/Header';
    import Footer from '../components/Footer';

    const NotFound = () => {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header />
          
          <main className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-8">
                <h1 className="text-9xl font-bold text-gray-300">404</h1>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  The page you're looking for doesn't exist or has been moved. 
                  Let's get you back to your dashboard.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </button>
              </div>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <Link
                  to="/deposit"
                  className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Make a Deposit</h3>
                  <p className="text-gray-600 text-sm">Add funds to your account</p>
                </Link>
                <Link
                  to="/referrals"
                  className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Referral Program</h3>
                  <p className="text-gray-600 text-sm">Earn from referrals</p>
                </Link>
                <Link
                  to="/tutorials"
                  className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Help & Tutorials</h3>
                  <p className="text-gray-600 text-sm">Learn how to use the platform</p>
                </Link>
              </div>
            </div>
          </main>

          <Footer />
        </div>
      );
    };

    export default NotFound;