'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/navbar';
import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FAQPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${API_URL}/api/faqs`).then(r => r.json());
        if (res.success) {
          setFaqs(res.data.faqs);
        }
      } catch (err) {
        console.error('Failed to fetch FAQs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(faq => activeCategory === 'All' || faq.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          
          <div className="text-center mb-16">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions about our platform, services, and how we can help you on your spiritual journey.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium">No FAQs available yet.</p>
            </div>
          ) : (
            <>
              {categories.length > 2 && (
                <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
                  {categories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveCategory(cat as string)}
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                        activeCategory === cat
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-white text-gray-600 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 hover:text-amber-600'
                      }`}
                    >
                      {cat as string}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <div 
                    key={faq.id} 
                    className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                      openFaq === faq.id ? 'border-amber-200 shadow-md ring-1 ring-amber-100' : 'border-gray-100 shadow-sm hover:border-amber-100 hover:shadow'
                    }`}
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none"
                    >
                      <h3 className={`font-semibold text-lg transition-colors pr-8 ${openFaq === faq.id ? 'text-amber-700' : 'text-gray-900'}`}>
                        {faq.question}
                      </h3>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${openFaq === faq.id ? 'bg-amber-100 text-amber-600 rotate-180' : 'bg-gray-50 text-gray-400'}`}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {openFaq === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 text-gray-600 leading-relaxed border-t border-gray-50">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-16 bg-amber-50 rounded-3xl p-8 md:p-12 text-center border border-amber-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Still have questions?</h3>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              If you couldn't find the answer you were looking for, our support team is always ready to help you out.
            </p>
            <a href="/#contact" className="inline-flex items-center justify-center px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5">
              Contact Support
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
