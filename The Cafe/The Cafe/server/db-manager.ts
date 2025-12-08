// PostgreSQL (Neon) management functions - stubs for development mode compatibility

export async function promptDatabaseChoice(): Promise<'fresh' | 'continue' | 'sample'> {
  // In PostgreSQL mode, always continue with existing database
  console.log('ℹ️  Using PostgreSQL (Neon) database');
  return 'continue';
}

export function deleteDatabaseFile(): void {
  console.log('ℹ️  PostgreSQL mode - no local database file to delete');
}

export function displayDatabaseStats(): void {
  console.log('ℹ️  Using PostgreSQL database via Neon');
}

export async function loadSampleData(): Promise<void> {
  console.log('ℹ️  Sample data loading not implemented for PostgreSQL');
}

export function getDatabaseStats(): any {
  return {
    exists: true,
    type: 'postgresql',
    provider: 'neon'
  };
}
