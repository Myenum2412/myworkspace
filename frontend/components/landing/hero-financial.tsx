'use client'
import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { TimelineAnimation } from '@/components/ui/timeline-animation'
import { useMediaQuery } from '@/hooks/use-media-query'
import MotionDrawer from '@/components/ui/motion-drawer'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'

const menuItems = [
  { name: 'Features', href: '/features' },
  { name: 'Solution', href: '/solutions' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'About', href: '/about' },
]

export const HeroFinancial = () => {
  const timelineRef = React.useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <section
      ref={timelineRef}
      className="min-h-screen bg-[#f7f9fc] text-[#1e293b] relative overflow-hidden flex flex-col items-center w-full"
    >
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1597200381847-30ec200eeb9a?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] bg-cover bg-center opacity-5" />

      <svg
        width="358"
        height="483"
        viewBox="0 0 358 483"
        className="absolute top-0 z-[1] left-0 pointer-events-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#filter0_f_0_1)">
          <rect
            x="-86.9961"
            y="-33.114"
            width="72"
            height="541"
            rx="36"
            transform="rotate(-30.8182 -86.9961 -33.114)"
            fill="url(#paint0_linear_0_1)"
          />
        </g>
        <g filter="url(#filter1_f_0_1)">
          <rect
            x="-17"
            y="-135.113"
            width="50.0937"
            height="541"
            rx="25.0469"
            transform="rotate(-30.8182 -17 -135.113)"
            fill="url(#paint1_linear_0_1)"
          />
        </g>
        <defs>
          <filter
            id="filter0_f_0_1"
            x="-137.641"
            y="-120.646"
            width="440.285"
            height="602.787"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="32"
              result="effect1_foregroundBlur_0_1"
            />
          </filter>
          <filter
            id="filter1_f_0_1"
            x="-71.707"
            y="-215.486"
            width="429.598"
            height="599.69"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="32"
              result="effect1_foregroundBlur_0_1"
            />
          </filter>
          <linearGradient
            id="paint0_linear_0_1"
            x1="-50.9961"
            y1="-33.114"
            x2="-50.9961"
            y2="507.886"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#91bbfb" />
            <stop offset="1" stopColor="#E6F1FF" />
          </linearGradient>
          <linearGradient
            id="paint1_linear_0_1"
            x1="8.04686"
            y1="-135.113"
            x2="8.04686"
            y2="405.887"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#8dbafd" />
            <stop offset="1" stopColor="#c1d9f8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Soft Background Gradients */}
      <TimelineAnimation
        timelineRef={timelineRef}
        animationNum={5}
        className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-50/50 via-blue-100/20 to-transparent pointer-events-none"
      />
      {isMobile && (
        <div className="flex gap-4 justify-between items-center px-5 w-full pt-4 relative z-50">
          <MotionDrawer
            direction="left"
            width={300}
            backgroundColor={'#ffffff'}
            clsBtnClassName="bg-neutral-800 border-r border-neutral-900 text-white"
            contentClassName="bg-white border-r border-neutral-200 text-black"
            btnClassName="bg-white text-black relative w-fit p-2 left-0 top-0 rounded-full shadow-xs border border-neutral-200"
          >
            <nav className="space-y-4 pt-10">
              <div className="flex items-center gap-2 mb-6">
                <Link href="/" className="flex items-center space-x-2.5">
                  <Logo className="h-6 w-auto text-black" />
                  <span className="text-base font-bold tracking-tight text-neutral-900">MyWorkSpace</span>
                </Link>
              </div>
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="block p-2 hover:bg-neutral-100 hover:text-black rounded-sm font-semibold text-neutral-600"
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-6 flex flex-col gap-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="w-full bg-[#2596be] hover:bg-[#1e7ea3] text-white border-0">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            </nav>
          </MotionDrawer>
          <div className="flex items-center gap-2 relative z-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#2596be] hover:bg-[#1e7ea3] text-white border-0">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      )}
      {/* Header */}
      {!isMobile && (
        <header className="relative z-10 w-full max-w-7xl mx-auto p-2 mt-4">
          <TimelineAnimation
            animationNum={1}
            timelineRef={timelineRef}
            className="bg-white/80 backdrop-blur-xl p-2 rounded-xl border border-white shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center space-x-2.5">
                <Logo className="h-6 w-auto text-black" />
                <span className="text-base font-bold tracking-tight text-neutral-900">MyWorkSpace</span>
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-10 text-sm font-semibold text-neutral-500">
              {menuItems.map((item, index) => (
                <Link key={index} href={item.href} className="hover:text-[#3b82f6] transition">
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#2596be] hover:bg-[#1e7ea3] text-white border-0">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </TimelineAnimation>
        </header>
      )}

      {/* Hero Content */}
      <div className="relative z-10 text-center pt-24 pb-16 px-4 flex flex-col gap-6 items-center">
        <TimelineAnimation
          animationNum={1}
          timelineRef={timelineRef}
          className="bg-white w-fit mx-auto text-black px-3 py-1 rounded-full inline-flex items-center gap-2 shadow-lg shadow-blue-500/10 border border-neutral-100"
        >
          <span className="bg-gradient-to-br from-blue-500 to-blue-300 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
            New
          </span>
          <span className="text-xs font-semibold text-neutral-700">
            All-in-one workspace for modern teams
          </span>
        </TimelineAnimation>

        <TimelineAnimation
          as="h1"
          animationNum={2}
          timelineRef={timelineRef}
          className="sm:text-6xl text-4xl md:text-7xl font-bold tracking-tight text-neutral-900 max-w-5xl leading-[1.1]"
        >
          Manage your workspace, <br /> effortlessly.
        </TimelineAnimation>

        <TimelineAnimation
          as="p"
          animationNum={3}
          timelineRef={timelineRef}
          className="text-lg md:text-xl text-neutral-500 font-medium max-w-3xl mx-auto leading-relaxed px-4"
        >
          MyWorkspace brings together task management, team collaboration, file
          storage, client portal, and billing into one seamless platform built
          for growing businesses.
        </TimelineAnimation>

        <div className="flex gap-4 justify-center mt-4">
          <TimelineAnimation
            as="a"
            href="/dashboard"
            animationNum={4}
            timelineRef={timelineRef}
            className="px-6 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white text-base font-semibold rounded-lg shadow-md hover:opacity-95 transition py-3 border border-blue-400"
          >
            Get Started
          </TimelineAnimation>
          <TimelineAnimation
            as="a"
            href="#features"
            animationNum={5}
            timelineRef={timelineRef}
            className="px-6 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 text-black text-base font-semibold rounded-lg shadow-sm hover:bg-neutral-200 transition py-3 border border-neutral-300"
          >
            Learn more
          </TimelineAnimation>
        </div>
      </div>

      {/* Dashboard UI Frame */}
      <div className="w-full max-w-7xl mx-auto rounded-xl relative mt-4 px-4 pb-20">
        <TimelineAnimation
          animationNum={6}
          timelineRef={timelineRef}
          className="rounded-2xl bg-white/40 backdrop-blur-lg p-3 border border-white/60 shadow-2xl"
        >
          <TimelineAnimation
            animationNum={7}
            as="img"
            timelineRef={timelineRef}
            src="/dashboard.png"
            alt="Dashboard Preview"
            className="w-full relative z-4 rounded-xl border border-neutral-200/50 shadow-sm"
          />
        </TimelineAnimation>
      </div>
    </section>
  )
}
