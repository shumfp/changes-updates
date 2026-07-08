import { extractWithOpenAI, inferSourceChannel } from "@/lib/extract";

export async function POST(request: Request) {
  const { raw_input } = await request.json();

  if (!raw_input || typeof raw_input !== "string") {
    return Response.json({ error: "Paste the request text first." }, { status: 400 });
  }

  const extracted = await extractWithOpenAI(raw_input);
  return Response.json({
    ...extracted,
    source_channel: inferSourceChannel(raw_input),
  });
}
