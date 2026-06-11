import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";

export function LoginCard() {
  return (
    <Card className="w-full max-w-md border-[#E5E7EB] bg-white shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-semibold tracking-tight text-[#111827]">
          Scaffold
        </CardTitle>
        <CardDescription className="text-[#6B7280]">
          Project intelligence for AI-assisted builds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <GitHubSignInButton />
      </CardContent>
    </Card>
  );
}
