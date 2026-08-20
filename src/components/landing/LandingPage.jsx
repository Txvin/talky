import { useState } from 'react'
import Navbar from './Navbar'
import Hero from './Hero'
import Features from './Features'
import DemoSection from './DemoSection'
import Footer from './Footer'

export default function LandingPage({ onRequestAuth }) {
  return (
    <div id="landing-view">
      <Navbar onOpenAuth={onRequestAuth} />
      <Hero onEnterApp={onRequestAuth} />
      <Features />
      <DemoSection />
      <Footer />
    </div>
  )
}