export type SiteContentType = 'text' | 'textarea' | 'richtext' | 'json';

export interface SiteContentEntry {
  key: string;
  label: string;
  group: string;
  type: SiteContentType;
  value: string;
  isPublished: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface SiteContentUpdateInput {
  label?: string;
  group?: string;
  type?: SiteContentType;
  value: string;
  isPublished?: boolean;
  updatedBy?: string;
}
