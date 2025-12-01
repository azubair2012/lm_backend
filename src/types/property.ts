/**
 * Property Advertising Types
 * Based on Rentman Advertising API documentation
 */

export interface PropertyAdvertising {
  propref: string;
  displayaddress: string;
  displayprice: string;
  rentmonth: string;
  rentorbuy: string;
  number: string;
  street: string;
  address3: string;
  address4: string;
  postcode: string;
  area: string;
  TYPE: string;
  beds: string;
  singles: string;
  doubles: string;
  baths: string;
  receps: string;
  furnished: string;
  bullets: string;
  FLOOR: string;
  heating: string;
  available: string;
  STATUS: string;
  shortlet: string;
  rating: string;
  age: string;
  DESCRIPTION: string;
  comments: string;
  strapline: string;
  floorplan: string;
  url: string;
  photo1: string;
  geolocation?: string;
}

export interface PropertyMedia {
  propref: string;
  filename: string;
  caption: string;
  base64data: string;
  imgorder: string;
}

export interface PropertyAdvertisingParams {
  propref?: string;
  noimage?: number;
  rob?: 'rent' | 'sale';
  featured?: number;
  area?: number;
  limit?: number;
  page?: number;
}

export interface PropertyMediaParams {
  propref?: string;
  filename?: string;
  mediaId?: string;
}

export interface ApiResponse<T> {
  data: T;
  status?: number;
  statusText?: string;
  success: boolean;
  message?: string;
  timestamp?: string;
}
