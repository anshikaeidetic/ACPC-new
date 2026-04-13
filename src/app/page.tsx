import { AssistantClient } from "@/components/assistant/assistant-client";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 md:px-6 md:py-10">
      <AssistantClient />
    </main>
  );
}
