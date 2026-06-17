import { Document, Types } from "mongoose";
export interface ITeam extends Document {
    orgId: Types.ObjectId;
    name: string;
    description?: string;
    createdAt: Date;
}
export declare const Team: import("mongoose").Model<ITeam, {}, {}, {}, Document<unknown, {}, ITeam, {}, {}> & ITeam & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
