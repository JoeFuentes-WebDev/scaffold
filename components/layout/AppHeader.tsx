import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppHeaderProps {
  projectName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

function getInitials(email: string | undefined): string {
  if (!email) {
    return "U";
  }

  return email.charAt(0).toUpperCase();
}

export function AppHeader({
  projectName,
  userEmail,
  userAvatarUrl,
}: AppHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-6">
      <div className="flex items-center gap-2 text-sm text-[#6B7280]">
        <span className="font-semibold text-[#111827]">Scaffold</span>
        {projectName ? (
          <>
            <span>•</span>
            <span className="text-[#111827]">{projectName}</span>
          </>
        ) : null}
      </div>
      <Avatar className="size-8">
        {userAvatarUrl ? <AvatarImage alt="User avatar" src={userAvatarUrl} /> : null}
        <AvatarFallback>{getInitials(userEmail)}</AvatarFallback>
      </Avatar>
    </header>
  );
}
