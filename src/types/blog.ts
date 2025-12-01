/**
 * Blog Types
 * Type definitions for blog posts
 */

export interface BlogLink {
  label: string;
  href: string;
}

export interface BlogPost {
  id: number;
  category: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string[];
  links: BlogLink[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogPostInput {
  category: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string[];
  links: BlogLink[];
}

