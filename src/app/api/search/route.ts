import { NextResponse } from "next/server";
import { searchAll } from "@/lib/search/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ results: [], query: "" });
  }

  try {
    const results = searchAll(q, 10);
    return NextResponse.json({ results, query: q });
  } catch (error) {
    console.error("[API /search]", error);
    return NextResponse.json(
      { error: "Search failed.", results: [], query: q },
      { status: 500 }
    );
  }
}
