import { Document } from "mongoose";
export interface ITeamMember extends Document {
    orgId: string;
    teamId: string;
    userId: string;
    createdBy: string;
    role: "lead" | "member";
}
export declare const TeamMember: import("mongoose").Model<ITeamMember, {}, {}, {}, Document<unknown, {}, ITeamMember, {}, {}> & ITeamMember & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
