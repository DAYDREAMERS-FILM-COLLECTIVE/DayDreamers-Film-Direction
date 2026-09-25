/**
 * src/admin/index.ts
 * Barrel export for the self-contained Admin CMS module.
 */

export * from './types';
export * from './store/useAdminStore';
export * from './services/adminApi';
export { AuthGate } from './components/AuthGate';
export { AdminSidebar } from './components/AdminSidebar';
export { FilmCatalogue } from './components/FilmCatalogue';
export { SeatLocker } from './components/SeatLocker';
export { BookingsRoster } from './components/BookingsRoster';
export { DoorQrScanner } from './components/DoorQrScanner';
export { AdminScreen } from './AdminScreen';
