import { Document } from "mongoose";
export interface IUser extends Document {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string;
    password?: string;
    status: "online" | "offline" | "break";
    role: "admin" | "manager" | "member" | "ORG_MENU_ADMIN";
    permissions: string[];
    isActive: boolean;
    lastLogin?: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
