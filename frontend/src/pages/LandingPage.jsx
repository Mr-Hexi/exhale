import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/shared/Logo';
import Footer from '../components/shared/Footer';

export default function LandingPage() {
  return (
    <div className="ui-shell min-h-screen overflow-x-hidden p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 lg:gap-8">
      {/* Main Page Area */}
      <div className="w-full flex-grow mx-auto px-4 sm:px-8 lg:px-14 border border-[rgba(23,33,43,0.08)] rounded-[1.5rem] sm:rounded-[2.5rem] bg-[var(--bg-surface)]/20 backdrop-blur-xl shadow-panel">
        <nav className="flex justify-between items-center py-5 border-b border-[var(--border-subtle)]">
          <Logo />
          <div className="flex gap-2.5 items-center">
            <Link to="/login" className="text-[13px] font-medium px-4 py-2 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors border border-transparent">
              Sign in
            </Link>
            <Link to="/register" className="ui-btn ui-btn-primary !text-[13px] !px-5 !py-2 !rounded-xl">
              Get started
            </Link>
          </div>
        </nav>

        <section className="text-center pt-16 pb-12">
          <div className="inline-block text-[12px] font-bold tracking-wide text-[var(--brand-600)] bg-[var(--brand-100)] rounded-full px-4 py-1.5 mb-6 border border-[rgba(31,122,106,0.15)] shadow-sm">
            Safe · Private · Empathetic
          </div>
          <h1 className="text-[38px] sm:text-[50px] md:text-[60px] font-extrabold leading-[1.1] text-[var(--text-primary)] tracking-tight mb-6 drop-shadow-sm">
            Say what you feel.<br className="md:hidden" /> We'll <em className="not-italic text-[var(--brand-500)] relative inline-block">
              listen.
              <span className="absolute bottom-1 left-0 w-full h-[6px] sm:h-[8px] bg-[var(--brand-100)] -z-10 rounded-sm opacity-80 mix-blend-multiply"></span>
            </em>
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[var(--text-muted)] leading-[1.65] max-w-[420px] sm:max-w-[560px] mx-auto mb-10 font-medium">
            Exhale listens, understands your emotions, and gently helps you process what you're going through — at any hour, without judgment.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/register" className="ui-btn ui-btn-primary !px-8 !py-2.5 !text-[14px]">
              Start for free
            </Link>
          </div>
        </section>

        <div className="max-w-4xl mx-auto bg-[var(--bg-surface)] rounded-[var(--radius-lg)] p-5 sm:p-6 md:p-8 border border-[var(--border-subtle)] mt-6 mb-16 shadow-panel relative overflow-hidden backdrop-blur-md">
          <div className="flex flex-col mb-5">
            <div className="self-end max-w-[80%] px-4 py-3 rounded-2xl text-[13.5px] leading-[1.55] bg-[var(--brand-500)] text-white rounded-br-sm shadow-md relative z-10 font-medium">
              I've been overthinking everything at work and I can't seem to stop.
            </div>
            <div className="self-end text-[11px] mt-2 px-3.5 py-1 rounded-full bg-[var(--accent-100)] text-[#854F0B] border border-[#f3d2be] shadow-sm font-bold z-10 tracking-wide uppercase">
              😰 Anxious · 91%
            </div>
          </div>
          <div className="flex flex-col">
            <div className="self-start max-w-[90%] px-4 py-3 rounded-2xl text-[13.5px] leading-[1.6] bg-[var(--bg-surface-strong)] text-[var(--text-primary)] border border-[rgba(23,33,43,0.08)] rounded-bl-sm shadow-md z-10 font-medium">
              That sounds really exhausting — when the mind won't slow down, it can feel like you're fighting yourself. You're not alone in this. Can you tell me what's been weighing on you most?
            </div>
            <div className="self-start text-[12px] mt-3 px-4 py-1.5 rounded-full border border-[var(--brand-100)] text-[var(--brand-600)] bg-white shadow-sm cursor-pointer hover:bg-[var(--brand-100)] transition-colors z-10 font-bold">
              &rarr; Try a breathing exercise
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-[var(--brand-100)] rounded-full mix-blend-multiply filter blur-3xl opacity-60 z-0"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[var(--accent-100)] rounded-full mix-blend-multiply filter blur-3xl opacity-40 z-0"></div>
        </div>

        <section className="py-12 border-t border-[var(--border-subtle)]">
          <div className="ui-kicker mb-3">
            What are you feeling?
          </div>
          <h2 className="ui-title !text-[24px] mb-3">
            Exhale meets you where you are
          </h2>
          <p className="ui-subtitle mb-8 max-w-[500px]">
            No matter how you arrive, Exhale adapts to your emotional state and responds in a way that fits the moment.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mt-8">
            <div className="ui-card-soft !bg-[#EAF3DE] !border-[#d2e0bd] p-4 text-center transition-transform hover:-translate-y-1 shadow-sm">
              <span className="text-[24px] block mb-2">😊</span>
              <span className="text-[14px] font-bold block mb-1 text-[#3B6D11]">Happy</span>
              <span className="text-[12px] leading-relaxed text-[#639922] font-medium">Celebrate and capture the moment</span>
            </div>
            <div className="ui-card-soft !bg-[#E6F1FB] !border-[#c6dcf1] p-4 text-center transition-transform hover:-translate-y-1 shadow-sm">
              <span className="text-[24px] block mb-2">😟</span>
              <span className="text-[14px] font-bold block mb-1 text-[#0C447C]">Sad</span>
              <span className="text-[12px] leading-relaxed text-[#185FA5] font-medium">Gentle presence without minimising</span>
            </div>
            <div className="ui-card-soft !bg-[#FAEEDA] !border-[#e8d6b8] p-4 text-center transition-transform hover:-translate-y-1 shadow-sm">
              <span className="text-[24px] block mb-2">😰</span>
              <span className="text-[14px] font-bold block mb-1 text-[#633806]">Anxious</span>
              <span className="text-[12px] leading-relaxed text-[#854F0B] font-medium">Grounding, calm, steady support</span>
            </div>
            <div className="ui-card-soft !bg-[#FCEBEB] !border-[#f0cccc] p-4 text-center transition-transform hover:-translate-y-1 shadow-sm">
              <span className="text-[24px] block mb-2">😤</span>
              <span className="text-[14px] font-bold block mb-1 text-[#791F1F]">Angry</span>
              <span className="text-[12px] leading-relaxed text-[#A32D2D] font-medium">Heard, not judged or dismissed</span>
            </div>
          </div>
        </section>

        <section className="py-12 border-t border-[var(--border-subtle)]">
          <div className="ui-kicker mb-3">
            How it works
          </div>
          <h2 className="ui-title !text-[24px] mb-8">
            Three steps to feeling heard
          </h2>
          <div className="flex flex-col relative gap-4 max-w-4xl">
            <div className="absolute left-[15px] top-6 bottom-6 w-px bg-gradient-to-b from-[var(--brand-100)] via-[var(--brand-500)] to-transparent -z-10 opacity-30"></div>
            
            <div className="flex gap-4 items-start py-3">
              <div className="w-[32px] h-[32px] rounded-full bg-[var(--brand-100)] text-[var(--brand-600)] shadow-sm border border-[rgba(31,122,106,0.15)] text-[14px] font-extrabold flex items-center justify-center shrink-0">
                1
              </div>
              <div className="pt-1">
                <div className="text-[16px] font-bold text-[var(--text-primary)] mb-1.5">Talk about what's on your mind</div>
                <div className="text-[14px] text-[var(--text-muted)] leading-[1.6] font-medium">Type freely. Exhale reads the emotion behind your words — not just the words themselves.</div>
              </div>
            </div>
            
            <div className="flex gap-4 items-start py-3">
              <div className="w-[32px] h-[32px] rounded-full bg-[var(--brand-100)] text-[var(--brand-600)] shadow-sm border border-[rgba(31,122,106,0.15)] text-[14px] font-extrabold flex items-center justify-center shrink-0">
                2
              </div>
              <div className="pt-1">
                <div className="text-[16px] font-bold text-[var(--text-primary)] mb-1.5">Receive a response that actually fits</div>
                <div className="text-[14px] text-[var(--text-muted)] leading-[1.6] font-medium">An empathetic reply tailored to your emotion, age, and the topics you're working through.</div>
              </div>
            </div>
            
            <div className="flex gap-4 items-start py-3">
              <div className="w-[32px] h-[32px] rounded-full bg-[var(--brand-100)] text-[var(--brand-600)] shadow-sm border border-[rgba(31,122,106,0.15)] text-[14px] font-extrabold flex items-center justify-center shrink-0">
                3
              </div>
              <div className="pt-1">
                <div className="text-[16px] font-bold text-[var(--text-primary)] mb-1.5">Watch your patterns over time</div>
                <div className="text-[14px] text-[var(--text-muted)] leading-[1.6] font-medium">Your mood is logged automatically. A weekly insight shows you what's shifted and what hasn't.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 border-t border-[var(--border-subtle)]">
          <div className="ui-kicker mb-3">
            Features
          </div>
          <h2 className="ui-title !text-[24px] mb-8">
            Everything in one quiet space
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="ui-card hover:border-[var(--brand-500)] transition-colors cursor-default">
              <span className="text-[22px] mb-3 block">💬</span>
              <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1.5">Empathetic chat</div>
              <div className="text-[13px] text-[var(--text-muted)] leading-[1.6] font-medium">Emotion-aware responses that adapt to how you're feeling right now.</div>
            </div>
            <div className="ui-card hover:border-[var(--brand-500)] transition-colors cursor-default">
              <span className="text-[22px] mb-3 block">📈</span>
              <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1.5">Mood tracking</div>
              <div className="text-[13px] text-[var(--text-muted)] leading-[1.6] font-medium">Visual history of your emotional patterns across days and weeks.</div>
            </div>
            <div className="ui-card hover:border-[var(--brand-500)] transition-colors cursor-default">
              <span className="text-[22px] mb-3 block">📓</span>
              <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1.5">Private journal</div>
              <div className="text-[13px] text-[var(--text-muted)] leading-[1.6] font-medium">Write freely. Get a gentle AI insight on what you shared.</div>
            </div>
            <div className="ui-card hover:border-[var(--brand-500)] transition-colors cursor-default">
              <span className="text-[22px] mb-3 block">✨</span>
              <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1.5">Weekly insight</div>
              <div className="text-[13px] text-[var(--text-muted)] leading-[1.6] font-medium">A warm, honest summary of the week — your patterns, not prescriptions.</div>
            </div>
          </div>
        </section>

        <section className="py-12 border-t border-[var(--border-subtle)]">
          <div className="ui-kicker mb-3">
            People say
          </div>
          <h2 className="ui-title !text-[24px] mb-8">
            Quietly making a difference
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="ui-card-soft p-6 border-[rgba(23,33,43,0.08)] bg-[var(--bg-surface)] backdrop-blur-sm shadow-sm relative">
              <div className="text-[32px] text-[var(--brand-100)] absolute top-3 left-4 leading-none font-serif select-none z-0">"</div>
              <div className="text-[15px] text-[var(--text-primary)] leading-[1.7] mb-4 italic font-medium relative z-10 ml-4">
                I didn't expect an AI to actually make me feel less alone at 2am. It didn't judge me or give me a list of tips. It just... listened.
              </div>
              <div className="text-[12px] text-[var(--text-soft)] font-bold tracking-wide uppercase ml-4">
                Anonymous · 24–34 · Working through anxiety
              </div>
            </div>
            <div className="ui-card-soft p-6 border-[rgba(23,33,43,0.08)] bg-[var(--bg-surface)] backdrop-blur-sm shadow-sm relative">
              <div className="text-[32px] text-[var(--brand-100)] absolute top-3 left-4 leading-none font-serif select-none z-0">"</div>
              <div className="text-[15px] text-[var(--text-primary)] leading-[1.7] mb-4 italic font-medium relative z-10 ml-4">
                The weekly insight hit surprisingly close to home. I didn't realise how many anxious days I'd been having until I saw the pattern.
              </div>
              <div className="text-[12px] text-[var(--text-soft)] font-bold tracking-wide uppercase ml-4">
                Anonymous · 18–24 · Dealing with burnout
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 border-t border-[var(--border-subtle)]">
          <div className="ui-kicker mb-3">
            Safety
          </div>
          <div className="max-w-4xl bg-gradient-to-r from-[var(--brand-100)] to-[rgba(223,241,235,0.4)] rounded-[var(--radius-lg)] p-5 sm:p-6 md:p-8 flex gap-4 items-start border border-[rgba(31,122,106,0.15)] shadow-sm">
            <div className="w-3 h-3 rounded-full bg-[var(--brand-500)] mt-1 shrink-0 shadow-[0_0_12px_rgba(31,122,106,0.8)] relative">
              <div className="absolute inset-0 rounded-full bg-[var(--brand-500)] animate-ping opacity-40"></div>
            </div>
            <div className="text-[14px] text-[var(--brand-600)] leading-[1.65] font-medium">
              <strong className="font-extrabold block mb-1 text-[var(--text-primary)] text-[15px]">Your safety always comes first.</strong>
              If Exhale detects signs of a crisis, it responds with care and connects you to real support — iCall, Vandrevala Foundation, and international helplines. Exhale is a companion, not a replacement for professional help.
            </div>
          </div>
        </section>

        <section className="text-center py-16 border-t border-[var(--border-subtle)]">
          <h2 className="text-[28px] sm:text-[32px] font-extrabold text-[var(--text-primary)] mb-4 leading-tight tracking-tight">
            Your feelings deserve<br />a place to breathe.
          </h2>
          <p className="text-[16px] text-[var(--text-muted)] mb-8 font-medium">
            Free to start. No pressure. Just a space that listens.
          </p>
          <Link to="/register" className="ui-btn ui-btn-primary !text-[15px] !px-8 !py-3.5 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all !rounded-[1.25rem]">
            Start your first conversation
          </Link>
          <div className="text-[12px] text-[var(--text-soft)] mt-6 font-medium tracking-wide">
            No ads. No data sold. Your conversations stay yours.
          </div>
        </section>
      </div>

      {/* Footer Area */}
      <Footer />
    </div>
  );
}
