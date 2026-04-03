// app/api/clusters/route.ts
import { NextResponse } from "next/server";
import { getClusters } from "@/lib/clusters";

export async function GET() {
  try {
    const clusters = getClusters();

    return NextResponse.json(
      {
        totalClusters: clusters.length,
        clusters,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}