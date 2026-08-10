import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/health`,
    ).then((res) => res.json());
    return NextResponse.json({ result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "failed to load data" }, { status: 500 });
  }
}
