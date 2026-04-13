import { AssistantClient } from "@/components/assistant/assistant-client";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-6 md:px-6">
      <AssistantClient />
    </main>
  );
}
