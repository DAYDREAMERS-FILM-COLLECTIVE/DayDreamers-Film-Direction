/**
 * src/home/types.ts
 * Type definitions for home page reel, gallery, and activities.
 */

export interface ReelItem {
  id: string;
  title: string;
  category: string;
  year: string;
  tag: string;
  image: string;
}

export interface ActivityItem {
  number: string;
  title: string;
  desc: string;
}
