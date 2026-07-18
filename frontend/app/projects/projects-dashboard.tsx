import dynamic from "next/dynamic"

const ProjectsDashboard = dynamic(() => import("./projects-dashboard.client"), {
  ssr: false,
})

export default ProjectsDashboard
