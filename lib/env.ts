export function missingEnvResponse(names: string[]) {
  return Response.json(
    {
      error: `Missing environment variable${names.length === 1 ? "" : "s"}: ${names.join(", ")}`,
    },
    { status: 503 },
  );
}

export function requiredEnv(names: string[]) {
  return names.filter((name) => !process.env[name]);
}
