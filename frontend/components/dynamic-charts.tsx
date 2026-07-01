"use client"

import dynamic from "next/dynamic"

const MonthlyRevenueChart = dynamic(() => import("@/components/MonthlyRevenueChart").then((m) => ({ default: m.MonthlyRevenueChart })), { ssr: false })
const NewUsersChart = dynamic(() => import("@/components/NewUsersChart").then((m) => ({ default: m.NewUsersChart })), { ssr: false })

export { MonthlyRevenueChart, NewUsersChart }
