import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function App() {
  return (
    <main className="min-h-svh grid place-items-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>
            <h1 className="text-3xl font-[var(--font-display)]">Hello, Daily Tour</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground text-center">São Miguel · Açores</p>
          <Button>Click me</Button>
        </CardContent>
      </Card>
    </main>
  );
}
