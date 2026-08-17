import * as z from "zod";

export const createMemberSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.email({ message: "Valid email address is required" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
  role: z.enum(["ASSOCIATE", "ADMIN"], {
    error: () => ({ message: "Role must be ASSOCIATE or ADMIN" }),
  }),
});

export type CreateMemberValues = z.infer<typeof createMemberSchema>;

export interface FirmMember {
  id: string;
  email: string;
  name?: string | null;
  mustChangePassword?: boolean;
  role: "OWNER" | "ADMIN" | "ASSOCIATE" | "SUPER_ADMIN";
  firmId: string | null;
  isActive: boolean;
  createdAt: string;
  firm?: {
    id: string;
    name: string;
  } | null;
}
