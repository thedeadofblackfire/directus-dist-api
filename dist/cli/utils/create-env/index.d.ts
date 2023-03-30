import type { Credentials } from '../create-db-connection';
import type { drivers } from '../drivers';
export default function createEnv(client: keyof typeof drivers, credentials: Credentials, directory: string): Promise<void>;
