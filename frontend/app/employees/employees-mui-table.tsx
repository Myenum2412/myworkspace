import dynamic from "next/dynamic"

const EmployeesMuiTable = dynamic(() => import("./employees-mui-table.client"), {
  ssr: false,
})

export default EmployeesMuiTable
