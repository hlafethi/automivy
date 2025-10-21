import React, { useState, useEffect } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { LandingService, LandingContent } from '../services/landingService';


export function LandingPage() {
  const [content, setContent] = useState<LandingContent>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const landingContent = await LandingService.getContent();
      console.log('🔍 [LandingPage] Contenu chargé:', landingContent);
      console.log('🔍 [LandingPage] Image hero:', landingContent.hero?.background_image);
      setContent(landingContent);
    } catch (error) {
      console.error('Erreur lors du chargement du contenu:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const hero = content.hero || {};
  const features = content.features || {};
  const pricing = content.pricing || {};
  const about = content.about || {};
  const contact = content.contact || {};
  const footer = content.footer || {};

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* Logo */}
              {hero.logo_image && (
                <img 
                  src={`http://localhost:3004${hero.logo_image}?v=${Date.now()}`} 
                  alt="Logo AUTOMIVY" 
                  className="h-8 w-auto"
                />
              )}
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-green-600">AUTOMIVY</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#features" className="text-slate-600 hover:text-green-600 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-green-600 transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-slate-600 hover:text-green-600 transition-colors">
                About
              </a>
              <a href="#contact" className="text-slate-600 hover:text-green-600 transition-colors">
                Contact
              </a>
              <a
                href="/login"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 min-h-[60vh] flex items-center">
        {/* Background Media (Image ou Vidéo) */}
        {hero.media_type === 'video' && hero.hero_video ? (
          <video 
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay 
            muted 
            loop 
            playsInline
          >
            <source src={`http://localhost:3004${hero.hero_video}?v=${Date.now()}`} type="video/mp4" />
            <source src={`http://localhost:3004${hero.hero_video}?v=${Date.now()}`} type="video/webm" />
            <source src={`http://localhost:3004${hero.hero_video}?v=${Date.now()}`} type="video/ogg" />
          </video>
        ) : hero.background_image ? (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url(http://localhost:3004${hero.background_image}?v=${Date.now()})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        ) : (
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom right, #f0fdf4, #f8fafc, #eff6ff)'
            }}
          />
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {hero.title || 'AUTOMIVY'}
            </h1>
            <p className="text-2xl text-white mb-4">
              {hero.subtitle || 'Intelligent Automation Platform'}
            </p>
            <p className="text-lg text-white mb-8 max-w-3xl mx-auto">
              {hero.description || 'Transform your business with powerful automation workflows. Deploy, manage, and scale your processes with our cutting-edge n8n integration.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/login"
                className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
              >
                {hero.button_text || 'Get Started'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <a
                href="#features"
                className="border-2 border-green-600 text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-green-600 hover:text-white transition-all duration-200"
              >
                {hero.secondary_button || 'Learn More'}
              </a>
            </div>
          </div>
        </div>
        
      </section>

      {/* Video Demo Section */}
      {content.video_demo?.enabled === 'true' && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                {content.video_demo?.title || 'Découvrez AUTOMIVY en action'}
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                {content.video_demo?.subtitle || 'Regardez ces démonstrations pour comprendre comment notre plateforme peut transformer votre entreprise'}
              </p>
            </div>
            
            {/* Grille des vidéos */}
            <div className={`grid gap-8 ${
              content.video_demo?.layout === '3' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 lg:grid-cols-2'
            }`}>
              {/* Afficher toutes les vidéos activées */}
              {Array.from({ length: 10 }, (_, i) => i + 1).map((videoIndex) => {
                const videoEnabled = content.video_demo?.[`video_${videoIndex}_enabled`] === 'true';
                const videoFile = content.video_demo?.[`video_${videoIndex}_video`];
                
                if (!videoEnabled) return null;
                
                return (
                  <div key={videoIndex} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="relative">
                      {videoFile ? (
                        <video
                          className="w-full h-64 object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                          controls
                        >
                          <source src={`http://localhost:3004${videoFile}?v=${Date.now()}`} type="video/mp4" />
                          <source src={`http://localhost:3004${videoFile}?v=${Date.now()}`} type="video/webm" />
                          <source src={`http://localhost:3004${videoFile}?v=${Date.now()}`} type="video/ogg" />
                          Votre navigateur ne supporte pas la lecture de vidéos.
                        </video>
                      ) : (
                        <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12l-4-4h8l-4 4z"/>
                              </svg>
                            </div>
                            <p className="text-slate-500 text-sm">Aucune vidéo uploadée</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-slate-900 mb-3">
                        {content.video_demo?.[`video_${videoIndex}_title`] || `Vidéo ${videoIndex}`}
                      </h3>
                      <p className="text-slate-600">
                        {content.video_demo?.[`video_${videoIndex}_description`] || `Description de la vidéo ${videoIndex}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {features.title || 'Powerful Features'}
            </h2>
            <p className="text-xl text-slate-600 mb-4">
              {features.subtitle || 'Everything you need to automate your business'}
            </p>
            <p className="text-lg text-slate-500 max-w-3xl mx-auto">
              {features.description || 'Our platform provides all the tools you need to create, deploy, and manage sophisticated automation workflows.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: features.feature_1_title, description: features.feature_1_description, emoji: features.feature_1_icon, enabled: features.feature_1_enabled },
              { title: features.feature_2_title, description: features.feature_2_description, emoji: features.feature_2_icon, enabled: features.feature_2_enabled },
              { title: features.feature_3_title, description: features.feature_3_description, emoji: features.feature_3_icon, enabled: features.feature_3_enabled },
              { title: features.feature_4_title, description: features.feature_4_description, emoji: features.feature_4_icon, enabled: features.feature_4_enabled },
              { title: features.feature_5_title, description: features.feature_5_description, emoji: features.feature_5_icon, enabled: features.feature_5_enabled },
              { title: features.feature_6_title, description: features.feature_6_description, emoji: features.feature_6_icon, enabled: features.feature_6_enabled },
            ].filter(feature => feature.enabled === 'true' || feature.enabled === undefined).map((feature, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                {features[`feature_${index + 1}_image`] && (
                  <div className="mb-4">
                    <img 
                      src={`http://localhost:3004${features[`feature_${index + 1}_image`]}?v=${Date.now()}`}
                      alt={feature.title || `Feature ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="text-4xl mb-4 text-center">
                  {feature.emoji || '🚀'}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {feature.title || `Feature ${index + 1}`}
                </h3>
                <p className="text-slate-600">
                  {feature.description || 'Feature description goes here.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {pricing.title || 'Simple Pricing'}
            </h2>
            <p className="text-xl text-slate-600 mb-4">
              {pricing.subtitle || 'Choose the plan that fits your needs'}
            </p>
            <p className="text-lg text-slate-500 max-w-3xl mx-auto">
              {pricing.description || 'Start free and scale as you grow. No hidden fees, no surprises.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: pricing.plan_1_name,
                price: pricing.plan_1_price,
                period: pricing.plan_1_period,
                description: pricing.plan_1_description,
                features: [
                  pricing.plan_1_feature_1,
                  pricing.plan_1_feature_2,
                  pricing.plan_1_feature_3,
                  pricing.plan_1_feature_4,
                ].filter(Boolean)
              },
              {
                name: pricing.plan_2_name,
                price: pricing.plan_2_price,
                period: pricing.plan_2_period,
                description: pricing.plan_2_description,
                features: [
                  pricing.plan_2_feature_1,
                  pricing.plan_2_feature_2,
                  pricing.plan_2_feature_3,
                  pricing.plan_2_feature_4,
                  pricing.plan_2_feature_5,
                  pricing.plan_2_feature_6,
                ].filter(Boolean),
                popular: true
              },
              {
                name: pricing.plan_3_name,
                price: pricing.plan_3_price,
                period: pricing.plan_3_period,
                description: pricing.plan_3_description,
                features: [
                  pricing.plan_3_feature_1,
                  pricing.plan_3_feature_2,
                  pricing.plan_3_feature_3,
                  pricing.plan_3_feature_4,
                  pricing.plan_3_feature_5,
                  pricing.plan_3_feature_6,
                ].filter(Boolean)
              },
            ].map((plan, index) => (
              <div key={index} className={`bg-white rounded-2xl p-8 shadow-lg ${plan.popular ? 'ring-2 ring-green-500 relative' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {plan.name || `Plan ${index + 1}`}
                  </h3>
                  <div className="text-4xl font-bold text-slate-900 mb-2">
                    {plan.price || '$0'}
                    {plan.period && <span className="text-lg text-slate-500">/{plan.period}</span>}
                  </div>
                  <p className="text-slate-600">
                    {plan.description || 'Plan description goes here.'}
                  </p>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <span className="text-green-500 mr-3 flex-shrink-0">✅</span>
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className={`w-full block text-center py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      {about.enabled === 'true' && (
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {about.title || 'About AUTOMIVY'}
            </h2>
            <p className="text-xl text-slate-600 mb-4">
              {about.subtitle || 'Empowering businesses through automation'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg text-slate-600 mb-6">
                {about.description || 'We believe that automation should be accessible to everyone. Our platform makes it easy for businesses of all sizes to implement powerful automation workflows without the complexity.'}
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Our Mission</h3>
                  <p className="text-slate-600">
                    {about.mission || 'Our mission is to democratize automation and help businesses focus on what matters most.'}
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Our Vision</h3>
                  <p className="text-slate-600">
                    {about.vision || 'We envision a world where every business can leverage the power of automation to achieve their goals.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl p-8">
              <div className="text-center">
                <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="text-4xl">⚡</div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Why Choose AUTOMIVY?</h3>
                <p className="text-slate-600">
                  We combine cutting-edge technology with user-friendly design to make automation accessible to everyone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Contact Section */}
      {contact.enabled === 'true' && (
      <section id="contact" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {contact.title || 'Get in Touch'}
            </h2>
            <p className="text-xl text-slate-600 mb-4">
              {contact.subtitle || 'Ready to transform your business?'}
            </p>
            <p className="text-lg text-slate-500 max-w-3xl mx-auto">
              {contact.description || 'Contact us today to learn more about how AUTOMIVY can help your business grow.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="text-2xl">📧</div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Email</h3>
              <p className="text-slate-600">{contact.email || 'contact@automivy.com'}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="text-2xl">📞</div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Phone</h3>
              <p className="text-slate-600">{contact.phone || '+1 (555) 123-4567'}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="text-2xl">📍</div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Address</h3>
              <p className="text-slate-600">{contact.address || '123 Automation Street, Tech City, TC 12345'}</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Footer */}
      {footer.enabled === 'true' && (
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                {/* Logo */}
                {hero.logo_image && (
                  <img 
                    src={`http://localhost:3004${hero.logo_image}?v=${Date.now()}`} 
                    alt="Logo AUTOMIVY" 
                    className="h-8 w-auto"
                  />
                )}
                <h3 className="text-2xl font-bold text-green-400">
                  {footer.company_name || 'AUTOMIVY'}
                </h3>
              </div>
              <p className="text-slate-300 mb-4">
                {footer.tagline || 'Intelligent Automation Platform'}
              </p>
              <p className="text-slate-400 text-sm">
                {footer.description || 'Transform your business with powerful automation workflows.'}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-slate-300 hover:text-green-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-slate-300 hover:text-green-400 transition-colors">Pricing</a></li>
                <li><a href="/login" className="text-slate-300 hover:text-green-400 transition-colors">Sign In</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="text-slate-300 hover:text-green-400 transition-colors">About</a></li>
                <li><a href="#contact" className="text-slate-300 hover:text-green-400 transition-colors">Contact</a></li>
                <li><a href={footer.support_link || '/support'} className="text-slate-300 hover:text-green-400 transition-colors">{footer.support_text || 'Support'}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href={footer.privacy_link || '/privacy'} className="text-slate-300 hover:text-green-400 transition-colors">{footer.privacy_text || 'Privacy'}</a></li>
                <li><a href={footer.terms_link || '/terms'} className="text-slate-300 hover:text-green-400 transition-colors">{footer.terms_text || 'Terms'}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center">
            <p className="text-slate-400">
              {footer.copyright || '© 2024 AUTOMIVY. All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
