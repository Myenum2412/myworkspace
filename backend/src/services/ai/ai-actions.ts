import { IAIAction } from "./types.js";

export const AI_ACTIONS: IAIAction[] = [
  { id: "rebar_detailing", label: "Rebar Detailing", icon: "FileText", prompt: "Provide rebar detailing guidance for", context: ["workspace"] },
  { id: "structural_steel", label: "Steel Detailing", icon: "PenTool", prompt: "Provide structural steel detailing guidance for", context: ["workspace"] },
  { id: "concrete_detailing", label: "Concrete Detailing", icon: "FileCheck", prompt: "Provide concrete detailing and formwork guidance for", context: ["workspace"] },
  { id: "boq_estimation", label: "BOQ Estimation", icon: "Clipboard", prompt: "Prepare a bill of quantities estimation for", context: ["workspace"] },
  { id: "connection_detail", label: "Connection Detail", icon: "WorkflowIcon", prompt: "Design a structural connection detail for", context: ["workspace"] },
  { id: "fabrication_drawing", label: "Fabrication Drawing", icon: "Maximize", prompt: "Generate a fabrication drawing specification for", context: ["workspace"] },
  { id: "erection_plan", label: "Erection Plan", icon: "ListTodo", prompt: "Create an erection sequence plan for", context: ["workspace"] },
  { id: "reinforcement_schedule", label: "Reinforcement Schedule", icon: "Table", prompt: "Generate a reinforcement schedule for", context: ["workspace"] },
  { id: "detailing_spec", label: "Detailing Specs", icon: "BookOpen", prompt: "Provide detailing specifications and standards for", context: ["workspace"] },
  { id: "foundation_detail", label: "Foundation Detail", icon: "Minimize", prompt: "Provide foundation detailing guidance for", context: ["workspace"] },
  { id: "precast_detail", label: "Precast Detailing", icon: "CheckSquare", prompt: "Provide precast concrete detailing guidance for", context: ["workspace"] },
  { id: "stair_detail", label: "Stair Detailing", icon: "HelpCircle", prompt: "Provide stair reinforcement and detailing for", context: ["workspace"] },
  { id: "beam_column_joint", label: "Beam-Column Joint", icon: "RefreshCw", prompt: "Detail beam-column joint reinforcement for", context: ["workspace"] },
  { id: "weld_spec", label: "Weld Specification", icon: "PenTool", prompt: "Provide welding specifications and details for", context: ["workspace"] },
  { id: "bolt_connection", label: "Bolt Connection", icon: "ListTodo", prompt: "Design bolted connection details for", context: ["workspace"] },
];
