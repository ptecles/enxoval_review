export type Stroller = {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string | null;
  summary: string | null;
  imageUrl: string | null;
  buyUrl: string | null;
};

export type Review = {
  id: string;
  strollerId: string;
  authorName: string;
  authorEmail: string | null;
  rating: number;
  text: string;
  createdAt: string;
  votesCount: number;
  helpfulCount: number;
  features: string[];
};
