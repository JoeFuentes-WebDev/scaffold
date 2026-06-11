"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GitHubSignInButton() {
  async function handleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
  }

  return (
    <Button className="w-full" onClick={handleSignIn} type="button">
      Continue with GitHub
    </Button>
  );
}
