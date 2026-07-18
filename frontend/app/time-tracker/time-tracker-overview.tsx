import dynamic from "next/dynamic"

const TimeTrackerOverview = dynamic(() => import("./time-tracker-overview.client"), {
  ssr: false,
})

export default TimeTrackerOverview
