import { z } from "zod";
import {
  getSheetsClient,
  getSpreadsheetId,
  getTabNameStrollers
} from "@/lib/sheets";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Review, Stroller } from "@/lib/types";

const strollerRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  imageUrl: z.string().url().nullable().default(null),
  buyUrl: z.string().url().nullable().default(null)
});

function normalizeCell(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function parseHeaderRow(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((h, idx) => {
    const key = normalizeCell(h);
    if (key) map[key] = idx;
  });
  return map;
}

function rowToObject(row: unknown[], headerMap: Record<string, number>): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, idx] of Object.entries(headerMap)) {
    obj[key] = normalizeCell(row[idx]);
  }
  return obj;
}

function getFirstValue(obj: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === ',') {
      out.push(cur);
      cur = "";
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function parseCsv(text: string): string[][] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  return lines.map(parseCsvLine);
}

async function listStrollersFromCsv(csvUrl: string): Promise<Stroller[]> {
  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch strollers CSV (${res.status})`);
  const csvText = await res.text();
  const values = parseCsv(csvText);
  if (values.length < 2) return [];

  const header = values[0];
  const headerMap = parseHeaderRow(header);

  const items: Stroller[] = [];
  for (const row of values.slice(1)) {
    const obj = rowToObject(row, headerMap);
    const parsed = strollerRowSchema.safeParse({
      id: getFirstValue(obj, ["id", "ID"]),
      name: getFirstValue(obj, ["name", "nome", "Nome"]),
      brand: getFirstValue(obj, ["brand", "marca", "Marca"]),
      category: getFirstValue(obj, ["category", "categoria", "Categoria"]),
      subcategory:
        getFirstValue(obj, [
          "subcategory",
          "subCategory",
          "subcategoria",
          "Subcategoria",
          "Subcategoria",
          "sub_categoria",
          "sub categoria",
          "Sub categoria"
        ]) || undefined,
      summary: getFirstValue(obj, ["summary", "resumo", "Resumo"]) || undefined,
      imageUrl: getFirstValue(obj, ["imageUrl", "image", "imagem", "Imagem"]) || undefined,
      buyUrl:
        getFirstValue(obj, [
          "buyUrl",
          "buy",
          "compra",
          "comprar",
          "link",
          "link_compra",
          "link compra",
          "url",
          "URL"
        ]) || undefined
    });
    if (parsed.success) items.push(parsed.data);
  }

  return items;
}

export async function listStrollers(): Promise<Stroller[]> {
  const csvUrl = process.env.STROLLERS_CSV_URL;
  if (csvUrl) return listStrollersFromCsv(csvUrl);

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const tab = getTabNameStrollers();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:Z`
  });

  const values = res.data.values || [];
  if (values.length < 2) return [];

  const header = values[0];
  const headerMap = parseHeaderRow(header);

  const items: Stroller[] = [];
  for (const row of values.slice(1)) {
    const obj = rowToObject(row, headerMap);
    const parsed = strollerRowSchema.safeParse({
      id: getFirstValue(obj, ["id", "ID"]),
      name: getFirstValue(obj, ["name", "nome", "Nome"]),
      brand: getFirstValue(obj, ["brand", "marca", "Marca"]),
      category: getFirstValue(obj, ["category", "categoria", "Categoria"]),
      subcategory:
        getFirstValue(obj, [
          "subcategory",
          "subCategory",
          "subcategoria",
          "Subcategoria",
          "sub_categoria",
          "sub categoria",
          "Sub categoria"
        ]) || undefined,
      summary: getFirstValue(obj, ["summary", "resumo", "Resumo"]) || undefined,
      imageUrl: getFirstValue(obj, ["imageUrl", "image", "imagem", "Imagem"]) || undefined,
      buyUrl:
        getFirstValue(obj, [
          "buyUrl",
          "buy",
          "compra",
          "comprar",
          "link",
          "link_compra",
          "link compra",
          "url",
          "URL"
        ]) || undefined
    });
    if (parsed.success) items.push(parsed.data);
  }

  return items;
}

export async function getStrollerById(id: string): Promise<Stroller | null> {
  const strollers = await listStrollers();
  const decoded = decodeURIComponent(id);
  return strollers.find((s) => s.id === decoded) || null;
}

export async function listReviewsByStrollerId(strollerId: string): Promise<Review[]> {
  const supabase = getSupabaseAdminClient();
  const decoded = decodeURIComponent(strollerId);

  const { data, error } = await supabase
    .from("reviews")
    .select("id, stroller_id, author_name, author_email, rating, text, created_at, votes_count, helpful_count, features")
    .eq("stroller_id", decoded)
    .order("votes_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((r: any) => ({
    id: String(r.id),
    strollerId: String(r.stroller_id),
    authorName: String(r.author_name),
    authorEmail: r.author_email ? String(r.author_email) : null,
    rating: Number(r.rating),
    text: String(r.text),
    createdAt: String(r.created_at),
    votesCount: Number(r.votes_count || 0),
    helpfulCount: Number(r.helpful_count || 0),
    features: Array.isArray(r.features) ? r.features.map((x: any) => String(x)) : []
  }));
}

export async function createReview(input: {
  strollerId: string;
  authorName?: string;
  authorEmail?: string;
  rating: number;
  text: string;
  features?: string[];
}): Promise<Review> {
  const authorName = (input.authorName || "").trim() || "Usuária";
  const authorEmail = (input.authorEmail || "").trim() || null;
  const features = Array.isArray(input.features)
    ? input.features.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const payload = {
    stroller_id: decodeURIComponent(input.strollerId),
    author_name: authorName,
    author_email: authorEmail,
    rating: input.rating,
    text: input.text.trim(),
    features
  };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reviews")
    .insert(payload)
    .select("id, stroller_id, author_name, author_email, rating, text, created_at, votes_count, helpful_count, features")
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create review");

  return {
    id: String(data.id),
    strollerId: String(data.stroller_id),
    authorName: String(data.author_name),
    authorEmail: (data as any).author_email ? String((data as any).author_email) : null,
    rating: Number(data.rating),
    text: String(data.text),
    createdAt: String(data.created_at),
    votesCount: Number(data.votes_count || 0),
    helpfulCount: Number(data.helpful_count || 0),
    features: Array.isArray((data as any).features) ? (data as any).features.map((x: any) => String(x)) : []
  };
}

export async function getReviewById(id: string): Promise<Review | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, stroller_id, author_name, author_email, rating, text, created_at, votes_count, helpful_count, features")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: String(data.id),
    strollerId: String(data.stroller_id),
    authorName: String(data.author_name),
    authorEmail: (data as any).author_email ? String((data as any).author_email) : null,
    rating: Number(data.rating),
    text: String(data.text),
    createdAt: String(data.created_at),
    votesCount: Number(data.votes_count || 0),
    helpfulCount: Number(data.helpful_count || 0),
    features: Array.isArray((data as any).features) ? (data as any).features.map((x: any) => String(x)) : []
  };
}

export async function deleteReview(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
