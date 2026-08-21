import "server-only";
import { mockProjects } from "../mock/data";
import type { PortalProject } from "../types";

export async function listProjects(): Promise<PortalProject[]> {
  return mockProjects;
}

export async function getProject(id: string): Promise<PortalProject | null> {
  return mockProjects.find((p) => p.id === id) ?? null;
}
