/** The signed-in landing page for each account type. */
export function portalPathForRole(role: string | null | undefined): string {
  switch (role) {
    case "STUDENT":
      return "/portal/student";
    case "PARTNER":
      return "/portal/dashboard";
    case "REPRESENTATIVE":
      return "/portal/representative";
    case "STAFF":
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/staff";
    default:
      return "/portal";
  }
}
