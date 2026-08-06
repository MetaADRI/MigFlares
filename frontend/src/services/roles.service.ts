import type { PermissionDef, Role, RoleName, SystemUser } from "@/types";
import { api } from "@/services/api";

export interface RoleInput {
  name: RoleName;
  description?: string | null;
  isActive?: boolean;
  permissionKeys: string[];
}

export const rolesService = {
  async listRoles(): Promise<Role[]> {
    const { data } = await api.get<Role[]>("/roles");
    return data;
  },

  async listPermissions(): Promise<PermissionDef[]> {
    const { data } = await api.get<PermissionDef[]>("/roles/permissions");
    return data;
  },

  async create(input: RoleInput): Promise<Role> {
    const { data } = await api.post<Role>("/roles", input);
    return data;
  },

  async update(id: string, input: Partial<RoleInput>): Promise<Role> {
    const { data } = await api.patch<Role>(`/roles/${id}`, input);
    return data;
  },

  async toggle(id: string, isActive: boolean): Promise<Role> {
    const { data } = await api.patch<Role>(`/roles/${id}/status`, { isActive });
    return data;
  },

  async listUsers(): Promise<SystemUser[]> {
    const { data } = await api.get<SystemUser[]>("/roles/users");
    return data;
  },

  async setUserRole(userId: string, roleId: string): Promise<SystemUser> {
    const { data } = await api.patch<SystemUser>(`/roles/users/${userId}/role`, { roleId });
    return data;
  },

  async createUser(input: UserInput): Promise<SystemUser> {
    const { data } = await api.post<SystemUser>("/roles/users", input);
    return data;
  },

  async updateUser(userId: string, input: Partial<UserInput>): Promise<SystemUser> {
    const { data } = await api.patch<SystemUser>(`/roles/users/${userId}`, input);
    return data;
  },

  async setUserStatus(userId: string, isActive: boolean): Promise<SystemUser> {
    const { data } = await api.patch<SystemUser>(`/roles/users/${userId}/status`, { isActive });
    return data;
  },
};

export interface UserInput {
  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  roleId: string;
  isActive?: boolean;
}
