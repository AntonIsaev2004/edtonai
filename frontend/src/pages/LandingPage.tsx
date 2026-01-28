import React, { useState } from 'react';
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Footer from '@/components/landing/Footer';
import { Language } from '@/components/landing/types';
import { useTranslation } from 'react-i18next';

export default function LandingPage() {
    const { i18n } = useTranslation();
    // Sync state with i18next or just use local state for the landing visual text
    const [lang, setLang] = useState<Language>((i18n.language as Language) || 'en');

    const toggleLang = () => {
        const newLang = lang === 'en' ? 'ru' : 'en';
        setLang(newLang);
        i18n.changeLanguage(newLang);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white selection:bg-brand-500 selection:text-white">
            <Header lang={lang} toggleLang={toggleLang} />
            <main>
                <Hero lang={lang} />
                <div id="features">
                    <Features lang={lang} />
                </div>
                <div id="how-it-works">
                    <HowItWorks lang={lang} />
                </div>
            </main>
            <Footer lang={lang} />
        </div>
    );
}
