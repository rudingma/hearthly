export interface JwtPayload {
  /** Keycloak user ID (sub claim) */
  sub: string;
  /** User email */
  email: string;
  /** User display name */
  name: string;
  /** Keycloak realm roles (e.g. ['user', 'admin']) */
  roles: string[];
}
