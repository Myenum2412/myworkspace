import { Document, Types } from "mongoose";
export interface ITeamMember extends Document {
    teamId: Types.ObjectId;
    userId: Types.ObjectId;
    role: "lead" | "member";
}
export declare const TeamMember: import("mongoose").Model<ITeamMember, {}, {}, {}, Document<unknown, {}, ITeamMember, {}, {}> & ITeamMember & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
