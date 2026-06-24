import { Document } from "mongoose";
export interface ITeam extends Document {
    orgId: string;
    name: string;
    description?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Team: import("mongoose").Model<ITeam, {}, {}, {}, Document<unknown, {}, ITeam, {}, {}> & ITeam & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
