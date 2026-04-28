export type Stroller = {
  id: string;
  name: string;
  brand: string;
  category: string;
  summary: string | null;
  imageUrl: string | null;
  linkCarrinho: string | null;
  linkTravel: string | null;
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
