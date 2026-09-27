
import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';

const Index = () => {
  const features = [
    {
      title: 'Easy Survey Distribution',
      description: 'Share a link or email your staff in a few clicks, track responses, and send reminders.'
    },
    {
      title: 'Clear Results',
      description: 'See how your staff feel about leadership, workload, balance, health, support and more, in simple charts.'
    },
    {
      title: 'Anonymous Responses',
      description: 'Staff can submit feedback anonymously, encouraging honest and open communication.'
    },
    {
      title: 'Built on the Human Kind Framework',
      description: 'Every question links to the Human Kind framework, so your results point straight to the areas to work on.'
    }
  ];

  const steps = [
    { title: 'Survey your staff', description: 'Send a short, anonymous wellbeing survey. It only takes staff a few minutes.' },
    { title: 'See your results', description: 'Find out what staff think your school does well and where they would like to see change.' },
    { title: 'Build your action plan', description: 'Plan improvements across the eight areas of the Human Kind framework, from leadership to values.' },
    { title: 'Get accredited', description: 'Submit your completed plan for review and receive your Human Kind Award certificate.' },
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
                Human Kind Award
              </span>
              <h1 
                id="hero-heading"
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 animate-slide-up [animation-delay:100ms]"
              >
                Create a happy, healthy team
              </h1>
              <p className="text-lg text-gray-700 mb-8 animate-slide-up [animation-delay:200ms]">
                Survey your staff, see what's working, plan improvements against the
                Human Kind framework, and get your school accredited for its commitment to staff wellbeing.
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
              Why use the Human Kind Award?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We make it simple to gather, understand and act on staff feedback,
              helping you create a happier, healthier place to work.
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

      {/* How It Works Section */}
      <section
        className="py-16 bg-brandPurple-50"
        aria-labelledby="journey-heading"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2
              id="journey-heading"
              className="text-3xl font-bold text-gray-900 mb-4"
            >
              Your journey to the Human Kind Award
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Four steps, at your own pace.
            </p>
          </div>

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <li key={step.title} className="card p-6 h-full">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brandPurple-600 text-white font-bold mb-3">
                  {index + 1}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-16 bg-white"
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
