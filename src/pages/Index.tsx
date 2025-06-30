
import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';

const Index = () => {
  const features = [
    {
      title: 'Easy Survey Distribution',
      description: 'Send surveys to staff with just a few clicks, track responses, and send reminders.'
    },
    {
      title: 'Powerful Analytics',
      description: 'Visualise results with intuitive graphs and compare your school data with national benchmarks.'
    },
    {
      title: 'Anonymous Responses',
      description: 'Staff can submit feedback anonymously, encouraging honest and open communication.'
    },
    {
      title: 'Wellbeing Focused',
      description: 'Questions designed by wellbeing experts to identify key areas for improvement.'
    }
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section 
        className="relative py-16 md:py-24 overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brandPurple-100 to-white z-[-1]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-12 lg:pr-20 mb-10 md:mb-0">
              <span className="inline-block bg-brandPurple-100 text-brandPurple-800 text-sm font-medium px-3 py-1 rounded-full mb-4 animate-slide-up">
                National Staff Wellbeing Survey
              </span>
              <h1 
                id="hero-heading"
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 animate-slide-up [animation-delay:100ms]"
              >
                Create a happy, healthy team
              </h1>
              <p className="text-lg text-gray-700 mb-8 animate-slide-up [animation-delay:200ms]">
                Our survey helps school leaders understand staff wellbeing in their setting 
                compared with other schools and colleges nationwide.
              </p>
              <div className="flex flex-wrap gap-4 animate-slide-up [animation-delay:300ms]">
                <Link 
                  to="/signup" 
                  className="btn-primary"
                  aria-label="Sign up for an account"
                >
                  Get started
                </Link>
                <Link 
                  to="/login" 
                  className="btn-secondary"
                  aria-label="Log in to your account"
                >
                  Log in
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-4 animate-slide-up [animation-delay:400ms]">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-brandPurple-400 to-brandPurple-600 rounded-2xl blur opacity-30"></div>
                <div className="glass-card relative rounded-2xl overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1577896851231-70ef18881754?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80" 
                    alt="Teachers collaborating in a meeting"
                    className="w-full h-[400px] object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        className="py-16 bg-white"
        aria-labelledby="features-heading"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 
              id="features-heading"
              className="text-3xl font-bold text-gray-900 mb-4"
            >
              Why use our wellbeing survey?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our platform makes it simple to gather, analyse, and act on staff feedback,
              helping you create a happier, more productive educational environment.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="card p-6 h-full hover:translate-y-[-4px]"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-16 bg-brandPurple-50"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 
            id="cta-heading"
            className="text-3xl font-bold text-gray-900 mb-4"
          >
            Ready to start gathering feedback?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Sign up today and send your first staff wellbeing survey in minutes.
          </p>
          <Link 
            to="/signup" 
            className="btn-primary"
            aria-label="Create your account"
          >
            Create your account
          </Link>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
